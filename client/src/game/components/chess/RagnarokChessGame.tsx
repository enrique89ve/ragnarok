import React, { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArmySelection as ArmySelectionType, ChessPiece } from '../../types/ChessTypes';
import { useChessCombatAdapter } from '../../hooks/useChessCombatAdapter';
import { getDefaultArmySelection, buildCombatDeck } from '../../data/ChessPieceConfig';
import { useCampaignStore, getMission } from '../../campaign';
import { buildCampaignArmy } from '../../campaign/campaignArmyBuilder';
import { Navigate, useNavigate } from 'react-router-dom';
import { routes } from '../../../lib/routes';
import ChessBoard from './ChessBoard';
import { usePokerCombatAdapter } from '../../hooks/usePokerCombatAdapter';
import { PetData, DEFAULT_PET_STATS, calculateStaminaFromHP } from '../../types/PokerCombatTypes';
import { useAudio } from '../../../lib/stores/useAudio';
import { v4 as uuidv4 } from 'uuid';
import { useKingChessAbility } from '../../hooks/useKingChessAbility';
import { useUnifiedCombatStore } from '../../stores/unifiedCombatStore';
import { useGameFlowStore } from '../../stores/gameFlowStore';
import type {
  PostCinematicPlan,
  GameResult,
  CombatHandoff,
} from '../../flow/round/types';
import { getKingAbilityConfig, getAbilityDescription, requiresDirectionSelection, getAvailableDirections, MineDirection } from '../../utils/chess/kingAbilityUtils';
import { Tooltip } from '../ui/Tooltip';
import { debug } from '../../config/debugConfig';
import { useGameStore } from '../../stores/gameStore';
import { useWarbandStore, selectArmy, selectDeckCardIds } from '../../../lib/stores/useWarbandStore';
import { useCraftingStore } from '../../crafting/craftingStore';
import { resolveHeroPortrait, DEFAULT_PORTRAIT } from '../../utils/art/artMapping';

/*
  Phase components are lazy-loaded so casual / multiplayer routes —
  which never enter cinematic / mission_intro / game_over — do not
  pull the briefing UI, framer-motion choreography, or campaign-only
  crawl player into their initial chunk.
*/
const CinematicPhase = lazy(() => import('./phases/CinematicPhase'));
const MissionIntroPhase = lazy(() => import('./phases/MissionIntroPhase'));
const GameOverPhase = lazy(() => import('./phases/GameOverPhase'));
const VsScreenPhase = lazy(() => import('./phases/VsScreenPhase'));
const PokerCombatPhase = lazy(() => import('./phases/PokerCombatPhase'));
import './HeroPortraitEnhanced.css';
import './chess-realm-skins.css';
import './game-over-result.css';
import '../campaign/cinematic-crawl.css';

type GamePhase = 'army_selection' | 'cinematic' | 'mission_intro' | 'chess' | 'vs_screen' | 'poker_combat' | 'game_over';

// Realm icon / color / text-color tables moved into MissionIntroPhase.tsx
// (their only consumer). The coordinator no longer carries them.

/*
  Maps every campaign mission realm to its closest visual realm. Norse
  realms map to themselves; non-Norse mythologies use the closest Norse
  proxy until we author dedicated art for each. The visual realm is what
  drives both the chess board background and the combat arena board skin.
  Used by RagnarokChessGame.tsx (this file) and consumed by realm-boards.css
  + .ragnarok-chess-game.realm-{id} CSS rules below.
*/
const REALM_VISUAL_MAP: Record<string, string> = {
	// Norse (direct art)
	ginnungagap: 'ginnungagap', midgard: 'midgard', asgard: 'asgard',
	niflheim: 'niflheim', muspelheim: 'muspelheim', helheim: 'helheim',
	jotunheim: 'jotunheim', alfheim: 'alfheim', vanaheim: 'vanaheim',
	svartalfheim: 'svartalfheim',
	// Greek → Norse visual proxies
	chaos: 'ginnungagap', gaia_earth: 'vanaheim', mount_othrys: 'jotunheim',
	tartarus: 'helheim', olympus: 'asgard', cilicia: 'muspelheim',
	phlegra: 'muspelheim', athens: 'midgard',
	// Egyptian → Norse visual proxies
	heliopolis: 'asgard', thebes: 'midgard', duat: 'helheim',
	memphis: 'svartalfheim', abydos: 'midgard',
	// Celtic → Norse visual proxies
	tara: 'vanaheim', emain_macha: 'midgard', cruachan: 'jotunheim',
	tir_na_nog: 'alfheim', mag_mell: 'alfheim',
	// Eastern → Norse visual proxies
	celestial_court: 'asgard', takamagahara: 'asgard',
	yomi: 'helheim', mount_meru: 'jotunheim', diyu: 'muspelheim',
};

const REALM_DISPLAY_NAMES: Record<string, string> = {
	ginnungagap: 'Ginnungagap', midgard: 'Midgard', asgard: 'Asgard',
	niflheim: 'Niflheim', muspelheim: 'Muspelheim', helheim: 'Helheim',
	jotunheim: 'Jotunheim', alfheim: 'Alfheim', vanaheim: 'Vanaheim',
	svartalfheim: 'Svartalfheim',
};

/** Resolve a campaign mission realm to its visual realm id. Falls back to midgard. */
function resolveVisualRealm(missionRealm: string | undefined | null): string {
	if (!missionRealm) return 'midgard';
	return REALM_VISUAL_MAP[missionRealm] || 'midgard';
}

interface HeroPortraitPanelProps {
  army: ArmySelectionType;
  side: 'player' | 'opponent';
  pieceCount?: number;
}

const HeroPortraitPanel: React.FC<HeroPortraitPanelProps> = ({ army, side, pieceCount }) => {
  const king = army.king;
  const kingPortrait = resolveHeroPortrait(king.id, king.portrait) ?? DEFAULT_PORTRAIT;
  const fallbackPortrait = DEFAULT_PORTRAIT;
  const safeFallback = DEFAULT_PORTRAIT;
  const isPlayer = side === 'player';

  return (
    <motion.div
      initial={{ opacity: 0, x: isPlayer ? -50 : 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={`flex flex-col items-center ${isPlayer ? 'mr-6' : 'ml-6'}`}
    >
      <div
        className={`hero-portrait-frame ${isPlayer ? 'hero-portrait-player' : 'hero-portrait-opponent'}`}
        data-element={king.element || (isPlayer ? 'holy' : 'shadow')}
      >
        <img
          src={kingPortrait}
          alt={king.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.src.includes(fallbackPortrait) && !target.src.startsWith('data:')) {
              target.src = fallbackPortrait;
            } else if (!target.src.startsWith('data:')) {
              target.src = safeFallback;
            }
          }}
          loading="lazy"
        />
      </div>

      <div className="hero-nameplate">
        <div className="hero-nameplate-text">{king.name}</div>
        <div className="hero-nameplate-subtitle">
          {isPlayer ? 'Aesir Commander' : 'Jotun Warlord'}
        </div>
      </div>

      {pieceCount !== undefined && (
        <div className={`chess-piece-count-shield mt-2 ${isPlayer ? 'chess-piece-count-player' : 'chess-piece-count-opponent'}`}>
          <span className="font-bold text-sm">{pieceCount}</span>
          <span className="text-[10px] opacity-60 ml-1">pieces</span>
        </div>
      )}
    </motion.div>
  );
};

interface PlayerPortraitProps {
  army: ArmySelectionType;
  pieceCount?: number;
}

const PlayerHeroPortrait: React.FC<PlayerPortraitProps> = ({ army, pieceCount }) => {
  const king = army.king;
  const kingPortrait = resolveHeroPortrait(king.id, king.portrait) ?? DEFAULT_PORTRAIT;
  const fallbackPortrait = DEFAULT_PORTRAIT;
  const safeFallback = DEFAULT_PORTRAIT;
  const [isCasting, setIsCasting] = useState(false);
  const prevMinesRef = useRef<number | null>(null);

  const {
    canPlaceMine,
    minesRemaining,
    isPlacementMode,
    selectedDirection,
    enterPlacementMode,
    exitPlacementMode,
    selectDirection
  } = useKingChessAbility('player');

  const kingId = king.id || '';
  const config = getKingAbilityConfig(kingId);
  const description = getAbilityDescription(kingId);
  const needsDirection = requiresDirectionSelection(kingId);
  const availableDirections = getAvailableDirections(kingId);

  useEffect(() => {
    if (prevMinesRef.current !== null && minesRemaining < prevMinesRef.current) {
      setIsCasting(true);
      const timer = setTimeout(() => setIsCasting(false), 900);
      prevMinesRef.current = minesRemaining;
      return () => clearTimeout(timer);
    }
    prevMinesRef.current = minesRemaining;
    return undefined;
  }, [minesRemaining]);

  const handlePortraitClick = () => {
    if (isPlacementMode) {
      exitPlacementMode();
    } else if (canPlaceMine) {
      enterPlacementMode();
    }
  };

  const isClickable = canPlaceMine || isPlacementMode;

  const tooltipContent = (
    <div className="portal-tooltip-content" style={{ borderColor: '#fbbf24', boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 20px rgba(251,191,36,0.25)' }}>
      <div className="portal-tooltip-header" style={{ color: '#fbbf24' }}>
        <span>Divine Command</span>
      </div>
      <div className="portal-tooltip-description">{description}</div>
      <div className="portal-tooltip-meta">
        <div style={{ color: '#fbbf24' }}>⚡ {minesRemaining}/5 uses</div>
        <div style={{ color: '#ef4444', marginTop: '4px' }}>💀 STA: -{config?.staPenalty || 2}</div>
        <div style={{ color: '#22d3ee', marginTop: '4px' }}>✨ Mana: +{config?.manaBoost || 1} next PvP</div>
        <div style={{ color: '#9ca3af', marginTop: '4px', fontStyle: 'italic' }}>Click portrait to {isPlacementMode ? 'cancel' : 'activate'}</div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="flex flex-col items-center mr-6"
    >
      <Tooltip content={tooltipContent} position="right" delay={400}>
        <div
          className={`hero-portrait-frame hero-portrait-player ${isClickable ? 'king-clickable' : ''} ${isPlacementMode ? 'king-placement-active' : ''} ${isCasting ? 'king-casting' : ''}`}
          data-element={king.element || 'holy'}
          onClick={handlePortraitClick}
          style={{ cursor: isClickable ? 'pointer' : 'default' }}
        >
          <img
            src={kingPortrait}
            alt={king.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.includes(fallbackPortrait) && !target.src.startsWith('data:')) {
                target.src = fallbackPortrait;
              } else if (!target.src.startsWith('data:')) {
                target.src = safeFallback;
              }
            }}
            loading="lazy"
          />

          <div className={`king-uses-badge ${minesRemaining === 0 ? 'king-uses-empty' : ''} ${isPlacementMode ? 'king-uses-active' : ''}`}>
            {minesRemaining}/5
          </div>

          <AnimatePresence>
            {isCasting && (
              <motion.div
                className="king-cast-burst"
                initial={{ opacity: 1, scale: 0.3 }}
                animate={{ opacity: 0, scale: 2.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            )}
          </AnimatePresence>
        </div>
      </Tooltip>

      <div className="hero-nameplate">
        <div className="hero-nameplate-text">{king.name}</div>
        <div className="hero-nameplate-subtitle">Aesir Commander</div>
      </div>

      {pieceCount !== undefined && (
        <div className="chess-piece-count-shield mt-2 chess-piece-count-player">
          <span className="font-bold text-sm">{pieceCount}</span>
          <span className="text-[10px] opacity-60 ml-1">pieces</span>
        </div>
      )}

      {needsDirection && isPlacementMode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-2 flex gap-1"
        >
          {availableDirections.map((dir) => (
            <button
              key={dir}
              onClick={() => selectDirection(dir)}
              className={`px-2 py-1 rounded text-xs font-semibold transition-all ${selectedDirection === dir ? 'bg-yellow-600 text-white border border-yellow-400' : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'}`}
            >
              {dir === 'horizontal' ? '↔' : dir === 'vertical' ? '↕' : dir === 'diagonal_up' ? '↗' : '↘'}
            </button>
          ))}
        </motion.div>
      )}

      {isPlacementMode && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 text-center">
          <div className="text-xs text-yellow-400">Click a tile to place trap</div>
        </motion.div>
      )}
    </motion.div>
  );
};


interface ChessPhaseContentProps {
  boardState: any;
  playerArmy: ArmySelectionType | null;
  opponentArmy: ArmySelectionType;
  handleCombatTriggered: (attackerId: string, defenderId: string) => void;
  handleBattleMode: () => void;
}

const ChessPhaseContent: React.FC<ChessPhaseContentProps> = ({
  boardState,
  playerArmy,
  opponentArmy,
  handleCombatTriggered,
  handleBattleMode
}) => {
  const { isPlacementMode } = useKingChessAbility('player');
  const playerPieceCount = boardState.pieces.filter((p: any) => p.owner === 'player').length;
  const opponentPieceCount = boardState.pieces.filter((p: any) => p.owner === 'opponent').length;
  
  return (
    <motion.div
      key="chess"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="w-full h-full flex flex-col items-center justify-center p-4"
    >
      <div className="mb-4 text-center">
        <h1 className="text-4xl font-bold" style={{ background: 'linear-gradient(180deg, #ffd700, #ff8c00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: 'none', filter: 'drop-shadow(0 2px 4px rgba(255, 165, 0, 0.5))' }}>Ragnarok Chess</h1>

      </div>
      
      <AnimatePresence>
        {boardState.inCheck && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="check-warning-banner mb-3"
          >
            CHECK! {boardState.inCheck === 'player' ? 'Your King is in danger!' : "Enemy King is threatened!"}
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex items-center justify-center">
        {playerArmy && (
          <PlayerHeroPortrait army={playerArmy} pieceCount={playerPieceCount} />
        )}

        <div className="relative flex flex-col items-center">
          <ChessBoard
            onCombatTriggered={handleCombatTriggered}
            disabled={isPlacementMode}
          />

          {boardState.inCheck === boardState.currentTurn && (
            <div className="mt-2 text-center text-sm">
              <p className="text-yellow-400 font-semibold">You must escape check! Move King, block, or capture the threat.</p>
            </div>
          )}
        </div>

        <HeroPortraitPanel army={opponentArmy} side="opponent" pieceCount={opponentPieceCount} />

        {import.meta.env.DEV && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleBattleMode();
            }}
            className="fixed bottom-2 left-2 z-hud opacity-20 hover:opacity-80 transition-opacity text-[10px] px-2 py-1 bg-gray-800/80 border border-gray-600/50 rounded text-gray-500 cursor-pointer"
            title="Developer battle sandbox"
          >
            Battle Sandbox
          </button>
        )}
      </div>
    </motion.div>
  );
};

interface RagnarokChessGameProps {
  onGameEnd?: (winner: 'player' | 'opponent') => void;
  initialArmy?: ArmySelectionType | null;
}

const RagnarokChessGame: React.FC<RagnarokChessGameProps> = ({ onGameEnd, initialArmy = null }) => {
  const { playSoundEffect } = useAudio();
  const navigate = useNavigate();

  const campaignMissionId = useCampaignStore(s => s.currentMission);
  const campaignDifficulty = useCampaignStore(s => s.currentDifficulty);
  const completeMission = useCampaignStore(s => s.completeMission);
  const clearCurrent = useCampaignStore(s => s.clearCurrent);
  const campaignData = campaignMissionId ? getMission(campaignMissionId) : null;
  const isCampaign = !!campaignData;

  const markCinematicSeen = useCampaignStore(s => s.markCinematicSeen);
  const cinematicAlreadySeen = useCampaignStore(s =>
    campaignData ? s.seenCinematics.includes(campaignData.chapter.id) : true
  );
  const hasCinematic = isCampaign && !!campaignData?.chapter?.cinematicIntro && !cinematicAlreadySeen;
  const warbandArmy = useWarbandStore(selectArmy);
  const warbandDeck = useWarbandStore(selectDeckCardIds);
  const effectiveInitialArmy: ArmySelectionType | null = initialArmy ?? warbandArmy;
  /*
    Round-level FSM (G4) — single source of truth for phase. The legacy
    GamePhase literal union is preserved as a derived view so existing
    `phase === 'X'` checks keep working until G5–G9 extract phase
    components and switch the renderer to read flowState directly.
  */
  const flowState = useGameFlowStore(s => s.current);
  const startFlow = useGameFlowStore(s => s.start);
  const dispatchFlow = useGameFlowStore(s => s.dispatch);
  const clearFlow = useGameFlowStore(s => s.clear);
  const phase: GamePhase = flowState === null ? 'army_selection' : flowState.tag;

  const [playerArmy, setPlayerArmy] = useState<ArmySelectionType | null>(effectiveInitialArmy);
  const [sharedDeckCardIds, setSharedDeckCardIds] = useState<number[]>(
    !initialArmy && warbandArmy && warbandDeck.length > 0 ? [...warbandDeck] : []
  );
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
    executeAITurn,
    updatePieceStamina,
    updatePieceHealth,
    incrementAllStamina,
    setGameStatus,
    getValidMoves,
    nextTurn
  } = useChessCombatAdapter();

  const { initializeCombat, endCombat, combatState } = usePokerCombatAdapter();

  const opponentArmy = useMemo(() => isCampaign
    ? buildCampaignArmy(campaignData!.mission)
    : getDefaultArmySelection(),
    [isCampaign, campaignData]);

  /*
    Set the active realm in the global game store as soon as we know the
    campaign mission. This drives both the chess board background skin
    (.ragnarok-chess-game.realm-{id} CSS rules) and the combat arena skin
    (.game-viewport.realm-{id} from realm-boards.css). Previously this
    only fired inside handleCombatTriggered, which meant the chess board
    rendered with no realm theming until pieces collided.
  */
  const missionRealm = isCampaign ? campaignData?.mission?.realm : undefined;
  const visualRealm = useMemo(() => resolveVisualRealm(missionRealm), [missionRealm]);
  useEffect(() => {
    if (!isCampaign || !missionRealm) return;
    useGameStore.getState().setGameState({
      activeRealm: {
        id: visualRealm,
        name: REALM_DISPLAY_NAMES[visualRealm] || visualRealm,
        description: '',
        owner: 'player',
        effects: [],
      }
    });
  }, [isCampaign, missionRealm, visualRealm]);

  const createPetFromChessPiece = useCallback((
    piece: typeof boardState.pieces[0],
    army: ArmySelectionType
  ): PetData => {
    const petClass: PetData['petClass'] = piece.type === 'queen' ? 'queen' : 
                piece.type === 'king' ? 'king' :
                piece.type === 'pawn' ? 'pawn' : 'standard';
    
    const baseStats = DEFAULT_PET_STATS[petClass];
    
    let heroName = piece.heroName || 'Unknown Warrior';
    let norseHeroId: string | undefined;
    if (piece.type !== 'pawn' && army[piece.type as keyof ArmySelectionType]) {
      const heroData = army[piece.type as keyof ArmySelectionType];
      heroName = heroData.name;
      norseHeroId = heroData.norseHeroId;
      debug.chess(`createPetFromChessPiece: piece.type=${piece.type}, heroData.name=${heroData.name}, heroData.norseHeroId=${heroData.norseHeroId}`);
    } else {
      debug.chess(`createPetFromChessPiece: Skipping norseHeroId - piece.type=${piece.type}, isPawn=${piece.type === 'pawn'}, hasArmyEntry=${!!army[piece.type as keyof ArmySelectionType]}`);
    }
    
    const heroPortrait = (norseHeroId ? resolveHeroPortrait(norseHeroId) : undefined) ?? DEFAULT_PORTRAIT;

    return {
      id: piece.id,
      name: heroName,
      imageUrl: heroPortrait || DEFAULT_PORTRAIT,
      rarity: piece.type === 'king' ? 'mythic' :
              piece.type === 'queen' ? 'epic' :
              piece.type === 'pawn' ? 'common' : 'rare',
      petClass,
      stats: {
        ...baseStats,
        element: 'neutral',
        currentHealth: piece.health,
        maxHealth: piece.maxHealth,
        maxStamina: calculateStaminaFromHP(piece.maxHealth),
        currentStamina: Math.min(piece.stamina, calculateStaminaFromHP(piece.maxHealth))
      },
      abilities: [],
      spellSlots: piece.hasSpells ? 10 : 0,
      equippedSpells: [],
      norseHeroId
    };
  }, []);

  // Initialize board if initialArmy is provided
  useEffect(() => {
    if (initialArmy && !playerArmy) {
      setPlayerArmy(initialArmy);
      initializeBoard(initialArmy, opponentArmy);
    }
  }, [initialArmy, opponentArmy, initializeBoard]);

  // Bootstrap from warband store when arriving via /warband flow.
  // Idempotent via ref so the board is initialized exactly once per mount.
  const bootstrappedFromWarbandRef = useRef(false);
  useEffect(() => {
    if (bootstrappedFromWarbandRef.current) return;
    if (initialArmy || isCampaign) return;
    if (!warbandArmy) return;
    bootstrappedFromWarbandRef.current = true;
    initializeBoard(warbandArmy, opponentArmy);
    if (warbandDeck.length > 0) {
      const deckCopy = [...warbandDeck];
      setSharedDeckCardIds(deckCopy);
      setSharedDeck(deckCopy);
    }
    playSoundEffect('game_start');
  }, [warbandArmy, warbandDeck, isCampaign, initialArmy, opponentArmy, initializeBoard, setSharedDeck, playSoundEffect]);

  /*
    Round FSM bootstrap (G4). Runs once per mount when flowState is null
    AND we have enough context to pick a starting phase. Re-runs after a
    restart that calls clearFlow(). The campaign auto-init effect below
    still mounts the default army + board state; the FSM only governs
    which phase the renderer is in.
  */
  useEffect(() => {
    if (flowState !== null) return;

    // Casual / multiplayer / explicit initialArmy → straight to chess.
    if (effectiveInitialArmy && !isCampaign) {
      startFlow({ kind: 'chess' });
      return;
    }

    if (!isCampaign || !campaignData) return;

    const intro = campaignData.chapter.cinematicIntro;
    const narrative = campaignData.mission.narrativeBefore;
    const planAfterCinematic: PostCinematicPlan = narrative
      ? {
          kind: 'intro',
          mission: {
            missionId: campaignData.mission.id,
            narrativeBefore: narrative,
            isChapterFinale: !!campaignData.mission.isChapterFinale,
          },
        }
      : { kind: 'chess' };

    if (hasCinematic && intro) {
      startFlow({
        kind: 'cinematic',
        cinematic: { chapterId: campaignData.chapter.id, intro },
        then: planAfterCinematic,
      });
    } else if (narrative) {
      startFlow({
        kind: 'mission_intro',
        mission: {
          missionId: campaignData.mission.id,
          narrativeBefore: narrative,
          isChapterFinale: !!campaignData.mission.isChapterFinale,
        },
      });
    } else {
      startFlow({ kind: 'chess' });
    }
  }, [flowState, effectiveInitialArmy, isCampaign, hasCinematic, campaignData, startFlow]);

  // Campaign auto-init: skip army selection, use default player army.
  // Phase selection lives in the FSM bootstrap effect above; this one just
  // ensures the board state has a default army when the player enters via
  // /campaign without picking one. Sound cue stays here because it's tied
  // to "match starts now" — fired only when no narrative gate precedes it.
  useEffect(() => {
    if (isCampaign && !playerArmy && !initialArmy) {
      const defaultArmy = getDefaultArmySelection();
      setPlayerArmy(defaultArmy);
      initializeBoard(defaultArmy, opponentArmy);
      resetBossRulesApplied();
      if (!hasCinematic && !campaignData?.mission?.narrativeBefore) {
        playSoundEffect('game_start');
      }
    }
  }, [
    campaignData,
    hasCinematic,
    initialArmy,
    initializeBoard,
    isCampaign,
    opponentArmy,
    playSoundEffect,
    playerArmy,
  ]);

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

  // Apply boss rules + difficulty scaling after board initialization (one-time)
  const bossRulesInitRef = useRef(false);
  useEffect(() => {
    if (!isCampaign || !campaignData) return;
    if (bossRulesApplied || bossRulesInitRef.current) return;

    const store = useUnifiedCombatStore.getState();
    if (store.boardState.pieces.length === 0) return;

    bossRulesInitRef.current = true;

    const rules = campaignData.mission.bossRules;
    // Mythic doubles its HP bonus and Heroic gets a 50% bump on top of the
    // baseline. Combined with profileToSmartAIConfig() which dials up the
    // AI's aggression on higher difficulties, mythic should now feel like
    // a real boss fight, not just "more HP." See campaignTypes.ts.
    const difficultyBonus = campaignDifficulty === 'mythic' ? 60 : campaignDifficulty === 'heroic' ? 30 : 0;
    const bossExtraHealth = rules.find(r => r.type === 'extra_health')?.value ?? 0;
    const totalExtraHealth = bossExtraHealth + difficultyBonus;

    let boostedPieces = [...store.boardState.pieces];

    if (totalExtraHealth > 0) {
      boostedPieces = boostedPieces.map(p => {
        if (p.owner !== 'opponent') return p;
        return { ...p, health: p.health + totalExtraHealth, maxHealth: p.maxHealth + totalExtraHealth };
      });
      debug.chess(`[Boss Rules] Applied +${totalExtraHealth} health to opponent (boss: ${bossExtraHealth}, difficulty: ${difficultyBonus})`);
    }

    const extraMana = rules.find(r => r.type === 'extra_mana')?.value ?? 0;
    if (extraMana > 0) {
      boostedPieces = boostedPieces.map(p => {
        if (p.owner !== 'opponent') return p;
        const maxStamina = Math.floor(p.maxHealth / 10) + extraMana;
        return { ...p, stamina: maxStamina };
      });
      debug.chess(`[Boss Rules] Applied +${extraMana} stamina to opponent pieces`);
    }

    const startMinion = rules.find(r => r.type === 'start_with_minion');
    if (startMinion) {
      const emptySpots = [];
      for (let col = 0; col < 5; col++) {
        if (!boostedPieces.some(p => p.position.row === 4 && p.position.col === col)) {
          emptySpots.push(col);
        }
      }
      if (emptySpots.length > 0) {
        const col = emptySpots[Math.floor(emptySpots.length / 2)];
        const pawnHealth = 100 + totalExtraHealth;
        boostedPieces.push({
          id: uuidv4(),
          type: 'pawn',
          owner: 'opponent',
          position: { row: 4, col },
          health: pawnHealth,
          maxHealth: pawnHealth,
          stamina: Math.floor(pawnHealth / 10),
          heroClass: 'warrior',
          heroName: 'Boss Minion',
          deckCardIds: [],
          fixedCards: [],
          hasSpells: false,
          hasMoved: false,
          element: 'neutral' as const,
        } as ChessPiece);
        debug.chess(`[Boss Rules] Spawned extra pawn at row 4, col ${col}`);
      }
    }

    useUnifiedCombatStore.setState({
      boardState: { ...store.boardState, pieces: boostedPieces },
    });

    markBossRulesApplied();
  }, [isCampaign, campaignData, bossRulesApplied, campaignDifficulty, markBossRulesApplied]);

  // Per-turn boss rules: passive_damage, bonus_draw, extra_mana
  // Combined into a single effect with a turn-tracking ref to prevent re-entry loops
  const lastBossRuleTurnRef = useRef<string>('');
  useEffect(() => {
    if (!isCampaign || !campaignData || phase !== 'chess') return;

    // Create a unique key for this turn to prevent re-firing
    const turnKey = `${boardState.currentTurn}-${turnCount}`;
    if (lastBossRuleTurnRef.current === turnKey) return;
    lastBossRuleTurnRef.current = turnKey;

    const rules = campaignData.mission.bossRules;

    // Passive damage: player king takes damage at start of player turn
    if (boardState.currentTurn === 'player') {
      const bossPassive = rules.find(r => r.type === 'passive_damage')?.value ?? 0;
      const difficultyPassive = campaignDifficulty === 'mythic' ? 1 : 0;
      const passiveDmg = bossPassive + difficultyPassive;
      if (passiveDmg > 0) {
        const store = useUnifiedCombatStore.getState();
        const playerKing = store.boardState.pieces.find(p => p.owner === 'player' && p.type === 'king');
        if (playerKing) {
          const newHp = Math.max(1, playerKing.health - passiveDmg);
          updatePieceHealth(playerKing.id, newHp);
          debug.chess(`[Boss Rules] Passive damage: player king takes ${passiveDmg} (HP: ${playerKing.health} → ${newHp})`);
        }
      }
    }

    // Bonus heal + extra mana: opponent pieces at start of opponent turn
    if (boardState.currentTurn === 'opponent') {
      const store = useUnifiedCombatStore.getState();
      let pieces = [...store.boardState.pieces];
      let storeChanged = false;

      // Bonus draw (heal most damaged opponent piece)
      const bonusDraw = rules.find(r => r.type === 'bonus_draw')?.value ?? 0;
      if (bonusDraw > 0) {
        const healAmount = bonusDraw * 15;
        const opponentPieces = pieces.filter(p => p.owner === 'opponent' && p.health < p.maxHealth);
        if (opponentPieces.length > 0) {
          const mostDamaged = opponentPieces.reduce((a, b) => (a.maxHealth - a.health) > (b.maxHealth - b.health) ? a : b);
          const healed = Math.min(mostDamaged.maxHealth, mostDamaged.health + healAmount);
          pieces = pieces.map(p => p.id === mostDamaged.id ? { ...p, health: healed } : p);
          storeChanged = true;
          debug.chess(`[Boss Rules] Bonus heal: ${mostDamaged.heroName} heals ${healAmount}`);
        }
      }

      // Extra mana (bonus stamina for opponent)
      const extraMana = rules.find(r => r.type === 'extra_mana')?.value ?? 0;
      if (extraMana > 0) {
        pieces = pieces.map(p => {
          if (p.owner !== 'opponent') return p;
          const maxStamina = Math.floor(p.maxHealth / 10) + extraMana;
          return { ...p, stamina: Math.min(p.stamina + extraMana, maxStamina) };
        });
        storeChanged = true;
        debug.chess(`[Boss Rules] Extra stamina: opponent +${extraMana}`);
      }

      // Single store update for all opponent-turn boss rules
      if (storeChanged) {
        useUnifiedCombatStore.setState({
          boardState: { ...store.boardState, pieces },
        });
      }
    }
  }, [phase, boardState.currentTurn, turnCount, isCampaign]);

  const { lastMineTriggered } = useKingChessAbility('player');

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
    
    const attackerArmy = attacker.owner === 'player' ? playerArmy : opponentArmy;
    const defenderArmy = defender.owner === 'player' ? playerArmy : opponentArmy;
    
    if (!attackerArmy || !defenderArmy) return;

    const attackerPet = createPetFromChessPiece(attacker, attackerArmy);
    const defenderPet = createPetFromChessPiece(defender, defenderArmy);
    
    debug.combat(`AttackerPet stamina: ${attackerPet.stats.currentStamina}/${attackerPet.stats.maxStamina}`);
    debug.combat(`DefenderPet stamina: ${defenderPet.stats.currentStamina}/${defenderPet.stats.maxStamina}`);

    const attackerName = attackerPet.name || `${attacker.owner === 'player' ? 'Player' : 'Opponent'} ${attacker.type}`;
    const defenderName = defenderPet.name || `${defender.owner === 'player' ? 'Player' : 'Opponent'} ${defender.type}`;

    // Pass king IDs to apply king passive aura buffs
    const attackerKingId = attackerArmy.king?.id;
    const defenderKingId = defenderArmy.king?.id;
    
    // (Realm background is now set earlier — see useEffect that watches
    //  campaignData.mission.realm. The chess phase needs the realm class
    //  applied before combat starts, not just at piece collision.)

    // FIX: Human player should ALWAYS be in the "player" slot for combat UI
    // When AI attacks human, swap parameters so human remains as "player"
    const humanIsAttacker = attacker.owner === 'player';
    
    const slotsSwapped = !humanIsAttacker;
    const firstStrikeTarget: 'player' | 'opponent' = humanIsAttacker ? 'opponent' : 'player';

    if (humanIsAttacker) {
      // Human attacks AI: Human (attacker) = player, AI (defender) = opponent
      // First strike target is 'opponent' (the defender in the player slot)
      setPokerSlotsSwapped(false);
      initializeCombat(
        uuidv4(),
        attackerName,
        attackerPet,
        uuidv4(),
        defenderName,
        defenderPet,
        true,
        attackerKingId,
        defenderKingId,
        firstStrikeTarget
      );
    } else {
      // AI attacks Human: Human (defender) = player, AI (attacker) = opponent
      // Swap the parameters so human is always "player" in combat UI
      // First strike target is 'player' (the human defender)
      setPokerSlotsSwapped(true);
      initializeCombat(
        uuidv4(),
        defenderName,
        defenderPet,
        uuidv4(),
        attackerName,
        attackerPet,
        true,
        defenderKingId,
        attackerKingId,
        firstStrikeTarget
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
  }, [flowState, playerArmy, opponentArmy, boardState.pieces, createPetFromChessPiece, initializeCombat, playSoundEffect, setPokerSlotsSwapped, dispatchFlow]);

  const handleCombatEnd = useCallback((winner: 'player' | 'opponent' | 'draw') => {
    try {
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
  }, [pokerSlotsSwapped, resolveCombat, clearPendingCombat, endCombat, playSoundEffect, updatePieceStamina, updatePieceHealth, incrementAllStamina, nextTurn, setPokerSlotsSwapped, dispatchFlow]);

  useEffect(() => {
    if (boardState.gameStatus !== 'player_wins' && boardState.gameStatus !== 'opponent_wins') return;
    if (gameEndProcessedRef.current) return;
    gameEndProcessedRef.current = true;

    const winner = boardState.gameStatus === 'player_wins' ? 'player' : 'opponent';
    playSoundEffect(winner === 'player' ? 'victory' : 'defeat');
    gameOverTimerRef.current = setTimeout(() => {
      gameOverTimerRef.current = null;
      if (isCampaign && winner === 'player' && campaignMissionId && campaignData) {
        completeMission(campaignMissionId, campaignDifficulty, turnCount);
        const alreadyClaimed = useCampaignStore.getState().rewardsClaimed.includes(campaignMissionId);
        if (!alreadyClaimed) {
          for (const reward of campaignData.mission.rewards) {
            if (reward.type === 'eitr' && reward.amount) {
              useCraftingStore.getState().addEitr(reward.amount);
            }
          }
          // Difficulty-locked bonus rewards
          if (campaignDifficulty === 'heroic') {
            useCraftingStore.getState().addEitr(50);
          } else if (campaignDifficulty === 'mythic') {
            useCraftingStore.getState().addEitr(150);
          }
          useCampaignStore.getState().claimReward(campaignMissionId);
          debug.chess(`[Campaign] Rewards distributed for ${campaignMissionId} (${campaignDifficulty})`);
        }
      }
      // Decide which sub-phase of game_over to enter:
      //   - victory + has victoryCinematic → 'cinematic' (play it first)
      //   - defeat + has defeatCinematic   → 'cinematic'
      //   - else → 'result' immediately
      const wonCampaign = winner === 'player' && isCampaign && campaignData;
      const lostCampaign = winner !== 'player' && isCampaign && campaignData;
      const hasVictoryCinematic = wonCampaign && (campaignData?.mission?.victoryCinematic?.length ?? 0) > 0;
      const hasDefeatCinematic = lostCampaign && (campaignData?.mission?.defeatCinematic?.length ?? 0) > 0;
      const initialSub: 'cinematic' | 'result' = hasVictoryCinematic || hasDefeatCinematic ? 'cinematic' : 'result';
      const result: GameResult = {
        winner,
        playerTurnCount: turnCount,
        victoryCinematic: campaignData?.mission?.victoryCinematic ?? null,
        defeatCinematic: campaignData?.mission?.defeatCinematic ?? null,
        storyBridge: campaignData?.mission?.storyBridge ?? null,
      };
      dispatchFlow({ type: 'GAME_ENDED', result, initialSub });
      if (onGameEnd) {
        onGameEnd(winner);
      }
    }, 1500);

    return () => {
      if (gameOverTimerRef.current) {
        clearTimeout(gameOverTimerRef.current);
        gameOverTimerRef.current = null;
      }
    };
  }, [boardState.gameStatus, onGameEnd, playSoundEffect]);

  useEffect(() => {
    if (phase === 'chess' && boardState.currentTurn === 'player' && boardState.gameStatus === 'playing') {
      incrementPlayerTurn();
    }
  }, [phase, boardState.currentTurn, boardState.gameStatus, incrementPlayerTurn]);

  useEffect(() => {
    if (phase === 'chess' && boardState.currentTurn === 'opponent' && boardState.gameStatus === 'playing') {
      const aiDelay = setTimeout(() => {
        executeAITurn();
      }, 1000);
      return () => clearTimeout(aiDelay);
    }
    return undefined;
  }, [phase, boardState.currentTurn, boardState.gameStatus, executeAITurn]);

  useEffect(() => {
    if (pendingCombat && boardState.gameStatus === 'combat' && phase === 'chess') {
      debug.chess('pendingCombat detected (AI attack), triggering combat flow');
      const { attacker, defender } = pendingCombat;

      dispatchFlow({ type: 'COMBAT_TRIGGERED', pieces: { attacker, defender } });
      playSoundEffect('card_draw');
    }
  }, [pendingCombat, boardState.gameStatus, phase, playSoundEffect, dispatchFlow]);

  useEffect(() => {
    if (phase === 'chess' && boardState.gameStatus === 'playing') {
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
  }, [phase, boardState.currentTurn, boardState.gameStatus, boardState.pieces.length]);

  const handleRestart = useCallback(() => {
    resetBoard();
    setPlayerArmy(null);
    setSharedDeckCardIds([]);
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
  }, [resetBoard, isCampaign, clearCurrent, navigate, resetPlayerTurnCount, clearFlow]);

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
      boardState.gameStatus === 'player_wins' &&
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
    initializeBoard(defaultArmy, opponentArmy);
    clearFlow();
    startFlow({ kind: 'chess' });
    playSoundEffect('game_start');
  }, [resetBoard, opponentArmy, initializeBoard, playSoundEffect, resetPlayerTurnCount, resetBossRulesApplied, clearFlow, startFlow]);

  const handleBattleMode = useCallback(() => {
    const playerPieces = boardState.pieces.filter(p => p.owner === 'player' && p.type !== 'pawn' && p.type !== 'king');
    const opponentPieces = boardState.pieces.filter(p => p.owner === 'opponent' && p.type !== 'pawn' && p.type !== 'king');
    
    if (playerPieces.length === 0 || opponentPieces.length === 0) {
      debug.chess('BattleMode: Not enough pieces for test battle');
      return;
    }
    
    const attacker = playerPieces[Math.floor(Math.random() * playerPieces.length)];
    const defender = opponentPieces[Math.floor(Math.random() * opponentPieces.length)];
    
    dispatchFlow({ type: 'COMBAT_TRIGGERED', pieces: { attacker, defender } });
    playSoundEffect('card_draw');
  }, [boardState.pieces, playSoundEffect, dispatchFlow]);

  // Chess root carries the realm-{id} class so the chess phase board can
  // get its own thematic background per mission. CSS rules live in
  // chess-realm-skins.css. Chapter finale missions also get the
  // .mission-finale class which adds a pulsing crimson border + slower
  // music. CSS for finale lives in chess-realm-skins.css.
  const chessRealmClass = isCampaign && missionRealm ? `realm-${visualRealm}` : '';
  const isFinale = isCampaign && campaignData?.mission?.isChapterFinale;
  const finaleClass = isFinale ? 'mission-finale' : '';

  // Guard: arriving at /game with no warband and not in campaign → redirect to picker
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
          {phase === 'chess' && (
            <ChessPhaseContent
              boardState={boardState}
              playerArmy={playerArmy}
              opponentArmy={opponentArmy}
              handleCombatTriggered={handleCombatTriggered}
              handleBattleMode={handleBattleMode}
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
              isVictory={boardState.gameStatus === 'player_wins'}
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

export default RagnarokChessGame;
