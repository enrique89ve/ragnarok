
import React, { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ArmySelection as ArmySelectionType } from '../types/ChessTypes';
import { useChessCombatAdapter } from '../hooks/useChessCombatAdapter';
import { getDefaultArmySelection } from '../data/ChessPieceConfig';
import { useCampaignStore } from '../campaign';
import { deriveIntro, deriveIWonForPhase, deriveMatchFlowPolicy, deriveOpponentArmyForMode, derivePlayableMatchMode, markDailyQuestClaimsPendingAfterMatch, selectOnWinHandler, useMatchStore } from '../match';
import { recordLocalBattleEnd } from '../data/singleRecord';
import { Navigate, useNavigate } from 'react-router-dom';
import { routes } from '../../lib/routes';
import { getWarbandEntryRoute } from '../../lib/warbandRoutes';
import { usePokerCombatAdapter } from '../hooks/usePokerCombatAdapter';
import { useAudio } from '../../lib/stores/useAudio';
import { useKingChessAbility } from '../hooks/useKingChessAbility';
import { useChessAITurn } from './hooks/useChessAITurn';
import { useUnifiedCombatStore } from '../stores/unifiedCombatStore';
import { useGameFlowStore } from '../stores/gameFlowStore';
import { usePeerStore } from '../stores/peerStore';
import { debug } from '../config/debugConfig';
import {
  selectArmy,
  selectDeckCardIds,
  selectDeckCardIdsByPiece,
  useWarbandStore,
} from '../../lib/stores/useWarbandStore';
import { useGameStore } from '../stores/gameStore';
import { useSettingsStore } from '../stores/settingsStore';
import {
  createP2PViewerPerspective,
  mapViewerValuesToCanonical,
} from '../p2p/p2pPerspective';
import { clearP2PMatchResume } from '../p2p/p2pMatchResume';
import { createSeededIdGen, cryptoIdGen, cryptoRng } from '../utils/seededRng';
import { getNoLegalMovesStatus } from '@shared/protocol-core/chess';
import type { PhaseCheckpointPhase } from '@shared/p2p-wire/phaseCheckpoint';
import { resolveHeroPortrait } from '../utils/art/artMapping';
import { useP2PActions } from '../context/useP2PActions';
import { capturePhaseBoundaryStateRoot } from '../p2p/phaseBoundaryRoot';
import { GameEventBus } from '../../core/events/GameEventBus';
import { useCampaignGameBootstrap } from './hooks/useCampaignGameBootstrap';
import { useBossRuleEffects } from './hooks/useBossRuleEffects';
import { useMatchReloadGuard } from './hooks/useMatchReloadGuard';
import { shouldWarnOnMatchReload } from './matchReloadGuard';
import { shouldEnableRagnarokSceneFx } from '../components/chess/chessSceneFxModel';
import './matchExitControls.css';
import {
  getChessRealmClass,
  getFinaleClass,
  getRealmDisplayName,
  getViewerChessResult,
  getWinnerFromGameStatus,
  resolveVisualRealm,
  shouldTriggerChessCombatFlow,
} from './gameCoordinatorRules';
import {
  bindResumePokerHandoff,
  isResumeHandoffCurrent,
} from '../p2p/p2pResumePokerHandoff';
import {
  GAME_END_DELAY_MS,
  createMatchEndController,
  matchEndCommitPlan,
  type MatchEndCommit,
  type MatchEndController,
  type MatchEndRequest,
} from './matchEndController';

/*
  Phase components are lazy-loaded so casual / multiplayer routes —
  which never enter cinematic / mission_intro / game_over — do not
  pull the briefing UI, framer-motion choreography, or campaign-only
  crawl player into their initial chunk.
*/
const CinematicPhase = lazy(() => import('../components/chess/phases/CinematicPhase'));
const MissionIntroPhase = lazy(() => import('../components/chess/phases/MissionIntroPhase'));
const GameOverPhase = lazy(() => import('../components/chess/phases/GameOverPhase'));
const VsScreenPhase = lazy(() => import('../components/chess/phases/VsScreenPhase'));
const ChessBattleIntroPhase = lazy(() => import('../components/chess/phases/ChessBattleIntroPhase'));
const PokerCombatPhase = lazy(() => import('../components/chess/phases/PokerCombatPhase'));
const ChessPhase = lazy(() => import('../components/chess/phases/ChessPhase'));

// Realm icon / color / text-color tables moved into MissionIntroPhase.tsx
// (their only consumer). The coordinator no longer carries them.

type RagnarokGameCoordinatorProps = {
  initialArmy?: ArmySelectionType | null;
  /**
   * Opposing army announced by the remote peer in P2P mode. When provided,
   * overrides the default-army fallback so the opponent's hero portraits and
   * decks reflect what they actually selected. Single/campaign callers omit
   * this and the coordinator falls back to the campaign or default army.
   */
  opponentArmy?: ArmySelectionType | null;
};

function resolveOpponentArmy(
	ctx: ReturnType<typeof useMatchStore.getState>['activeMatch'],
	opponentArmyProp: ArmySelectionType | null,
): ArmySelectionType {
	if (ctx?.opponent.kind === 'peer') {
		if (!opponentArmyProp) {
			throw new Error('P2P_NOT_READY: opponent army is required before mounting the coordinator');
		}
		return opponentArmyProp;
	}
	if (opponentArmyProp) return opponentArmyProp;
	if (ctx) {
		const fromMode = deriveOpponentArmyForMode(ctx);
		if (fromMode) return fromMode;
	}
	return getDefaultArmySelection();
}

type MatchContext = ReturnType<typeof useMatchStore.getState>['activeMatch'];

function currentP2PCanonicalOrder(): number {
	const lifecycle = usePeerStore.getState().battleLifecycle;
	return Math.max(
		1,
		lifecycle?.lastCanonicalOrder ?? 0,
		useUnifiedCombatStore.getState().boardState.moveCount,
	);
}

/**
 * The coordinator may request a normal end only after the engine has produced
 * a terminal state. P2P still needs the absolute peer result committed first;
 * otherwise a local UI snapshot could accidentally resolve a pre-battle or
 * already-forfeited session.
 */
function recordP2PNormalResult(input: {
	readonly ctx: MatchContext;
	readonly winnerId: string | null;
	readonly loserId: string | null;
	readonly canonicalOrder: number;
}): boolean {
	if (input.ctx?.opponent.kind !== 'peer') return true;
	const peer = usePeerStore.getState();
	if (!peer.myPeerId || !peer.remotePeerId || !peer.battleLifecycle) return false;
	const eventId = `normal:${input.ctx.matchId}:${input.canonicalOrder}:${input.winnerId ?? 'draw'}`;
	const lifecycle = peer.recordNormalResult({
		winnerId: input.winnerId,
		loserId: input.loserId,
		eventId,
		canonicalOrder: input.canonicalOrder,
	});
	return lifecycle?.result?.kind === 'normal' && lifecycle.result.eventId === eventId;
}

const MATCH_EXIT_AUTO_HOME_SECONDS = 25;

type MatchExitControlsProps = {
  readonly visible: boolean;
  readonly promptOpen: boolean;
  readonly onRequestExit: () => void;
  readonly onCancelExit: () => void;
  readonly onConfirmExit: () => void;
};

function MatchExitControls({
  visible,
  promptOpen,
  onRequestExit,
  onCancelExit,
  onConfirmExit,
}: MatchExitControlsProps) {
  if (!visible && !promptOpen) return null;

  return (
    <>
      {visible && (
        <div className="match-exit-control">
          <button
            type="button"
            className="match-exit-button hover:brightness-110 focus-visible:outline"
            onClick={onRequestExit}
          >
            Leave Match
          </button>
        </div>
      )}
      {promptOpen && (
        <div className="match-exit-backdrop" role="presentation">
          <div
            className="match-exit-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="match-exit-title"
          >
            <div className="match-exit-kicker">Match in progress</div>
            <h2 id="match-exit-title">Leave this battle?</h2>
            <p>
              Leaving now records this run locally as abandoned and ends the current battle flow.
            </p>
            <div className="match-exit-actions">
              <button
                type="button"
                className="match-exit-secondary hover:brightness-110 focus-visible:outline"
                onClick={onCancelExit}
              >
                Stay
              </button>
              <button
                type="button"
                className="match-exit-danger hover:brightness-110 focus-visible:outline"
                onClick={onConfirmExit}
              >
                Leave Battle
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const RagnarokGameCoordinator: React.FC<RagnarokGameCoordinatorProps> = ({ initialArmy = null, opponentArmy: opponentArmyProp = null }) => {
  // Route-level MatchSetup wrappers populate this before mounting the
  // coordinator. The coordinator renders phases; it no longer decides which
  // public mode created the match.
  const ctx = useMatchStore((s) => s.activeMatch);

  const {
    playSoundEffect,
    playAudioCue,
    playBackgroundMusic,
    stopBackgroundMusic,
  } = useAudio();
  const p2pActions = useP2PActions();
  const navigate = useNavigate();

  const campaignDifficultyFromStore = useCampaignStore(s => s.currentDifficulty);
  const clearCurrent = useCampaignStore(s => s.clearCurrent);
  const flow = useMemo(() => ctx ? deriveMatchFlowPolicy(ctx) : null, [ctx]);
  const campaignMatch = flow?.campaign ?? null;
  const campaignData = useMemo(
    () => campaignMatch
      ? { mission: campaignMatch.mission, chapter: campaignMatch.chapter }
      : null,
    [campaignMatch],
  );
  const campaignDifficulty = campaignMatch?.difficulty ?? campaignDifficultyFromStore;
  const isCampaign = flow?.mode === 'campaign';

  const markCinematicSeen = useCampaignStore(s => s.markCinematicSeen);
  const seenChapterIds = useCampaignStore(s => s.seenCinematics);
  const intro = useMemo(() => {
    if (ctx) return deriveIntro(ctx, seenChapterIds);
    return { kind: 'none' as const };
  }, [ctx, seenChapterIds]);
  const hasCinematic = intro.kind === 'cinematic';
  const warbandArmy = useWarbandStore(selectArmy);
  const warbandDeck = useWarbandStore(selectDeckCardIds);
  const warbandDeckLoadout = useWarbandStore(selectDeckCardIdsByPiece);
  // TD-19: in P2P mode, chess board ids come from matchSeed after handshake.
  // Local `initializeBoard` must not race peer-synced piece ids. Gate every
  // mount-time `initializeBoard` on this flag.
  const isP2PConnected = flow?.usesPeerPhaseCheckpoint === true;
  const p2pTechnicalResult = usePeerStore(s => {
		const result = s.battleLifecycle?.result;
		if (result?.kind !== 'technical_abandonment' || !s.myPeerId) return null;
		return result.winnerId === s.myPeerId ? 'victory' : 'defeat';
	});
  const hasP2PTechnicalResult = p2pTechnicalResult !== null;
  const isLocalP2PAbandonment = p2pTechnicalResult === 'defeat';
  const effectiveInitialArmy: ArmySelectionType | null = initialArmy ?? warbandArmy;
  /*
    Round-level FSM (G4). The single source of truth for which phase
    the renderer is in. Phase components subscribe to flowState directly;
    coordinator effects read flowState.tag where they need to gate work.
  */
  const flowState = useGameFlowStore(s => s.current);
  const startFlow = useGameFlowStore(s => s.start);
  const dispatchFlow = useGameFlowStore(s => s.dispatch);
  const clearFlow = useGameFlowStore(s => s.clear);
  const phaseTransitionGateRef = useRef<Promise<void> | null>(null);

  const runPhaseTransition = useCallback((input: {
    readonly fromPhase: PhaseCheckpointPhase;
    readonly toPhase: PhaseCheckpointPhase;
    readonly apply: () => void;
  }): void => {
    if (!isP2PConnected) {
      input.apply();
      return;
    }
    if (phaseTransitionGateRef.current) return;

    const stateRoot = capturePhaseBoundaryStateRoot({
      fromPhase: input.fromPhase,
      toPhase: input.toPhase,
      isCardsAuthority: useGameStore.getState().myCanonicalSide === 'player',
    });
    if (!stateRoot) {
      GameEventBus.emitNotification({
        level: 'error',
        message: 'Phase verification unavailable. The match is paused safely.',
        duration: 12_000,
      });
      return;
    }

    const gate = p2pActions.requestPhaseCheckpoint({
      fromPhase: input.fromPhase,
      toPhase: input.toPhase,
      stateRoot,
    }).then((result) => {
      if (result.status === 'committed') {
        input.apply();
        return;
      }
      GameEventBus.emitNotification({
        level: 'error',
        message: result.status === 'disputed'
          ? 'Phase mismatch detected. The match is frozen for review.'
          : 'Phase verification timed out. The match remains paused.',
        duration: 15_000,
      });
    }).finally(() => {
      if (phaseTransitionGateRef.current === gate) {
        phaseTransitionGateRef.current = null;
      }
    });
    phaseTransitionGateRef.current = gate;
  }, [isP2PConnected, p2pActions]);

  const commitMatchEnd = useCallback((input: MatchEndCommit) => {
    const { request, initialSub } = input;
    const plan = matchEndCommitPlan(request);
    const apply = () => {
      if (request.ctx) {
        recordLocalBattleEnd({
          matchId: request.ctx.matchId,
          mode: derivePlayableMatchMode(request.ctx),
          iWon: request.iWon,
          isDraw: request.isDraw,
        });
      }
      if (plan.runLifecycle && request.ctx) {
        selectOnWinHandler(request.ctx)({
          iWon: request.iWon,
          turnCount: request.turnCount,
          finalGameState: request.finalGameState,
        });
      }
      if (plan.markDailyQuests) {
        markDailyQuestClaimsPendingAfterMatch({
          iWon: request.iWon,
          turnCount: request.turnCount,
        });
      }
      dispatchFlow({ type: 'GAME_ENDED', initialSub });
    };
    if (plan.usePhaseCheckpoint) {
      runPhaseTransition({
        fromPhase: request.fromPhase,
        toPhase: 'game_over',
        apply,
      });
      return;
    }
    apply();
  }, [dispatchFlow, runPhaseTransition]);

  const matchEndCommitRef = useRef(commitMatchEnd);
  matchEndCommitRef.current = commitMatchEnd;
  const matchEndControllerRef = useRef<MatchEndController | null>(null);
  if (matchEndControllerRef.current === null) {
    matchEndControllerRef.current = createMatchEndController({
      commit: (input) => matchEndCommitRef.current(input),
    });
  }
  const matchEndController = matchEndControllerRef.current;

  const [playerArmy, setPlayerArmy] = useState<ArmySelectionType | null>(effectiveInitialArmy);
  const [exitPromptOpen, setExitPromptOpen] = useState(false);
  const [matchAbandoned, setMatchAbandoned] = useState(false);
  /*
    Shared deck IDs flow directly into useUnifiedCombatStore.setSharedDeck
    when warband bootstrap fires. There is no need for a local mirror —
    every consumer (poker phase, combat resolution) reads from the unified
    store. The setter survives only as a write-through.
  */
  /*
    `combatPieces` (lifecycle tracker for in-flight chess→poker handoff)
    was removed in G8 — the FSM tag (`vs_screen` / `poker_combat`) is now
    the single source of truth for "are we mid-combat?". Guards that used
    to read combatPieces now derive the same answer from flowState.tag.
  */
  // Migrated to stores (G3):
  //   pokerSlotsSwapped → useUnifiedCombatStore (poker slice, crosses chess↔poker)
  //   playerTurnCount   → useUnifiedCombatStore (chess slice, board metadata)
  //   bossRulesApplied  → useCampaignStore (campaign-only)
  // Note: gameOverSubPhase WAS migrated to useCampaignStore in G3 but
  // G4 makes the FSM the single source of truth — sub now lives in
  // flowState.sub when tag === 'game_over'. Campaign-store fields kept
  // for one commit so reads don't break; G7 will delete the campaign field.
  const pokerSlotsSwapped = useUnifiedCombatStore(s => s.pokerSlotsSwapped);
  const setPokerSlotsSwapped = useUnifiedCombatStore(s => s.setPokerSlotsSwapped);
  const turnCount = useUnifiedCombatStore(s => s.playerTurnCount);
  const incrementPlayerTurn = useUnifiedCombatStore(s => s.incrementPlayerTurn);
  const resetPlayerTurnCount = useUnifiedCombatStore(s => s.resetPlayerTurnCount);
  const bossRulesApplied = useCampaignStore(s => s.bossRulesApplied);
  const markBossRulesApplied = useCampaignStore(s => s.markBossRulesApplied);
  const resetBossRulesApplied = useCampaignStore(s => s.resetBossRulesApplied);
  const gameOverSubPhase: 'cinematic' | 'result' | 'bridge' =
    flowState !== null && flowState.tag === 'game_over' ? flowState.sub : 'result';

  const {
    boardState,
    initializeBoard,
    pendingCombat,
    pendingAttackAnimation,
    clearPendingCombat,
    resolveCombat,
    setSharedDeck,
    resetBoard,
    updatePieceStamina,
    updatePieceHealth,
    incrementAllStamina,
    setGameStatus,
    nextTurn
  } = useChessCombatAdapter();

  const { initializeCombatFromPayload, endCombat } = usePokerCombatAdapter();

	const opponentArmy = useMemo(() => {
		// Peer armies are wire-owned. Missing data is a hard readiness error,
		// never an opportunity to substitute the local AI roster.
		return resolveOpponentArmy(ctx, opponentArmyProp);
	}, [ctx, opponentArmyProp]);

  const missionRealm = campaignData?.mission?.realm;
  const visualRealm = useMemo(() => resolveVisualRealm(missionRealm), [missionRealm]);
  const realmDisplayName = getRealmDisplayName(visualRealm);

  // Local-play gameState bootstrap (C5). gameStore module-load now returns
  // the empty deterministic shape; whoever drives a local match must call
  // `initGame()` to populate decks, hands, and hero powers. The
  // coordinator owns that responsibility for non-P2P modes (campaign,
  // warband, picker fallback). P2P matches are populated by both peers via
  // `initGameFromHandshake` in `useWireSync`, so this effect bails on P2P.
  // Idempotent via ref — re-mounts on the same coordinator instance do
  // not re-initialize.
  const localPlayInitRef = useRef(false);
  useEffect(() => {
    if (localPlayInitRef.current) return;
    if (isP2PConnected) return;
    localPlayInitRef.current = true;
    useGameStore.getState().initGame();
  }, [isP2PConnected]);

  // Initialize board if initialArmy is provided.
  // P2P mode: skip — the P2P-specific effect below populates the board
  // with seeded piece ids so both peers converge.
  useEffect(() => {
    if (isP2PConnected) {
      if (initialArmy && !playerArmy) setPlayerArmy(initialArmy);
      return;
    }
    if (initialArmy && !playerArmy) {
      setPlayerArmy(initialArmy);
      initializeBoard(initialArmy, opponentArmy, cryptoIdGen);
    }
  }, [initialArmy, opponentArmy, initializeBoard, playerArmy, isP2PConnected]);

  // Bootstrap from warband store when arriving via /warband flow.
  // Idempotent via ref so the board is initialized exactly once per mount.
  const bootstrappedFromWarbandRef = useRef(false);
  useEffect(() => {
    if (bootstrappedFromWarbandRef.current) return;
    if (initialArmy || !flow?.bootstrapsWarband) return;
    if (!warbandArmy) return;
    if (isP2PConnected) return;
    bootstrappedFromWarbandRef.current = true;
    initializeBoard(warbandArmy, opponentArmy, cryptoIdGen, warbandDeckLoadout);
    if (warbandDeck.length > 0) {
      setSharedDeck([...warbandDeck]);
    }
  }, [warbandArmy, warbandDeck, warbandDeckLoadout, flow?.bootstrapsWarband, initialArmy, opponentArmy, initializeBoard, setSharedDeck, isP2PConnected]);

  // P2P chess board bootstrap. Both peers compute identical piece ids
  // from `matchSeed + 'chess-pieces'`, so any future move reference (by
  // piece id) resolves to the same piece on each side.
  //
  // Pre-Fase-5 this effect also gated on `peerStore.p2pInitApplied` and
  // `gameStore.matchSeed`. <MatchSetupP2P/> makes both guarantees BEFORE
  // mounting this coordinator: it only renders children once matchSeed +
  // matchId + p2pInitApplied (handshake) are populated.
  // The remaining guards are the local-mode fallthrough (`isP2PConnected`)
  // and the symmetric army-arrival check.
  const matchSeed = useGameStore(s => s.matchSeed);
  // Local viewer's canonical chess side (decided at handshake from
  // matchSeed parity). SP defaults to 'player' (human is first-mover).
  // Drives all viewer-relative presentation in this coordinator AND the
  // P2P board initialization (canonical first-mover army goes into
  // PLAYER_INITIAL_POSITIONS so both peers compute identical piece ids).
  const myCanonicalSide = useGameStore(s => s.myCanonicalSide) ?? 'player';
  const p2pPerspective = useMemo(
    () => createP2PViewerPerspective(myCanonicalSide),
    [myCanonicalSide]
  );
  const enemyCanonicalSide: 'player' | 'opponent' = p2pPerspective.remoteCanonicalSide;
  const myWinStatus: 'player_wins' | 'opponent_wins' = myCanonicalSide === 'player' ? 'player_wins' : 'opponent_wins';
  const viewerChessResult = getViewerChessResult({
    status: boardState.gameStatus,
    myWinStatus,
  });
  const p2pBoardInitRef = useRef(false);
  useEffect(() => {
    if (p2pBoardInitRef.current) return;
    if (!isP2PConnected) return;
    if (!matchSeed) return;
    if (!initialArmy || !opponentArmy) return;
    if (boardState.pieces.length > 0) {
      p2pBoardInitRef.current = true;
      return;
    }
    p2pBoardInitRef.current = true;
    const idGen = createSeededIdGen(matchSeed, 'chess-pieces');
    // Canonical-frame init: the first-mover's army goes into the canonical
    // 'player' positions globally. Both peers must agree on which physical
    // army is the first-mover's. Map local `initialArmy`/`opponentArmy`
    // (viewer-relative props) to canonical (whiteArmy=first-mover) before
    // calling `initializeBoard`. Same idGen sequence on identical canonical
    // layout → identical piece ids on both peers.
    const canonicalArmies = mapViewerValuesToCanonical({
      perspective: p2pPerspective,
      localValue: initialArmy,
      remoteValue: opponentArmy,
    });
    initializeBoard(canonicalArmies.player, canonicalArmies.opponent, idGen);
  }, [isP2PConnected, matchSeed, initialArmy, opponentArmy, initializeBoard, p2pPerspective, boardState.pieces.length]);

  useCampaignGameBootstrap({
    missionRealm,
    visualRealm,
    realmDisplayName,
    flowState,
    effectiveInitialArmy,
    hasCinematic,
    campaignData,
    initialArmy,
    playerArmy,
    opponentArmy,
    setPlayerArmy,
    initializeBoard,
    resetBossRulesApplied,
    startFlow,
  });

  const handleCinematicComplete = useCallback(() => {
    if (campaignData) {
      markCinematicSeen(campaignData.chapter.id);
    }
    // FSM reads `state.then` — set at cinematic entry — to decide whether
    // mission_intro or chess_intro comes next. The chess intro owns its
    // authored audio and does not leak a generic game-start cue here.
    dispatchFlow({ type: 'CINEMATIC_DONE' });
  }, [campaignData, markCinematicSeen, dispatchFlow]);

  const handleMissionIntroComplete = useCallback(() => {
    dispatchFlow({ type: 'INTRO_DONE' });
  }, [dispatchFlow]);

  const handleChessIntroComplete = useCallback(() => {
    dispatchFlow({ type: 'CHESS_INTRO_DONE' });
  }, [dispatchFlow]);

  useEffect(() => {
    if (flowState?.tag !== 'vs_screen') return;

    playBackgroundMusic('runes_first_move_transition');
    return () => {
      // Do not stop a newer combat track if the child arena mounted first.
      if (useAudio.getState().currentMusicTrack === 'runes_first_move_transition') {
        stopBackgroundMusic();
      }
    };
  }, [flowState?.tag, playBackgroundMusic, stopBackgroundMusic]);

  useBossRuleEffects({
    campaignData,
    campaignDifficulty,
    flowState,
    boardState,
    turnCount,
    bossRulesApplied,
    markBossRulesApplied,
    updatePieceHealth,
  });

  const { lastMineTriggered } = useKingChessAbility(myCanonicalSide);

  const handleCombatTriggered = useCallback((attackerId: string, defenderId: string) => {

    if (lastMineTriggered) {
      setTimeout(() => {
        const freshPieces = useUnifiedCombatStore.getState().boardState.pieces;
        const freshAttacker = freshPieces.find(p => p.id === attackerId);
        const freshDefender = freshPieces.find(p => p.id === defenderId);
        if (!freshAttacker || !freshDefender) return;
        dispatchFlow({ type: 'COMBAT_TRIGGERED', pieces: { attacker: freshAttacker, defender: freshDefender } });
        playSoundEffect('card_draw');
      }, 1800);
    } else {
      const attacker = boardState.pieces.find(p => p.id === attackerId);
      const defender = boardState.pieces.find(p => p.id === defenderId);
      if (!attacker || !defender) return;
      dispatchFlow({ type: 'COMBAT_TRIGGERED', pieces: { attacker, defender } });
      playSoundEffect('card_draw');
    }
  }, [boardState.pieces, playSoundEffect, lastMineTriggered, dispatchFlow]);

  const handleVsScreenComplete = useCallback(() => {
    // VS pieces now live in flowState.pieces (FSM owns vs_screen). Bail
    // unless the FSM is actually in vs_screen — late callbacks from the
    // VS timer can fire after a phase change.
    if (flowState === null || flowState.tag !== 'vs_screen') return;
    const vsPieces = flowState.pieces;

    const binding = bindResumePokerHandoff({
      flow: flowState,
      pendingCombat,
      pieces: [...boardState.pieces, vsPieces.attacker, vsPieces.defender],
      localArmy: playerArmy,
      remoteArmy: opponentArmy,
      perspective: p2pPerspective,
      matchSeed,
      chessMoveCount: boardState.moveCount,
      resolvePortrait: resolveHeroPortrait,
    });
    if (binding.kind !== 'bound') return;

    const { handoff, adapterInit } = binding.plan;
    const attacker = handoff.attacker;
    const defender = handoff.defender;

    debug.combat(`Attacker ${attacker.type} (${attacker.owner}): HP=${attacker.health}, Stamina=${attacker.stamina}`);
    debug.combat(`Defender ${defender.type} (${defender.owner}): HP=${defender.health}, Stamina=${defender.stamina}`);
    debug.combat(`First strike will be applied via animation in poker combat`);

    // (Realm background is now set earlier — see useEffect that watches
    //  campaignData.mission.realm. The chess phase needs the realm class
    //  applied before combat starts, not just at piece collision.)

    debug.combat(`Poker player pet stamina: ${adapterInit.playerPet.stats.currentStamina}/${adapterInit.playerPet.stats.maxStamina}`);
    debug.combat(`Poker opponent pet stamina: ${adapterInit.opponentPet.stats.currentStamina}/${adapterInit.opponentPet.stats.maxStamina}`);

    setPokerSlotsSwapped(handoff.slotsSwapped);
    initializeCombatFromPayload(adapterInit);

    runPhaseTransition({
      fromPhase: 'chess',
      toPhase: 'poker_combat',
      apply: () => {
        stopBackgroundMusic();
        dispatchFlow({ type: 'VS_COMPLETE', handoff });
        playAudioCue('frontline_tactical_sting');
      },
    });
  }, [flowState, pendingCombat, playerArmy, opponentArmy, boardState.pieces, boardState.moveCount, initializeCombatFromPayload, playAudioCue, stopBackgroundMusic, setPokerSlotsSwapped, dispatchFlow, matchSeed, p2pPerspective, runPhaseTransition]);

  const resumeHandoffKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isP2PConnected) return;
    if (flowState === null || (flowState.tag !== 'poker_combat' && flowState.tag !== 'vs_screen')) {
      resumeHandoffKeyRef.current = null;
      return;
    }
    const binding = bindResumePokerHandoff({
      flow: flowState,
      pendingCombat,
      pieces: boardState.pieces,
      localArmy: playerArmy,
      remoteArmy: opponentArmy,
      perspective: p2pPerspective,
      matchSeed,
      chessMoveCount: boardState.moveCount,
      resolvePortrait: resolveHeroPortrait,
    });
    if (binding.kind !== 'bound') return;
    const key = [
      matchSeed ?? '',
      binding.plan.handoff.attacker.id,
      binding.plan.handoff.defender.id,
      String(boardState.moveCount),
      binding.plan.handoff.slotsSwapped ? '1' : '0',
    ].join(':');
    if (resumeHandoffKeyRef.current === key) return;
    resumeHandoffKeyRef.current = key;
    setPokerSlotsSwapped(binding.plan.handoff.slotsSwapped);
    if (!isResumeHandoffCurrent(flowState, binding.plan)) {
      useGameFlowStore.getState().hydrate(binding.flow);
    }
  }, [
    isP2PConnected,
    flowState,
    pendingCombat,
    boardState.pieces,
    boardState.moveCount,
    playerArmy,
    opponentArmy,
    p2pPerspective,
    matchSeed,
    setPokerSlotsSwapped,
  ]);

  const handleCombatEnd = useCallback((winner: 'player' | 'opponent' | 'draw') => {
    try {
      // Match-end already claimed by the single matchEndController.
      // Dispatching COMBAT_RESOLVED here would race GAME_ENDED and flash
      // chess in limbo.
      if (matchEndController.hasProcessed()) {
        clearPendingCombat();
        setPokerSlotsSwapped(false);
        endCombat();
        return;
      }

      const storeState = useUnifiedCombatStore.getState();
      const freshCombat = storeState.pendingCombat;
      const freshPokerState = storeState.pokerCombatState;

      if (!freshCombat) {
        debug.combat(`[handleCombatEnd] Guard fail: pendingCombat=${!!freshCombat}, flowTag=${flowState?.tag ?? null}`);
        clearPendingCombat();
        setPokerSlotsSwapped(false);
        endCombat();
        runPhaseTransition({
          fromPhase: 'poker_combat',
          toPhase: 'chess',
          apply: () => {
            dispatchFlow({ type: 'COMBAT_RESOLVED' });
            playSoundEffect('turn_start');
          },
        });
        return;
      }

      const playerPreBlindHP = freshPokerState?.player.preBlindHealth ?? freshPokerState?.player.pet.stats.currentHealth ?? 0;
      const opponentPreBlindHP = freshPokerState?.opponent.preBlindHealth ?? freshPokerState?.opponent.pet.stats.currentHealth ?? 0;
      const playerStamina = freshPokerState?.player.pet.stats.currentStamina ?? 0;
      const opponentStamina = freshPokerState?.opponent.pet.stats.currentStamina ?? 0;

      const pokerPlayerPiece = pokerSlotsSwapped ? freshCombat.defender : freshCombat.attacker;
      const pokerOpponentPiece = pokerSlotsSwapped ? freshCombat.attacker : freshCombat.defender;

      debug.combat(`Winner: ${winner}, pokerSlotsSwapped: ${pokerSlotsSwapped}`);
      debug.combat(`Poker player = chess ${pokerSlotsSwapped ? 'defender' : 'attacker'} (${pokerPlayerPiece.owner})`);
      debug.combat(`Poker opponent = chess ${pokerSlotsSwapped ? 'attacker' : 'defender'} (${pokerOpponentPiece.owner})`);
      debug.combat(`PreBlindHP - player: ${playerPreBlindHP}, opponent: ${opponentPreBlindHP}`);
      debug.combat(`Stamina - player: ${playerStamina}, opponent: ${opponentStamina}`);

      if (winner === 'draw') {
        updatePieceHealth(pokerPlayerPiece.id, Math.max(1, playerPreBlindHP));
        updatePieceHealth(pokerOpponentPiece.id, Math.max(1, opponentPreBlindHP));
        updatePieceStamina(pokerPlayerPiece.id, playerStamina);
        updatePieceStamina(pokerOpponentPiece.id, opponentStamina);

        incrementAllStamina();
        nextTurn();

        debug.chess(`Draw resolved - both pieces survive. Player HP: ${playerPreBlindHP}, Opponent HP: ${opponentPreBlindHP}`);
      } else {
        let winnerPiece: typeof freshCombat.attacker;
        let loserPiece: typeof freshCombat.attacker;
        let winnerNewHealth: number;
        let winnerNewStamina: number;

        if (winner === 'player') {
          winnerPiece = pokerPlayerPiece;
          loserPiece = pokerOpponentPiece;
          winnerNewHealth = playerPreBlindHP;
          winnerNewStamina = playerStamina;
          debug.chess(`Poker player (${winnerPiece.owner} ${winnerPiece.type}) wins - HP stays at ${playerPreBlindHP}`);
        } else {
          winnerPiece = pokerOpponentPiece;
          loserPiece = pokerPlayerPiece;
          winnerNewHealth = opponentPreBlindHP;
          winnerNewStamina = opponentStamina;
          debug.chess(`Poker opponent (${winnerPiece.owner} ${winnerPiece.type}) wins - HP stays at ${opponentPreBlindHP}`);
        }

        resolveCombat({
          winner: winnerPiece,
          loser: loserPiece,
          winnerNewHealth: Math.max(1, winnerNewHealth)
        });

        debug.combat(`Updating winner ${winnerPiece.type} (${winnerPiece.owner}) stamina to ${winnerNewStamina}`);
        updatePieceStamina(winnerPiece.id, winnerNewStamina);
      }

      clearPendingCombat();
      setPokerSlotsSwapped(false);
      endCombat();

      runPhaseTransition({
        fromPhase: 'poker_combat',
        toPhase: 'chess',
        apply: () => {
          dispatchFlow({ type: 'COMBAT_RESOLVED' });
          playSoundEffect('turn_start');
        },
      });
    } catch (error) {
      debug.error('[handleCombatEnd] Error during combat resolution:', error);
      setPokerSlotsSwapped(false);
      endCombat();
      if (!isP2PConnected) {
        dispatchFlow({ type: 'COMBAT_RESOLVED' });
      } else {
        GameEventBus.emitNotification({
          level: 'error',
          message: 'Combat resolution failed locally. The PvP match is frozen safely.',
          duration: 15_000,
        });
      }
    }
  }, [pokerSlotsSwapped, resolveCombat, clearPendingCombat, endCombat, playSoundEffect, updatePieceStamina, updatePieceHealth, incrementAllStamina, nextTurn, setPokerSlotsSwapped, dispatchFlow, flowState?.tag, runPhaseTransition, isP2PConnected, matchEndController]);

  // Chess terminal: checkmate, draw, or king/material. Cards-victory (hero
  // HP=0) is the next effect. Both go through matchEndController so the
  // first signal owns game_over and re-renders cannot cancel the delay.
  useEffect(() => {
    const winner = getWinnerFromGameStatus(boardState.gameStatus);
    const terminalResult = viewerChessResult;
    if (!terminalResult) return;

    const iWon = winner
      ? deriveIWonForPhase({
          kind: 'chess',
          canonicalWinner: winner,
          myCanonicalSide,
        })
      : false;
    const isDraw = terminalResult === 'draw';
		if (ctx?.opponent.kind === 'peer') {
			const peer = usePeerStore.getState();
			if (!peer.myPeerId || !peer.remotePeerId) return;
			const winnerId = winner === null
				? null
				: winner === myCanonicalSide ? peer.myPeerId : peer.remotePeerId;
			const loserId = winnerId === null
				? null
				: winnerId === peer.myPeerId ? peer.remotePeerId : peer.myPeerId;
			if (!recordP2PNormalResult({
				ctx,
				winnerId,
				loserId,
				canonicalOrder: currentP2PCanonicalOrder(),
			})) return;
		}
    const request: MatchEndRequest = {
      ctx,
      iWon,
      isDraw,
      turnCount,
      fromPhase: flowState?.tag === 'poker_combat' ? 'poker_combat' : 'chess',
      commitMode: 'phase-checkpoint',
      delayMs: GAME_END_DELAY_MS,
      finalGameState: useGameStore.getState().gameState ?? undefined,
    };
    if (!matchEndController.requestGameEnd(request)) return;
    playSoundEffect(isDraw ? 'defeat' : iWon ? 'victory' : 'defeat');
    playAudioCue('final_battle_cadence');
    // Trigger signals only. Request snapshots lifecycle inputs so later
    // renders cannot cancel the delay (the previous inline timer did).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardState.gameStatus, viewerChessResult, playSoundEffect, playAudioCue]);

  // Cards-victory (hero HP=0). Without a terminal claim the FSM stays in
  // poker_combat and handleCombatEnd would send chess back into limbo.
  const cardsGamePhase = useGameStore(s => s.gameState?.gamePhase);
  const cardsWinner = useGameStore(s => s.gameState?.winner);
  useEffect(() => {
    if (cardsGamePhase !== 'game_over') return;
    if (!cardsWinner || cardsWinner === 'draw') return;

    const iWon = deriveIWonForPhase({
      kind: 'cards',
      viewerWinner: cardsWinner,
    });
		if (ctx?.opponent.kind === 'peer') {
			const peer = usePeerStore.getState();
			if (!peer.myPeerId || !peer.remotePeerId) return;
			const winnerId = cardsWinner === 'player' ? peer.myPeerId : peer.remotePeerId;
			const loserId = winnerId === peer.myPeerId ? peer.remotePeerId : peer.myPeerId;
			if (!recordP2PNormalResult({
				ctx,
				winnerId,
				loserId,
				canonicalOrder: currentP2PCanonicalOrder(),
			})) return;
		}
    const request: MatchEndRequest = {
      ctx,
      iWon,
      isDraw: false,
      turnCount,
      fromPhase: flowState?.tag === 'chess' ? 'chess' : 'poker_combat',
      commitMode: 'phase-checkpoint',
      delayMs: GAME_END_DELAY_MS,
      finalGameState: useGameStore.getState().gameState ?? undefined,
    };
    if (!matchEndController.requestGameEnd(request)) return;
    playSoundEffect(iWon ? 'victory' : 'defeat');
    playAudioCue('final_battle_cadence');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardsGamePhase, cardsWinner, playSoundEffect, playAudioCue]);

  useEffect(() => {
    if (flowState?.tag === 'chess' && boardState.currentTurn === 'player' && boardState.gameStatus === 'playing') {
      incrementPlayerTurn();
    }
  }, [flowState, boardState.currentTurn, boardState.gameStatus, incrementPlayerTurn]);

  // AI driver — fires only when the chess phase is active AND there's no
  // P2P match (the hook gates internally on `matchSeed`, see useChessAITurn
  // for the full contract).
  useChessAITurn({ enabled: flowState?.tag === 'chess' });

  const matchOnScreen = flow?.mode === 'campaign'
    || Boolean(effectiveInitialArmy || playerArmy);
  useMatchReloadGuard({
    enabled: flow?.mode !== 'p2p' && shouldWarnOnMatchReload({
      hasActiveMatch: ctx !== null && matchOnScreen,
      flowTag: flowState?.tag ?? null,
      cardsGamePhase: cardsGamePhase ?? null,
    }),
    mode: flow?.mode ?? null,
  });

  useEffect(() => {
    if (shouldTriggerChessCombatFlow({
      hasPendingCombat: !!pendingCombat,
      chessGameStatus: boardState.gameStatus,
      flowTag: flowState?.tag ?? null,
      hasPendingAttackAnimation: pendingAttackAnimation !== null,
    })) {
      debug.chess('pendingCombat detected, triggering combat flow');
      if (!pendingCombat) return;
      const { attacker, defender } = pendingCombat;

      dispatchFlow({ type: 'COMBAT_TRIGGERED', pieces: { attacker, defender } });
      playSoundEffect('card_draw');
    }
  }, [pendingCombat, pendingAttackAnimation, boardState.gameStatus, flowState?.tag, playSoundEffect, dispatchFlow]);

  useEffect(() => {
    if (flowState?.tag === 'chess' && boardState.gameStatus === 'playing') {
      const currentSide = boardState.currentTurn;
      const terminalStatus = getNoLegalMovesStatus(currentSide, boardState.pieces);

      if (terminalStatus !== 'playing') {
        debug.chess(`${currentSide} has no valid moves - ${terminalStatus}`);
        setGameStatus(terminalStatus);
      }
    }
  }, [flowState, boardState.currentTurn, boardState.gameStatus, boardState.pieces, setGameStatus]);

  const handleRestart = useCallback(() => {
    if (isP2PConnected) {
      const confirmed = window.confirm(
        'This will abandon the current PvP match and close the current peer session. Search for another opponent?',
      );
      if (!confirmed) return;

      void clearP2PMatchResume();
      usePeerStore.getState().disconnect();
      useMatchStore.getState().clearMatch();
      useGameStore.getState().resetGameState();
    }

    resetBoard();
    setPlayerArmy(null);
    setSharedDeck([]);
    resetPlayerTurnCount();
    setExitPromptOpen(false);
    setMatchAbandoned(false);
    matchEndController.reset();
    bootstrappedFromWarbandRef.current = false;
    clearFlow();
    const restart = flow?.restartDestination;
    if (restart?.kind === 'campaign-map') {
      clearCurrent();
      // After clearCurrent, campaign mode becomes false on next render and the
      // /warband redirect guard catches us. The FSM bootstrap effect will
      // re-fire if a new mission is started later.
    } else {
      navigate(getWarbandEntryRoute(restart?.intent ?? 'single'));
    }
  }, [
    resetBoard,
    flow?.restartDestination,
    matchEndController,
    clearCurrent,
    navigate,
    resetPlayerTurnCount,
    clearFlow,
    setSharedDeck,
    isP2PConnected,
  ]);

  const handleReturnHome = useCallback(() => {
    matchEndController.reset();
    resetBoard();
    setPlayerArmy(null);
    setSharedDeck([]);
    resetPlayerTurnCount();
    resetBossRulesApplied();
    setExitPromptOpen(false);
    setMatchAbandoned(false);
    bootstrappedFromWarbandRef.current = false;
    clearFlow();
    if (isCampaign) clearCurrent();
    navigate(routes.home);
  }, [resetBoard, setSharedDeck, resetPlayerTurnCount, resetBossRulesApplied, clearFlow, isCampaign, clearCurrent, navigate, matchEndController]);

  const handleConfirmExit = useCallback(() => {
		const peer = usePeerStore.getState();
		if (ctx?.opponent.kind === 'peer') {
			if (peer.battleLifecycle?.result) {
				setExitPromptOpen(false);
				return;
			}
			const lifecycle = peer.myPeerId ? peer.requestP2PLeave(peer.myPeerId) : null;
			if (!lifecycle || lifecycle.phase === 'cancelled') {
				void clearP2PMatchResume();
				setExitPromptOpen(false);
				peer.disconnect();
				useMatchStore.getState().clearMatch();
				useGameStore.getState().resetGameState();
				GameEventBus.emitNotification({
					level: 'info',
					message: 'Match canceled before the first valid move. No result recorded.',
					duration: 4_000,
				});
				handleReturnHome();
				return;
			}
		}
    void clearP2PMatchResume();
    setExitPromptOpen(false);
    setMatchAbandoned(true);
    clearPendingCombat();
    setPokerSlotsSwapped(false);
    endCombat();
    playSoundEffect('defeat');
    matchEndController.forceCommit({
      ctx,
      iWon: false,
      isDraw: false,
      turnCount,
      fromPhase: flowState?.tag === 'poker_combat' ? 'poker_combat' : 'chess',
      commitMode: 'local',
      delayMs: 0,
      abandoned: true,
    });
  }, [
    clearPendingCombat,
    setPokerSlotsSwapped,
    endCombat,
    playSoundEffect,
    ctx,
    turnCount,
    flowState?.tag,
    matchEndController,
		handleReturnHome,
  ]);

  /*
    "Back to Campaign" — if the player won AND the mission has an authored
    storyBridge, play those scenes before navigating to the map. The bridge
    is the connective tissue between mission N and N+1: "Years pass.
    Yggdrasil drinks deep from the well of Urd..." Falls through directly
    on missions without a bridge or on defeat.
  */
  const handleBackToCampaign = useCallback(() => {
    if (
      isCampaign &&
      campaignData &&
      boardState.gameStatus === myWinStatus &&
      gameOverSubPhase === 'result' &&
      (campaignData.mission.storyBridge?.length ?? 0) > 0
    ) {
      dispatchFlow({ type: 'GAME_OVER_ADVANCE', nextSub: 'bridge' });
      return;
    }
    clearCurrent();
    navigate(routes.campaign);
  }, [clearCurrent, navigate, isCampaign, campaignData, boardState.gameStatus, gameOverSubPhase, dispatchFlow]);

  const handleRetryMission = useCallback(() => {
    resetBoard();
    setPlayerArmy(null);
    resetPlayerTurnCount();
    resetBossRulesApplied();
    matchEndController.reset();
    setExitPromptOpen(false);
    setMatchAbandoned(false);
    const defaultArmy = getDefaultArmySelection();
    setPlayerArmy(defaultArmy);
    initializeBoard(defaultArmy, opponentArmy, cryptoIdGen);
    clearFlow();
    startFlow({ kind: 'chess_intro' });
  }, [resetBoard, opponentArmy, initializeBoard, resetPlayerTurnCount, resetBossRulesApplied, clearFlow, startFlow, matchEndController]);

  const handleBattleMode = useCallback(() => {
    // Dev-only Battle Sandbox: hero vs hero so poker has a deck on both sides.
    const playerPieces = boardState.pieces.filter(p => p.owner === myCanonicalSide && p.type !== 'pawn' && p.type !== 'king');
    const opponentPieces = boardState.pieces.filter(p => p.owner === enemyCanonicalSide && p.type !== 'pawn' && p.type !== 'king');

    if (playerPieces.length === 0 || opponentPieces.length === 0) {
      debug.chess('BattleMode: Not enough pieces for test battle');
      return;
    }

    const attacker = playerPieces[Math.floor(cryptoRng() * playerPieces.length)];
    const defender = opponentPieces[Math.floor(cryptoRng() * opponentPieces.length)];
    const staged = useUnifiedCombatStore.getState().stagePendingPokerCombat(attacker, defender);
    if (staged.status !== 'applied') {
      debug.chess(`BattleMode: failed to stage poker combat (${staged.status === 'rejected' ? staged.reason : 'unknown'})`);
      return;
    }

    dispatchFlow({ type: 'COMBAT_TRIGGERED', pieces: { attacker, defender } });
    playSoundEffect('card_draw');
  }, [boardState.pieces, myCanonicalSide, enemyCanonicalSide, playSoundEffect, dispatchFlow]);

  // Chess root carries the realm-{id} class so the chess phase board can
  // get its own thematic background per mission. CSS rules live in
  // chess-realm-skins.css. Chapter finale missions also get the
  // .mission-finale class which adds a pulsing crimson border + slower
  // music. CSS for finale lives in chess-realm-skins.css.
  const animationsEnabled = useSettingsStore(s => s.animationsEnabled);
  const reduceMotion = useSettingsStore(s => s.reduceMotion);
  const chessRootMotionClass = (animationsEnabled && !reduceMotion) ? 'chess-motion-on' : 'chess-motion-off';
  const chessRealmClass = getChessRealmClass({ missionRealm, visualRealm });
  const finaleClass = getFinaleClass(campaignData);
  const canLeaveActiveMatch = flowState?.tag === 'chess'
    || flowState?.tag === 'vs_screen'
    || flowState?.tag === 'poker_combat';
	const isP2PMatch = ctx?.opponent.kind === 'peer';
	const handleRequestExit = useCallback(() => {
		if (!isP2PMatch) {
			setExitPromptOpen(true);
			return;
		}
		toast.warning('Leave this PvP match?', {
			description: 'Before the first valid move it cancels safely. After that it becomes a technical defeat.',
			duration: 8_000,
			action: { label: 'Leave match', onClick: handleConfirmExit },
		});
	}, [handleConfirmExit, isP2PMatch]);

  // Guard: arriving at a gameplay route with no warband and not in campaign -> redirect to picker
  if (!effectiveInitialArmy && !playerArmy && flow?.mode !== 'campaign') {
    return <Navigate to={getWarbandEntryRoute('single')} replace />;
  }

  return (
    <div className={`ragnarok-chess-game w-full min-h-dvh h-dvh overflow-hidden ${chessRealmClass} ${finaleClass} ${chessRootMotionClass}`.trim()}>
		<MatchExitControls
			visible={canLeaveActiveMatch}
			promptOpen={isP2PMatch ? false : exitPromptOpen}
			onRequestExit={handleRequestExit}
        onCancelExit={() => setExitPromptOpen(false)}
        onConfirmExit={handleConfirmExit}
      />
      <Suspense fallback={null}>
        {flowState !== null && flowState.tag === 'cinematic' && (
          <CinematicPhase
            intro={flowState.cinematic.intro}
            onComplete={handleCinematicComplete}
          />
        )}

        {flowState !== null && flowState.tag === 'mission_intro' && campaignData && (
          <MissionIntroPhase
            mission={campaignData.mission}
            chapterName={campaignData.chapter.name}
            onComplete={handleMissionIntroComplete}
          />
        )}

        {flowState !== null && flowState.tag === 'chess_intro' && (
          <ChessBattleIntroPhase onComplete={handleChessIntroComplete} />
        )}
      </Suspense>

      <Suspense fallback={null}>
        <AnimatePresence mode="wait">
          {flowState !== null && flowState.tag === 'chess' && (
            <ChessPhase
              boardState={boardState}
              playerArmy={playerArmy}
              opponentArmy={opponentArmy}
              onCombatTriggered={handleCombatTriggered}
              onBattleMode={handleBattleMode}
              sceneFxEnabled={shouldEnableRagnarokSceneFx(chessRealmClass)}
              motionEnabled={animationsEnabled && !reduceMotion}
            />
          )}

          {flowState !== null && flowState.tag === 'vs_screen' && (
            <VsScreenPhase
              attacker={flowState.pieces.attacker}
              defender={flowState.pieces.defender}
              onTimeout={handleVsScreenComplete}
            />
          )}

          {flowState !== null && flowState.tag === 'poker_combat' && (
            <PokerCombatPhase
              handoff={flowState.handoff}
              onCombatEnd={handleCombatEnd}
            />
          )}

          {flowState !== null && flowState.tag === 'game_over' && (
            <GameOverPhase
              result={p2pTechnicalResult ?? viewerChessResult ?? 'defeat'}
              sub={flowState.sub}
              playerTurnCount={turnCount}
              campaign={isCampaign && campaignData ? {
                mission: campaignData.mission,
                chapter: campaignData.chapter,
                difficulty: campaignDifficulty,
                localRunId: campaignMatch?.localRunId ?? null,
              } : null}
              onCinematicEnd={() => dispatchFlow({ type: 'GAME_OVER_ADVANCE', nextSub: 'result' })}
              onBridgeEnd={() => { clearCurrent(); navigate(routes.campaign); }}
              onPrimaryAction={matchAbandoned || hasP2PTechnicalResult ? handleReturnHome : isCampaign ? handleBackToCampaign : handleRestart}
              onHome={handleReturnHome}
              onRetry={handleRetryMission}
              abandonment={matchAbandoned || isLocalP2PAbandonment ? { autoHomeSeconds: MATCH_EXIT_AUTO_HOME_SECONDS } : null}
            />
          )}
        </AnimatePresence>
      </Suspense>
    </div>
  );
};

export default RagnarokGameCoordinator;
