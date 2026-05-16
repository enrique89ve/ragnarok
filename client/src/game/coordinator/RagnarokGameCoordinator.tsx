
import React, { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ArmySelection as ArmySelectionType } from '../types/ChessTypes';
import { useChessCombatAdapter } from '../hooks/useChessCombatAdapter';
import { getDefaultArmySelection } from '../data/ChessPieceConfig';
import { useCampaignStore } from '../campaign';
import { deriveIntro, deriveIWonForPhase, deriveOpponentArmyForMode, flushDailyQuestClaimsAfterMatch, selectOnWinHandler, useMatchStore } from '../match';
import { Navigate, useNavigate } from 'react-router-dom';
import { routes } from '../../lib/routes';
import { usePokerCombatAdapter } from '../hooks/usePokerCombatAdapter';
import { useAudio } from '../../lib/stores/useAudio';
import { useKingChessAbility } from '../hooks/useKingChessAbility';
import { useChessAITurn } from './hooks/useChessAITurn';
import { useUnifiedCombatStore } from '../stores/unifiedCombatStore';
import { useGameFlowStore } from '../stores/gameFlowStore';
import type { CombatHandoff } from '../flow/round/types';
import { debug } from '../config/debugConfig';
import {
  selectArmy,
  selectDeckCardIds,
  selectDeckCardIdsByPiece,
  useWarbandStore,
} from '../../lib/stores/useWarbandStore';
import { useGameStore } from '../stores/gameStore';
import { createSeededIdGen, cryptoIdGen, cryptoRng } from '../utils/seededRng';
import { resolveHeroPortrait } from '../utils/art/artMapping';
import { useCampaignGameBootstrap } from './hooks/useCampaignGameBootstrap';
import { useBossRuleEffects } from './hooks/useBossRuleEffects';
import {
  buildPetDataFromChessPiece,
  getArmyForOwner,
  getChessRealmClass,
  getCombatSlotMapping,
  getFinaleClass,
  getInitialGameOverSubPhase,
  getRealmDisplayName,
  getWinnerFromGameStatus,
  resolveVisualRealm,
} from './gameCoordinatorRules';

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
const PokerCombatPhase = lazy(() => import('../components/chess/phases/PokerCombatPhase'));
const ChessPhase = lazy(() => import('../components/chess/phases/ChessPhase'));
import '../components/chess/HeroPortraitEnhanced.css';
import '../components/chess/chess-realm-skins.css';
import '../components/chess/game-over-result.css';
import '../components/campaign/cinematic-crawl.css';

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

const RagnarokGameCoordinator: React.FC<RagnarokGameCoordinatorProps> = ({ initialArmy = null, opponentArmy: opponentArmyProp = null }) => {
  // Route-level MatchSetup wrappers populate this before mounting the
  // coordinator. The coordinator renders phases; it no longer decides which
  // public mode created the match.
  const ctx = useMatchStore((s) => s.activeMatch);

  const { playSoundEffect } = useAudio();
  const navigate = useNavigate();

  const campaignDifficultyFromStore = useCampaignStore(s => s.currentDifficulty);
  const clearCurrent = useCampaignStore(s => s.clearCurrent);
  const campaignMatch = useMemo(() => {
    if (ctx?.opponent.kind !== 'scripted') return null;
    if (ctx.opponent.script.kind !== 'campaign-mission') return null;
    return ctx.opponent.script;
  }, [ctx]);
  const campaignData = useMemo(
    () => campaignMatch
      ? { mission: campaignMatch.mission, chapter: campaignMatch.chapter }
      : null,
    [campaignMatch],
  );
  const campaignDifficulty = campaignMatch?.difficulty ?? campaignDifficultyFromStore;
  const isCampaign = campaignMatch !== null;

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
  // TD-19: in P2P mode, the host's `init` message (post seed-exchange) is the
  // authoritative source of board state. Local `initializeBoard` calls would
  // race against — and on the client overwrite — that authoritative state.
  // Gate every mount-time `initializeBoard` on this flag.
  const isP2PConnected = ctx?.opponent.kind === 'peer';
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

  const [playerArmy, setPlayerArmy] = useState<ArmySelectionType | null>(effectiveInitialArmy);
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
  const gameEndProcessedRef = useRef(false);
  const gameOverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    boardState,
    initializeBoard,
    pendingCombat,
    clearPendingCombat,
    resolveCombat,
    setSharedDeck,
    resetBoard,
    updatePieceStamina,
    updatePieceHealth,
    incrementAllStamina,
    setGameStatus,
    getValidMoves,
    nextTurn
  } = useChessCombatAdapter();

  const { initializeCombat, endCombat } = usePokerCombatAdapter();

  const opponentArmy = useMemo(() => {
    // P2P wire prop wins for peer matches — opponent army comes off
    // the wire and is not derivable from ctx alone.
    if (opponentArmyProp) return opponentArmyProp;
    // Fase 4 C8: derive from ctx via mode modules. ai → single builder
    // (default army), scripted → campaign builder (mission-specific).
    if (ctx) {
      const fromMode = deriveOpponentArmyForMode(ctx);
      if (fromMode) return fromMode;
    }
    return getDefaultArmySelection();
  }, [ctx, opponentArmyProp]);

  const missionRealm = isCampaign ? campaignData?.mission?.realm : undefined;
  const visualRealm = useMemo(() => resolveVisualRealm(missionRealm), [missionRealm]);
  const realmDisplayName = getRealmDisplayName(visualRealm);

  // Local-play gameState bootstrap (C5). gameStore module-load now returns
  // the empty deterministic shape; whoever drives a local match must call
  // `initGame()` to populate decks, hands, and hero powers. The
  // coordinator owns that responsibility for non-P2P modes (campaign,
  // warband, picker fallback). P2P matches are populated by the host via
  // `initGameWithSeed(matchSeed)` from `useWireSync` and adopted by the
  // client through the `init` envelope, so this effect bails on P2P.
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
    if (initialArmy || isCampaign) return;
    if (!warbandArmy) return;
    if (isP2PConnected) return;
    bootstrappedFromWarbandRef.current = true;
    initializeBoard(warbandArmy, opponentArmy, cryptoIdGen, warbandDeckLoadout);
    if (warbandDeck.length > 0) {
      setSharedDeck([...warbandDeck]);
    }
    playSoundEffect('game_start');
  }, [warbandArmy, warbandDeck, warbandDeckLoadout, isCampaign, initialArmy, opponentArmy, initializeBoard, setSharedDeck, playSoundEffect, isP2PConnected]);

  // P2P chess board bootstrap. Both peers compute identical piece ids
  // from `matchSeed + 'chess-pieces'`, so any future move reference (by
  // piece id) resolves to the same piece on each side.
  //
  // Pre-Fase-5 this effect also gated on `peerStore.p2pInitApplied` and
  // `gameStore.matchSeed` truthiness to defer until the host's `init`
  // envelope had been applied. <MatchSetupP2P/> (Fase 5 C11) makes both
  // guarantees BEFORE mounting this coordinator: it only renders
  // children once matchSeed + matchId + p2pInitApplied are populated.
  // The remaining guards are the local-mode fallthrough (`isP2PConnected`)
  // and the symmetric army-arrival check.
  const matchSeed = useGameStore(s => s.matchSeed);
  // Local viewer's canonical chess side (decided at handshake from
  // matchSeed parity). SP defaults to 'player' (human is first-mover).
  // Drives all viewer-relative presentation in this coordinator AND the
  // P2P board initialization (canonical first-mover army goes into
  // PLAYER_INITIAL_POSITIONS so both peers compute identical piece ids).
  const myCanonicalSide = useGameStore(s => s.myCanonicalSide) ?? 'player';
  const enemyCanonicalSide: 'player' | 'opponent' = myCanonicalSide === 'player' ? 'opponent' : 'player';
  const myWinStatus: 'player_wins' | 'opponent_wins' = myCanonicalSide === 'player' ? 'player_wins' : 'opponent_wins';
  const p2pBoardInitRef = useRef(false);
  useEffect(() => {
    if (p2pBoardInitRef.current) return;
    if (!isP2PConnected) return;
    if (!matchSeed) return;
    if (!initialArmy || !opponentArmy) return;
    p2pBoardInitRef.current = true;
    const idGen = createSeededIdGen(matchSeed, 'chess-pieces');
    // Canonical-frame init: the first-mover's army goes into the canonical
    // 'player' positions globally. Both peers must agree on which physical
    // army is the first-mover's. Map local `initialArmy`/`opponentArmy`
    // (viewer-relative props) to canonical (whiteArmy=first-mover) before
    // calling `initializeBoard`. Same idGen sequence on identical canonical
    // layout → identical piece ids on both peers.
    const canonicalPlayerArmy = myCanonicalSide === 'player' ? initialArmy : opponentArmy;
    const canonicalOpponentArmy = myCanonicalSide === 'player' ? opponentArmy : initialArmy;
    initializeBoard(canonicalPlayerArmy, canonicalOpponentArmy, idGen);
  }, [isP2PConnected, matchSeed, initialArmy, opponentArmy, initializeBoard, myCanonicalSide]);

  useCampaignGameBootstrap({
    isCampaign,
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
    playSoundEffect,
    startFlow,
  });

  const handleCinematicComplete = useCallback(() => {
    if (campaignData) {
      markCinematicSeen(campaignData.chapter.id);
    }
    // FSM reads `state.then` — set at cinematic entry — to decide whether
    // mission_intro or chess comes next. The sound cue still fires here
    // because the bare event has no payload context.
    dispatchFlow({ type: 'CINEMATIC_DONE' });
    if (!campaignData?.mission?.narrativeBefore) {
      playSoundEffect('game_start');
    }
  }, [playSoundEffect, campaignData, markCinematicSeen, dispatchFlow]);

  const handleMissionIntroComplete = useCallback(() => {
    dispatchFlow({ type: 'INTRO_DONE' });
    playSoundEffect('game_start');
  }, [playSoundEffect, dispatchFlow]);

  useBossRuleEffects({
    isCampaign,
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

    const freshAttacker = boardState.pieces.find(p => p.id === vsPieces.attacker.id) || vsPieces.attacker;
    const freshDefender = boardState.pieces.find(p => p.id === vsPieces.defender.id) || vsPieces.defender;
    const attacker = freshAttacker;
    const defender = freshDefender;

    debug.combat(`Attacker ${attacker.type} (${attacker.owner}): HP=${attacker.health}, Stamina=${attacker.stamina}`);
    debug.combat(`Defender ${defender.type} (${defender.owner}): HP=${defender.health}, Stamina=${defender.stamina}`);
    debug.combat(`First strike will be applied via animation in poker combat`);

    // Map local-viewer-relative props (`playerArmy` = my army, `opponentArmy`
    // = remote's army) into canonical positions (canonicalPlayerArmy =
    // first-mover's army globally) so `getArmyForOwner` can resolve a
    // canonical `owner` field correctly.
    const canonicalPlayerArmyForLookup = myCanonicalSide === 'player' ? playerArmy : opponentArmy;
    const canonicalOpponentArmyForLookup = myCanonicalSide === 'player' ? opponentArmy : (playerArmy ?? opponentArmy);
    const attackerArmy = getArmyForOwner(attacker.owner, canonicalPlayerArmyForLookup, canonicalOpponentArmyForLookup);
    const defenderArmy = getArmyForOwner(defender.owner, canonicalPlayerArmyForLookup, canonicalOpponentArmyForLookup);

    if (!attackerArmy || !defenderArmy) return;

    const attackerPet = buildPetDataFromChessPiece({
      piece: attacker,
      army: attackerArmy,
      resolvePortrait: resolveHeroPortrait,
    });
    const defenderPet = buildPetDataFromChessPiece({
      piece: defender,
      army: defenderArmy,
      resolvePortrait: resolveHeroPortrait,
    });

    debug.combat(`AttackerPet stamina: ${attackerPet.stats.currentStamina}/${attackerPet.stats.maxStamina}`);
    debug.combat(`DefenderPet stamina: ${defenderPet.stats.currentStamina}/${defenderPet.stats.maxStamina}`);

    const attackerName = attackerPet.name || `${attacker.owner === myCanonicalSide ? 'Player' : 'Opponent'} ${attacker.type}`;
    const defenderName = defenderPet.name || `${defender.owner === myCanonicalSide ? 'Player' : 'Opponent'} ${defender.type}`;

    // Pass king IDs to apply king passive aura buffs
    const attackerKingId = attackerArmy.king?.id;
    const defenderKingId = defenderArmy.king?.id;

    // (Realm background is now set earlier — see useEffect that watches
    //  campaignData.mission.realm. The chess phase needs the realm class
    //  applied before combat starts, not just at piece collision.)

    // Local viewer is the attacker when the chess attacker piece's
    // canonical owner matches our canonical side. Drives poker slot
    // orientation so MY piece always shows up in the "player" slot.
    const localViewerIsAttacker = attacker.owner === myCanonicalSide;
    const { slotsSwapped, firstStrikeTarget } = getCombatSlotMapping(localViewerIsAttacker);
    const deterministicCombat = matchSeed ? {
      combatId: createSeededIdGen(
        matchSeed,
        `poker-combat:${attacker.id}:${defender.id}:${attacker.position.row}:${attacker.position.col}:${defender.position.row}:${defender.position.col}:${boardState.moveCount}`,
      )(),
      deckSeed: `${matchSeed}:poker-deck:${attacker.id}:${defender.id}:${boardState.moveCount}`,
      playerRole: slotsSwapped ? 'defender' as const : 'attacker' as const,
    } : undefined;

    if (!slotsSwapped) {
      // Human attacks AI: Human (attacker) = player, AI (defender) = opponent
      // First strike target is 'opponent' (the defender in the player slot)
      setPokerSlotsSwapped(false);
      initializeCombat(
        attacker.id,
        attackerName,
        attackerPet,
        defender.id,
        defenderName,
        defenderPet,
        true,
        attackerKingId,
        defenderKingId,
        firstStrikeTarget,
        deterministicCombat
      );
    } else {
      // AI attacks Human: Human (defender) = player, AI (attacker) = opponent
      // Swap the parameters so human is always "player" in combat UI
      // First strike target is 'player' (the human defender)
      setPokerSlotsSwapped(true);
      initializeCombat(
        defender.id,
        defenderName,
        defenderPet,
        attacker.id,
        attackerName,
        attackerPet,
        true,
        defenderKingId,
        attackerKingId,
        firstStrikeTarget,
        deterministicCombat
      );
    }

    const handoff: CombatHandoff = {
      attacker,
      defender,
      playerArmy: attackerArmy,
      opponentArmy: defenderArmy,
      slotsSwapped,
      firstStrikeTarget,
    };
    dispatchFlow({ type: 'VS_COMPLETE', handoff });
    playSoundEffect('game_start');
  }, [flowState, playerArmy, opponentArmy, boardState.pieces, boardState.moveCount, initializeCombat, playSoundEffect, setPokerSlotsSwapped, dispatchFlow, matchSeed, myCanonicalSide]);

  const handleCombatEnd = useCallback((winner: 'player' | 'opponent' | 'draw') => {
    try {
      // Match-end already claimed by a victory effect that owns the FSM
      // transition into game_over. Dispatching COMBAT_RESOLVED here would
      // race the pending GAME_ENDED and flash chess in limbo.
      if (gameEndProcessedRef.current) {
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
        dispatchFlow({ type: 'COMBAT_RESOLVED' });
        playSoundEffect('turn_start');
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

      dispatchFlow({ type: 'COMBAT_RESOLVED' });
      playSoundEffect('turn_start');
    } catch (error) {
      debug.error('[handleCombatEnd] Error during combat resolution:', error);
      setPokerSlotsSwapped(false);
      endCombat();
      dispatchFlow({ type: 'COMBAT_RESOLVED' });
    }
  }, [pokerSlotsSwapped, resolveCombat, clearPendingCombat, endCombat, playSoundEffect, updatePieceStamina, updatePieceHealth, incrementAllStamina, nextTurn, setPokerSlotsSwapped, dispatchFlow, flowState?.tag]);

  // Chess-victory game-end pipeline. Fires when chess reaches checkmate /
  // stalemate / king-down (boardState.gameStatus). The cards-victory
  // pipeline (hero HP=0) lives in the next useEffect — they share
  // `gameEndProcessedRef` for idempotency so only the first signal wins.
  useEffect(() => {
    const winner = getWinnerFromGameStatus(boardState.gameStatus);
    if (!winner) return;
    if (gameEndProcessedRef.current) return;
    gameEndProcessedRef.current = true;

    // Chess uses the CANONICAL frame ('player' = first-mover globally).
    // deriveIWonForPhase encapsulates the comparison rule so it can't get
    // mixed up with the viewer-relative cards path below.
    const iWon = deriveIWonForPhase({
      kind: 'chess',
      canonicalWinner: winner,
      myCanonicalSide,
    });
    playSoundEffect(iWon ? 'victory' : 'defeat');
    gameOverTimerRef.current = setTimeout(() => {
      gameOverTimerRef.current = null;
      // Fase 4 C10 — mode-specific reward dispatch lives in match/modes/X/lifecycle.ts.
      // selectOnWinHandler picks campaign / single / p2p based on opponent.kind;
      // each handler is responsible for its own gating (iWon check, idempotency,
      // store dispatch). Pre-Fase-4 inline campaign logic moved verbatim into
      // match/modes/campaign/lifecycle.ts.
      if (ctx) {
        selectOnWinHandler(ctx)({ iWon, turnCount });
      }
      flushDailyQuestClaimsAfterMatch();
      const initialSub = getInitialGameOverSubPhase({
        iWon,
        isCampaign,
        campaignData,
      });
      dispatchFlow({ type: 'GAME_ENDED', initialSub });
    }, 1500);

    return () => {
      if (gameOverTimerRef.current) {
        clearTimeout(gameOverTimerRef.current);
        gameOverTimerRef.current = null;
      }
    };
    // Deps intentionally minimal: only the trigger signal + `playSoundEffect`.
    // `ctx`, `turnCount`, `myCanonicalSide`, etc. are read via stale closure
    // on purpose — they capture the values at the moment game-over was
    // detected, and gameEndProcessedRef ensures we only dispatch once anyway.
    // Adding them to the deps array would let mid-flight re-renders cancel
    // the 1.5s timer (cleanup runs on every re-render with new deps), losing
    // the dispatch entirely. eslint-disable to make the intent explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardState.gameStatus, playSoundEffect]);

  // Cards-victory match-end (hero HP=0 in cards combat). The 1.5s timeout
  // holds the GameOverScreen modal on screen before dispatching GAME_ENDED;
  // without it the FSM stays in 'poker_combat' and routes back to chess
  // in a limbo state (chess.gameStatus='playing' while cards declared
  // game-over). Shares gameEndProcessedRef with the chess-victory effect
  // above so only the first signal owns the lifecycle dispatch.
  const cardsGamePhase = useGameStore(s => s.gameState?.gamePhase);
  const cardsWinner = useGameStore(s => s.gameState?.winner);
  useEffect(() => {
    if (cardsGamePhase !== 'game_over') return;
    if (!cardsWinner || cardsWinner === 'draw') return;
    if (gameEndProcessedRef.current) return;
    gameEndProcessedRef.current = true;

    const iWon = deriveIWonForPhase({
      kind: 'cards',
      viewerWinner: cardsWinner,
    });
    playSoundEffect(iWon ? 'victory' : 'defeat');

    gameOverTimerRef.current = setTimeout(() => {
      gameOverTimerRef.current = null;
      if (ctx) {
        selectOnWinHandler(ctx)({ iWon, turnCount });
      }
      flushDailyQuestClaimsAfterMatch();
      const initialSub = getInitialGameOverSubPhase({
        iWon,
        isCampaign,
        campaignData,
      });
      dispatchFlow({ type: 'GAME_ENDED', initialSub });
    }, 1500);

    return () => {
      if (gameOverTimerRef.current) {
        clearTimeout(gameOverTimerRef.current);
        gameOverTimerRef.current = null;
      }
    };
    // Same minimal-deps discipline as the chess effect above: trigger
    // signals only, lifecycle inputs (ctx, turnCount) read via stale
    // closure intentionally so mid-flight re-renders cannot cancel the
    // dispatch timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardsGamePhase, cardsWinner, playSoundEffect]);

  useEffect(() => {
    if (flowState?.tag === 'chess' && boardState.currentTurn === 'player' && boardState.gameStatus === 'playing') {
      incrementPlayerTurn();
    }
  }, [flowState, boardState.currentTurn, boardState.gameStatus, incrementPlayerTurn]);

  // AI driver — fires only when the chess phase is active AND there's no
  // P2P match (the hook gates internally on `matchSeed`, see useChessAITurn
  // for the full contract).
  useChessAITurn({ enabled: flowState?.tag === 'chess' });

  useEffect(() => {
    if (pendingCombat && boardState.gameStatus === 'combat' && flowState?.tag === 'chess') {
      debug.chess('pendingCombat detected (AI attack), triggering combat flow');
      const { attacker, defender } = pendingCombat;

      dispatchFlow({ type: 'COMBAT_TRIGGERED', pieces: { attacker, defender } });
      playSoundEffect('card_draw');
    }
  }, [pendingCombat, boardState.gameStatus, flowState, playSoundEffect, dispatchFlow]);

  useEffect(() => {
    if (flowState?.tag === 'chess' && boardState.gameStatus === 'playing') {
      const currentSide = boardState.currentTurn;
      const pieces = boardState.pieces.filter(p => p.owner === currentSide);
      let hasValidMove = false;

      for (const piece of pieces) {
        const { moves, attacks } = getValidMoves(piece);
        if (moves.length > 0 || attacks.length > 0) {
          hasValidMove = true;
          break;
        }
      }

      if (!hasValidMove && pieces.length > 0) {
        const winnerStatus = currentSide === 'player' ? 'opponent_wins' : 'player_wins';
        debug.chess(`${currentSide} has no valid moves - stalemate, ${winnerStatus}`);
        setGameStatus(winnerStatus);
      }
    }
  }, [flowState, boardState.currentTurn, boardState.gameStatus, boardState.pieces, getValidMoves, setGameStatus]);

  const handleRestart = useCallback(() => {
    resetBoard();
    setPlayerArmy(null);
    setSharedDeck([]);
    resetPlayerTurnCount();
    gameEndProcessedRef.current = false;
    bootstrappedFromWarbandRef.current = false;
    clearFlow();
    if (isCampaign) {
      clearCurrent();
      // After clearCurrent, isCampaign becomes false on next render and the
      // /warband redirect guard catches us. The FSM bootstrap effect will
      // re-fire if a new mission is started later.
    } else {
      navigate(routes.warband);
    }
  }, [resetBoard, isCampaign, clearCurrent, navigate, resetPlayerTurnCount, clearFlow, setSharedDeck]);

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
    gameEndProcessedRef.current = false;
    const defaultArmy = getDefaultArmySelection();
    setPlayerArmy(defaultArmy);
    initializeBoard(defaultArmy, opponentArmy, cryptoIdGen);
    clearFlow();
    startFlow({ kind: 'chess' });
    playSoundEffect('game_start');
  }, [resetBoard, opponentArmy, initializeBoard, playSoundEffect, resetPlayerTurnCount, resetBossRulesApplied, clearFlow, startFlow]);

  const handleBattleMode = useCallback(() => {
    // Dev-only Battle Sandbox: pick a random local-side piece vs random enemy-side piece.
    const playerPieces = boardState.pieces.filter(p => p.owner === myCanonicalSide && p.type !== 'pawn' && p.type !== 'king');
    const opponentPieces = boardState.pieces.filter(p => p.owner === enemyCanonicalSide && p.type !== 'pawn' && p.type !== 'king');

    if (playerPieces.length === 0 || opponentPieces.length === 0) {
      debug.chess('BattleMode: Not enough pieces for test battle');
      return;
    }

    const attacker = playerPieces[Math.floor(cryptoRng() * playerPieces.length)];
    const defender = opponentPieces[Math.floor(cryptoRng() * opponentPieces.length)];

    dispatchFlow({ type: 'COMBAT_TRIGGERED', pieces: { attacker, defender } });
    playSoundEffect('card_draw');
  }, [boardState.pieces, playSoundEffect, dispatchFlow]);

  // Chess root carries the realm-{id} class so the chess phase board can
  // get its own thematic background per mission. CSS rules live in
  // chess-realm-skins.css. Chapter finale missions also get the
  // .mission-finale class which adds a pulsing crimson border + slower
  // music. CSS for finale lives in chess-realm-skins.css.
  const chessRealmClass = getChessRealmClass({ isCampaign, missionRealm, visualRealm });
  const finaleClass = getFinaleClass({ isCampaign, campaignData });

  // Guard: arriving at a gameplay route with no warband and not in campaign -> redirect to picker
  if (!effectiveInitialArmy && !isCampaign && !playerArmy) {
    return <Navigate to={routes.warband} replace />;
  }

  return (
    <div className={`ragnarok-chess-game w-full h-full overflow-hidden ${chessRealmClass} ${finaleClass}`.trim()}>
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
              isVictory={boardState.gameStatus === myWinStatus}
              sub={flowState.sub}
              playerTurnCount={turnCount}
              campaign={isCampaign && campaignData ? { mission: campaignData.mission, chapter: campaignData.chapter, difficulty: campaignDifficulty } : null}
              onCinematicEnd={() => dispatchFlow({ type: 'GAME_OVER_ADVANCE', nextSub: 'result' })}
              onBridgeEnd={() => { clearCurrent(); navigate(routes.campaign); }}
              onPrimaryAction={isCampaign ? handleBackToCampaign : handleRestart}
              onRetry={handleRetryMission}
            />
          )}
        </AnimatePresence>
      </Suspense>
    </div>
  );
};

export default RagnarokGameCoordinator;
