import React, { useEffect, useId, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePokerCombatAdapter, getActionPermissions, getPokerCombatAdapterState } from '../hooks/usePokerCombatAdapter';
import { useGameStore } from '../stores/gameStore';
import { useP2PActions } from '../context/useP2PActions';
import { GAME_COMMAND_TYPES } from '../core/commands';
import { usePeerStore } from '../stores/peerStore';
import { useMatchStore } from '../match/store';
import {
  CombatPhase,
  CombatAction,
  PokerCard,
  PokerHandRank,
  type PetData,
  type ElementType,
} from '../types/PokerCombatTypes';
import { evaluatePokerHand } from '../stores/combat/pokerCombatSlice';
import { MulliganScreen } from '../components/MulliganScreen';
import { adaptCardInstance } from '../utils/cards/cardInstanceAdapter';
import { Position } from '../types/Position';
import { TargetingOverlay } from '../components/TargetingOverlay';
import { CardBurnOverlay } from '../components/CardBurnOverlay';
import { ActionAnnouncement } from '../components/ActionAnnouncement';
import { CombatFeedbackStack } from './components/CombatFeedbackStack';
import '../poker/styles/poker.css';
import AIAttackAnimationProcessor from '../components/AIAttackAnimationProcessor';
import { PixiParticleCanvas } from '../animations/PixiParticleCanvas';

import { AnimationOverlay } from '../components/AnimationOverlay';
import { ShowdownCelebration } from './components/ShowdownCelebration';
import { TargetingPrompt } from './components/TargetingPrompt';
import { HeroPowerPrompt } from './components/HeroPowerPrompt';
import { DamageIndicator } from './components/DamageIndicator';
import { GameOverScreen } from './components/GameOverScreen';
import { GameHUD } from './components/GameHUD';
import { HeroDeathAnimation } from './components/HeroDeathAnimation';
import HeroGearPanel from './components/HeroGearPanel';
import { ElementBuffPopup } from './components/ElementBuffPopup';
import { ElementMatchupBanner } from './components/ElementMatchupBanner';
import { FirstStrikeAnimation } from './components/FirstStrikeAnimation';
import { PhaseBanner } from './components/PhaseBanner';
import { useElementalBuff } from './hooks/useElementalBuff';
import { GameViewport } from './GameViewport';
import { useSettingsStore } from '../stores/settingsStore';
import { useRagnarokCombatController } from './hooks/useRagnarokCombatController';
import { HeroBattlePopup } from './components/HeroBattlePopup';
import { KingPassivePopup } from './components/KingPassivePopup';
import type { ShowdownCelebration as ShowdownCelebrationState } from './hooks/useCombatEvents';
import { GameLog } from '../components/GameLog';
import { useGameLogIntegration } from '../hooks/useGameLogIntegration';
import { usePokerDrama } from './hooks/usePokerDrama';
import { registerPokerDramaVisualEffects } from './vfx/handlers/pokerDramaHandlers';
import { HandStrengthIndicator } from './components/HandStrengthIndicator';
import { useEventAnimationBridge } from '../hooks/useEventAnimationBridge';
import { useKingPassiveEventStore } from '../stores/kingPassiveEventStore';
import { useDamageAnimations } from './hooks/useDamageAnimations';
import type { HealthSnapshot } from './hooks/useDamageAnimations';
import { usePokerCardClickHandlers } from './hooks/usePokerCardClickHandlers';
import { usePokerKeyboardShortcuts } from './hooks/usePokerKeyboardShortcuts';
import { useRealmAnnouncement } from './hooks/useRealmAnnouncement';
import { useHeroHealthEffects } from './hooks/useHeroHealthEffects';
import { readViewerCombatHeroHp } from './combatHeroHp';
import { useAudio } from '../../lib/stores/useAudio';
import { BossPhaseFlash } from './components/BossPhaseFlash';
import { BettingPanel } from './components/BettingPanel';
import { PokerSpellTray } from './components/PokerSpellTray';
import { useUnifiedCombatStore } from '../stores/unifiedCombatStore';
import { PokerP2PTurnStatus } from './components/PokerP2PTurnStatus';
import type { BossPhaseFlash as BossPhaseFlashKind } from '../campaign/campaignTypes';
import { useBossPhases } from './hooks/useBossPhases';
import { getWagerDescription } from './data/wagerDescriptions';
import { OpponentZone } from './zones/OpponentZone';
import { BoardZone } from './zones/BoardZone';
import { PlayerZone } from './zones/PlayerZone';
import { MinionField } from './zones/MinionField';
import { ARENA_VFX_LAYERS, arenaVfxLayerProps } from './arenaVfxTargets';
import { POKER_VIEWPORT_LAYOUT_STYLE, POKER_VIEWPORT_SAFE_AREA } from '../poker';
import { useCampaignStore, getMission } from '../campaign';
import { isBettingPhase } from './modules/PhaseManager';
import { resolveHeroPortrait } from '../utils/art/artMapping';
import { getHeroFeud } from '../pvp/pvpData';
import type { CardInstance, RealmEffect } from '../types';
import { derivePokerDecisionView } from './decision/pokerDecisionView';
import { BattlefieldCardInspector } from './components/BattlefieldCardInspector';
import type { CardInspectorSource } from './cardInspector/cardInspectorModel';
import { resolveBattlefieldCardClickIntent, type BattlefieldCardSide } from './cardInspector/battlefieldCardIntent';
import { GameIcon } from '../utils/ui/GameIcon';
import type { IconName } from '../utils/ui/iconMap';

const PHASE_LABELS: Partial<Record<CombatPhase, string>> = {
	[CombatPhase.MULLIGAN]: 'Mulligan',
	[CombatPhase.PRE_FLOP]: 'First Blood',
	[CombatPhase.FAITH]: 'Faith',
	[CombatPhase.FORESIGHT]: 'Foresight',
	[CombatPhase.DESTINY]: 'Destiny',
	[CombatPhase.RESOLUTION]: 'Showdown',
	[CombatPhase.FIRST_STRIKE]: 'First Strike',
};

// WAGER_DESCRIPTIONS map moved to client/src/game/combat/data/wagerDescriptions.ts
// for sharing with future components (was previously duplicated across

const BATTLE_INTEL_GLYPHS = {
	buff_all_attack: 'swords',
	debuff_all_attack: 'arrowDown',
	damage_all_end_turn: 'flame',
	heal_all_start_turn: 'heart',
	cost_increase: 'gem',
	keyword_grant: 'sparkles',
	return_to_hand_on_death: 'refresh',
	banish_on_death: 'skull',
	stealth_on_play: 'eye',
	debuff_all_health: 'arrowDown',
} as const satisfies Record<RealmEffect['type'], IconName>;

function getBattleIntelGlyph(effectType: RealmEffect['type']): IconName {
	return BATTLE_INTEL_GLYPHS[effectType];
}

type WagerEffectCard = {
	wagerEffect?: {
		type?: string;
	};
};

type CombatZonePosition = {
	row?: number;
	col?: number;
};

type ExtendedCardData = CardInstance['card'] & {
	health?: number;
	attack?: number;
	petStage?: string;
	evolvesFrom?: number;
	petFamily?: string;
};

function asExtendedCardData(card: CardInstance['card']): ExtendedCardData {
	return card as ExtendedCardData;
}

function getCombatUnitHealth(card: CardInstance): number {
	return asExtendedCardData(card.card).health ?? card.currentHealth ?? 0;
}

function getCombatHeroClass(combatant: unknown): string | undefined {
	if (!combatant || typeof combatant !== 'object') {
		return undefined;
	}

	return (combatant as { heroClass?: string }).heroClass;
}

function getCombatElement(element?: ElementType | string): ElementType {
	return (element as ElementType | undefined) ?? 'neutral';
}

// FACEDOWN_PLACEHOLDER_CARD moved to utils/combatArenaUtils.ts (consumed by BoardZone).

interface RagnarokCombatArenaProps {
  onCombatEnd?: (winner: 'player' | 'opponent' | 'draw') => void;
}

// DamageAnimation and HealthSnapshot types imported from hooks/useDamageAnimations

// ========================================
// UNIFIED COMBAT ARENA - Merges PokerPanel + BattlefieldPanel
// ========================================
interface UnifiedCombatArenaProps {
  // Poker action handlers
  onAction: (action: CombatAction, hp?: number) => void;
  onEndTurn: () => void;
  betAmount: number;
  setBetAmount: (val: number) => void;
  showdownCelebration?: ShowdownCelebrationState | null;
  // Hero targeting
  onOpponentHeroClick?: () => void;
  onPlayerHeroClick?: () => void;
  isOpponentTargetable?: boolean;
  isPlayerTargetable?: boolean;
  // Mana display
  playerMana: number;
  playerMaxMana: number;
  opponentMana: number;
  opponentMaxMana: number;
  // Hero props
  playerPet?: PetData;
  opponentPet?: PetData;
  playerHpCommitted?: number;
  opponentHpCommitted?: number;
  playerLevel?: number;
  opponentLevel?: number;
  playerSecrets?: CardInstance[];
  playerHeroClass?: string;
  // Hero power
  onHeroPowerClick?: () => void;
  onWeaponUpgradeClick?: () => void;
  isWeaponUpgraded?: boolean;
  heroPowerTargeting?: {
    active: boolean;
    norseHeroId: string;
    targetType: string;
    effectType: string;
    value: number;
    secondaryValue?: number;
    powerName: string;
    heroName: string;
    manaCost: number;
  } | null;
  executeHeroPowerEffect?: (norseHero: unknown, heroPower: unknown, target: unknown) => void;
  // Hand props
  handCards?: CardInstance[];
  handCurrentMana?: number;
  handIsPlayerTurn?: boolean;
  onCardPlay?: (card: CardInstance, position?: CombatZonePosition) => void;
	  registerCardPosition?: (card: CardInstance, position: Position) => void;
  battlefieldRef?: React.RefObject<HTMLDivElement | null>;
  // Boss dialogue (campaign mode only) — owned by parent RagnarokCombatArena
  bossQuipText?: string | null;
  bossQuipKey?: number;
  bossPortrait?: string;
}

const UnifiedCombatArena: React.FC<UnifiedCombatArenaProps> = ({
  onAction, betAmount, setBetAmount, showdownCelebration,
  onOpponentHeroClick, onPlayerHeroClick, isOpponentTargetable = false, isPlayerTargetable = false,
  playerMana, playerMaxMana, opponentMana, opponentMaxMana,
  playerPet, opponentPet, playerHpCommitted = 0, opponentHpCommitted = 0,
  playerLevel = 1, opponentLevel = 1, playerSecrets = [], playerHeroClass = 'neutral',
  onHeroPowerClick, onWeaponUpgradeClick, isWeaponUpgraded = false,
  heroPowerTargeting, executeHeroPowerEffect,
  handCards = [], handCurrentMana = 0, handIsPlayerTurn = false,
	  onCardPlay, registerCardPosition, battlefieldRef: externalBattlefieldRef,
  bossQuipText = null, bossQuipKey = 0, bossPortrait,
}) => {
  const noopRegisterCardPosition = useCallback(() => {}, []);

  // Subscribe directly to adapter for reactive updates
  const { combatState } = usePokerCombatAdapter();
  
  // Game state for battlefield — use individual selectors to avoid unnecessary re-renders
  const gameState = useGameStore(s => s.gameState);
  const selectAttacker = useGameStore(s => s.selectAttacker);
	const selectedHandCard = useGameStore(s => s.selectedCard);
	const p2pActions = useP2PActions();
	const activeMatch = useMatchStore(s => s.activeMatch);
	const connectionState = usePeerStore(s => s.connectionState);

	const cardGameIsPlayerTurn = gameState?.currentTurn === 'player';
	const isP2PCombat = activeMatch?.opponent.kind === 'peer';
  const pendingPokerSpells = useUnifiedCombatStore(state => state.pendingPokerSpells);
  const hasQueuedPokerSpells = (pendingPokerSpells?.length ?? 0) > 0;

  const [communityCardsRevealed, setCommunityCardsRevealed] = useState(false);
  const [showGearPanel, setShowGearPanel] = useState(false);
  const [inspectedCard, setInspectedCard] = useState<{
    readonly card: CardInstance;
    readonly source: CardInspectorSource;
  } | null>(null);

  useEffect(() => {
    if (!combatState?.phase) return;
    const phase = combatState.phase;
		if (phase === CombatPhase.MULLIGAN || phase === CombatPhase.PRE_FLOP) {
      setCommunityCardsRevealed(false);
    } else if (phase === CombatPhase.FAITH || phase === CombatPhase.FORESIGHT || phase === CombatPhase.DESTINY || phase === CombatPhase.RESOLUTION) {
      setCommunityCardsRevealed(true);
    }
  }, [combatState?.phase]);

  const wrappedOnAction = useCallback((action: CombatAction, hp?: number) => {
    setCommunityCardsRevealed(true);
    onAction(action, hp);
  }, [onAction]);
  
  // Refs for battlefield
  const internalBattlefieldRef = useRef<HTMLDivElement>(null);
  const battlefieldRef = externalBattlefieldRef || internalBattlefieldRef;

  // Extracted hooks
  const {
    damageAnimations,
    shakingTargets,
    prevHealthRef,
    triggerDamageAnimation,
    removeDamageAnimation,
    addShakingTarget,
  } = useDamageAnimations();

  usePokerKeyboardShortcuts({ betAmount, onAction, setCommunityCardsRevealed });
  
  // Battlefield card data
  const playerBattlefield = useMemo(() => {
    const cards = (gameState?.players?.player?.battlefield ?? []) as CardInstance[];
    return cards.map(card => adaptCardInstance(card));
  }, [gameState?.players?.player?.battlefield]);
  
  const opponentBattlefield = useMemo(() => {
    const cards = (gameState?.players?.opponent?.battlefield ?? []) as CardInstance[];
    return cards.map(card => adaptCardInstance(card));
  }, [gameState?.players?.opponent?.battlefield]);
  
  const evolveReadyIds = useMemo(() => {
    const ids = new Set<string>();
    const bf = (gameState?.players?.player?.battlefield ?? []) as CardInstance[];
    if (bf.length === 0 || handCards.length === 0) return ids;
    const readyPets = bf.filter(card => card.petEvolutionMet === true);
    if (readyPets.length === 0) return ids;
    for (const hc of handCards) {
      const cd = asExtendedCardData(hc.card);
      if (cd?.petStage === 'adept' && cd.evolvesFrom) {
        if (readyPets.some(card => card.card?.id === cd.evolvesFrom)) ids.add(hc.instanceId);
      } else if (cd?.petStage === 'master' && cd.petFamily) {
        if (readyPets.some(card => {
          const readyCardData = asExtendedCardData(card.card);
          return readyCardData.petFamily === cd.petFamily && readyCardData.petStage === 'adept';
        })) ids.add(hc.instanceId);
      }
    }
    return ids;
  }, [gameState?.players?.player?.battlefield, handCards]);

  const opponentSecrets = gameState?.players?.opponent?.secrets || [];
  const opponentHeroClass = gameState?.players?.opponent?.heroClass || 'neutral';
  
  const enrichedPlayerPet = useMemo(() => {
    if (!playerPet || !combatState) return playerPet;
    return {
      ...playerPet,
      stats: {
        ...playerPet.stats,
        armor: combatState.player.heroArmor || 0
      }
    };
  }, [playerPet, combatState?.player?.heroArmor]);

  const enrichedOpponentPet = useMemo(() => {
    if (!opponentPet || !combatState) return opponentPet;
    return {
      ...opponentPet,
      stats: {
        ...opponentPet.stats,
        armor: combatState.opponent.heroArmor || 0
      }
    };
  }, [opponentPet, combatState?.opponent?.heroArmor]);

  const rawAttackingCard = useGameStore(s => s.attackingCard);
  const attackingCard = useMemo(() => {
    return rawAttackingCard ? adaptCardInstance(rawAttackingCard as CardInstance) : null;
  }, [rawAttackingCard]);

  const basePermissions = useMemo(
    () => getActionPermissions(combatState, true),
    [combatState]
  );
  const pokerDecisionView = useMemo(
    () => derivePokerDecisionView({
      combatState,
      connectionState,
      isP2PCombat,
      permissions: basePermissions,
    }),
    [combatState, connectionState, isP2PCombat, basePermissions]
  );
  const isPlayerTurn = combatState
    ? pokerDecisionView.localCanAct
    : cardGameIsPlayerTurn;

  // Health change detection — triggers floating damage/heal numbers
  useEffect(() => {
    if (!gameState) return;
    const player = gameState.players.player;
    const opponent = gameState.players.opponent;
    const playerCombatHp = readViewerCombatHeroHp(combatState, 'player');
    const opponentCombatHp = readViewerCombatHeroHp(combatState, 'opponent');

      const currentSnapshot: HealthSnapshot = {
      playerHeroHealth: playerCombatHp?.current ?? player.heroHealth ?? player.health,
      playerHeroArmor: combatState?.player.heroArmor ?? player.heroArmor ?? 0,
      opponentHeroHealth: opponentCombatHp?.current ?? opponent.heroHealth ?? opponent.health,
      opponentHeroArmor: combatState?.opponent.heroArmor ?? opponent.heroArmor ?? 0,
      playerMinions: new Map(player.battlefield.map(m => [m.instanceId, getCombatUnitHealth(m)])),
      opponentMinions: new Map(opponent.battlefield.map(m => [m.instanceId, getCombatUnitHealth(m)]))
    };

    const prev = prevHealthRef.current;
    if (prev) {
      const getHeroPos = (selector: string) => {
        const isPlayer = selector.includes('player');
        const selectors = isPlayer
          ? ['[data-hero-role="player"] .battlefield-hero-square', '[data-hero-role="player"]', '.poker-hero-container']
          : ['[data-hero-role="opponent"] .battlefield-hero-square', '[data-hero-role="opponent"]', '.opponent-hero-container'];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 3 };
            }
          }
        }
        return isPlayer
          ? { x: 120, y: window.innerHeight * 0.75 }
          : { x: 120, y: window.innerHeight * 0.15 };
      };

      const getMinionPos = (id: string) => {
        const el = document.querySelector(`[data-instance-id="${id}"]`) ||
                   document.querySelector(`[data-card-id="${id}"]`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 3 };
          }
        }
        return null;
      };

      const playerDiff = prev.playerHeroHealth - currentSnapshot.playerHeroHealth;
      if (playerDiff > 0) {
        const pos = getHeroPos('.player-hero');
        triggerDamageAnimation('player-hero', playerDiff, pos.x, pos.y);
      } else if (playerDiff < 0) {
        const pos = getHeroPos('.player-hero');
        triggerDamageAnimation('player-hero', Math.abs(playerDiff), pos.x, pos.y, true);
      }

      const opponentDiff = prev.opponentHeroHealth - currentSnapshot.opponentHeroHealth;
      if (opponentDiff > 0) {
        const pos = getHeroPos('.opponent-hero');
        triggerDamageAnimation('opponent-hero', opponentDiff, pos.x, pos.y);
      } else if (opponentDiff < 0) {
        const pos = getHeroPos('.opponent-hero');
        triggerDamageAnimation('opponent-hero', Math.abs(opponentDiff), pos.x, pos.y, true);
      }

      for (const [id, prevHp] of prev.playerMinions) {
        const currHp = currentSnapshot.playerMinions.get(id);
        if (currHp !== undefined && prevHp > currHp) {
          const pos = getMinionPos(id);
          if (pos) triggerDamageAnimation(id, prevHp - currHp, pos.x, pos.y);
        }
      }
      for (const [id, prevHp] of prev.opponentMinions) {
        const currHp = currentSnapshot.opponentMinions.get(id);
        if (currHp !== undefined && prevHp > currHp) {
          const pos = getMinionPos(id);
          if (pos) triggerDamageAnimation(id, prevHp - currHp, pos.x, pos.y);
        }
      }
    }

    prevHealthRef.current = currentSnapshot;
  }, [gameState, combatState, triggerDamageAnimation, prevHealthRef]);

  // Card click handlers (extracted to hook)
  const { handlePlayerCardClick, handleOpponentCardClick, handleCardPlay } = usePokerCardClickHandlers({
    isPlayerTurn,
    heroPowerTargeting,
    executeHeroPowerEffect,
    addShakingTarget,
    gameState,
  });

  const isCardInteractionDisabled = gameState?.gamePhase === 'game_over';
	const isHandInteractionDisabled = isCardInteractionDisabled || !pokerDecisionView.localCanAct;
  const openCardInspector = useCallback((card: CardInstance, source: CardInspectorSource) => {
    setInspectedCard({ card, source });
  }, []);
  const handleBattlefieldCardClick = useCallback((side: BattlefieldCardSide, card: CardInstance) => {
    const intent = resolveBattlefieldCardClickIntent({
      side,
      isPlayerTurn,
      cardCanAttack: card.canAttack === true,
      cardIsSummoningSick: card.isSummoningSick === true,
      cardIsFrozen: card.isFrozen === true,
      hasSelectedAttacker: Boolean(rawAttackingCard),
      hasSelectedHandCard: Boolean(selectedHandCard),
      isHeroPowerTargeting: heroPowerTargeting?.active === true,
      isInteractionDisabled: isCardInteractionDisabled,
    });

    if (intent === 'inspect') {
      openCardInspector(card, side === 'player' ? 'player-battlefield' : 'opponent-battlefield');
      return;
    }
    if (side === 'player') handlePlayerCardClick(card);
    else handleOpponentCardClick(card);
  }, [
    handleOpponentCardClick,
    handlePlayerCardClick,
    heroPowerTargeting?.active,
    isCardInteractionDisabled,
    isPlayerTurn,
    openCardInspector,
    rawAttackingCard,
    selectedHandCard,
  ]);
  const handlePlayerBattlefieldCardClick = useCallback(
    (card: CardInstance) => handleBattlefieldCardClick('player', card),
    [handleBattlefieldCardClick],
  );
  const handleOpponentBattlefieldCardClick = useCallback(
    (card: CardInstance) => handleBattlefieldCardClick('opponent', card),
    [handleBattlefieldCardClick],
  );

  const combatPhase = combatState?.phase;
  const isMulligan = combatPhase === CombatPhase.MULLIGAN;
  const isBettingRound = combatPhase ? isBettingPhase(combatPhase) : false;
  const showBettingControls = combatState
    ? !isMulligan && isBettingRound && !combatState.isAllInShowdown
    : false;
  const showBettingInteraction = showBettingControls && Boolean(basePermissions?.isMyTurnToAct);
	const phaseAllowsFaith = Boolean(combatPhase) && !isMulligan && combatPhase !== CombatPhase.PRE_FLOP;
  const showFaith = phaseAllowsFaith && communityCardsRevealed;
  const showForesight = communityCardsRevealed && !isMulligan && (combatPhase === CombatPhase.FORESIGHT || combatPhase === CombatPhase.DESTINY || combatPhase === CombatPhase.RESOLUTION);
  const showDestiny = communityCardsRevealed && !isMulligan && (combatPhase === CombatPhase.DESTINY || combatPhase === CombatPhase.RESOLUTION);
  const playerHoleCards = combatState?.player.holeCards;
  const communityCards = combatState?.communityCards;
  const playerHandEval = useMemo(() => {
    if (!playerHoleCards || playerHoleCards.length === 0 || !communityCards || isMulligan) return null;
    const visibleCommunityCards: PokerCard[] = [
      ...(showFaith ? (communityCards.faith || []) : []),
      ...(showForesight && communityCards.foresight ? [communityCards.foresight] : []),
      ...(showDestiny && communityCards.destiny ? [communityCards.destiny] : []),
    ];
    if (visibleCommunityCards.length === 0 && playerHoleCards.length < 5) return null;
    return evaluatePokerHand(playerHoleCards, visibleCommunityCards);
  }, [
    playerHoleCards,
    communityCards,
    showFaith,
    showForesight,
    showDestiny,
    isMulligan,
  ]);
  const handVisualClass = !playerHandEval
    ? 'weak'
    : playerHandEval.rank >= PokerHandRank.DIVINE_ALIGNMENT
      ? 'royal'
      : playerHandEval.rank >= PokerHandRank.VALHALLAS_BLESSING
        ? 'very-strong'
        : playerHandEval.rank >= PokerHandRank.ODINS_EYE
          ? 'strong'
          : playerHandEval.rank >= PokerHandRank.THORS_HAMMER
            ? 'medium'
            : 'weak';

  // Early return if no combat state
  if (!combatState) {
    return <div className="unified-combat-arena">Loading...</div>;
  }

  return (
    <div className="unified-combat-arena" ref={battlefieldRef as React.RefObject<HTMLDivElement>}>
      {/* ═══════════ ZONE 1 · OPP (hero + hand) ═══════════ */}
      <OpponentZone
        opponentPet={opponentPet ?? null}
        enrichedOpponentPet={enrichedOpponentPet}
        opponentLevel={opponentLevel}
        opponentMana={opponentMana}
        opponentMaxMana={opponentMaxMana}
        opponentHpCommitted={opponentHpCommitted}
        opponentPosition={combatState.opponentPosition}
        isOpponentTargetable={isOpponentTargetable}
        opponentSecrets={opponentSecrets}
        opponentHeroClass={opponentHeroClass}
        opponentHoleCards={combatState.opponent.holeCards}
        opponentHand={(gameState?.players?.opponent?.hand ?? []) as CardInstance[]}
        isAllInShowdown={combatState.isAllInShowdown}
        showdownCelebration={showdownCelebration}
        waitingForOpponent={!!basePermissions?.waitingForOpponent}
        bossQuipText={bossQuipText}
        bossQuipKey={bossQuipKey}
        bossPortrait={bossPortrait}
        opponentName={opponentPet?.name}
        shakingHero={shakingTargets.has('opponent-hero')}
        isPlayerTurn={isPlayerTurn}
        onOpponentHeroClick={onOpponentHeroClick}
      />

      {/* ═══════════ ZONE 2 · OPP FIELD (minions) ═══════════ */}
      <MinionField
        role="opp"
        playerCards={[]}
        opponentCards={opponentBattlefield}
        onCardClick={handlePlayerBattlefieldCardClick}
        onOpponentCardClick={handleOpponentBattlefieldCardClick}
        onOpponentHeroClick={onOpponentHeroClick}
        attackingCard={attackingCard}
        isPlayerTurn={isPlayerTurn}
        registerCardPosition={registerCardPosition || noopRegisterCardPosition}
        shakingTargets={shakingTargets}
        isInteractionDisabled={isCardInteractionDisabled}
      />

      {/* ═══════════ ZONE 3 · BOARD (community cards) ═══════════ */}
      <BoardZone
        communityCards={combatState.communityCards}
        showFaith={showFaith}
        showForesight={showForesight}
        showDestiny={showDestiny}
        showdownWinningCards={showdownCelebration?.winningCards}
      />

      {/* ═══════════ ZONE 4 · PLAYER FIELD (minions) ═══════════ */}
      <MinionField
        role="player"
        playerCards={playerBattlefield}
        opponentCards={[]}
        onCardClick={handlePlayerBattlefieldCardClick}
        onOpponentCardClick={handleOpponentBattlefieldCardClick}
        attackingCard={attackingCard}
        isPlayerTurn={isPlayerTurn}
        registerCardPosition={registerCardPosition || noopRegisterCardPosition}
        shakingTargets={shakingTargets}
        isInteractionDisabled={isCardInteractionDisabled}
      />

      {/* ═══════════ ZONE 5 · PLAYER (hero + hand) ═══════════ */}
      <PlayerZone
        playerPet={playerPet ?? null}
        enrichedPlayerPet={enrichedPlayerPet}
        playerLevel={playerLevel}
        playerMana={playerMana}
        playerMaxMana={playerMaxMana}
        playerHpCommitted={playerHpCommitted}
        playerPosition={combatState.playerPosition}
        isPlayerTargetable={isPlayerTargetable}
        playerSecrets={playerSecrets}
        playerHeroClass={playerHeroClass}
        playerHoleCards={combatState.player.holeCards}
        artifact={gameState?.players?.player?.artifact ? {
          name: gameState.players.player.artifact.card.name,
          attack: asExtendedCardData(gameState.players.player.artifact.card).attack || 0,
        } : undefined}
        showdownCelebration={showdownCelebration}
        isMyTurnToAct={!!basePermissions?.isMyTurnToAct}
        playerHandEval={playerHandEval}
        handVisualClass={handVisualClass}
        shakingHero={shakingTargets.has('player-hero')}
        isPlayerTurn={isPlayerTurn}
        onPlayerHeroClick={onPlayerHeroClick}
        onOpenGearPanel={() => setShowGearPanel(true)}
        onHeroPowerClick={onHeroPowerClick}
        onWeaponUpgradeClick={onWeaponUpgradeClick}
        isWeaponUpgraded={isWeaponUpgraded}
        handCards={handCards}
        handCurrentMana={handCurrentMana}
        handIsPlayerTurn={handIsPlayerTurn}
	        handIsPlayWindowOpen={pokerDecisionView.localCanAct}
        handIsInteractionDisabled={isHandInteractionDisabled}
        heroHealth={readViewerCombatHeroHp(combatState, 'player')?.current ?? 0}
        evolveReadyIds={evolveReadyIds}
        playerBattlefield={playerBattlefield}
        onCardPlay={onCardPlay}
        handleCardPlay={handleCardPlay}
        registerCardPosition={registerCardPosition || noopRegisterCardPosition}
        battlefieldRef={battlefieldRef as React.RefObject<HTMLDivElement>}
        onCardInspect={card => openCardInspector(card, 'hand')}
      />

      {/* ═══════════ OVERLAY LAYER (absolute, layered on top of zones) ═══════════ */}
      {isMulligan && (
        <div className="mulligan-notice absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center gap-1">
          <span className="mulligan-text">Waiting for Mulligan...</span>
          <span className="mulligan-subtext">Complete your card selection first</span>
        </div>
      )}

      {attackingCard && (
        <div className="attack-mode-banner">
          <span className="attack-mode-icon" aria-hidden="true">
            <GameIcon name="swords" size={20} className="btn-icon" aria-hidden="true" />
          </span>
          <span className="attack-mode-text">
            <strong>{attackingCard.card?.name}</strong> is attacking — click a target
          </span>
          <button
            type="button"
            className="attack-mode-cancel"
            onClick={() => selectAttacker(null)}
          >
            <GameIcon name="x" size={16} className="btn-icon" aria-hidden="true" />
            <span>Clear Target</span>
          </button>
        </div>
      )}

      <PokerP2PTurnStatus
        combatState={combatState}
        isP2PCombat={isP2PCombat}
        connectionState={connectionState}
      />

      {showBettingInteraction && (
        <BettingPanel
          permissions={basePermissions}
          betAmount={betAmount}
          onBetAmountChange={setBetAmount}
          onAction={wrappedOnAction}
          onAutoAttackFrontline={() => {
            if (isPlayerTurn) {
              p2pActions.dispatchGameCommand({
                type: GAME_COMMAND_TYPES.frontlineAttack,
                mode: 'minion',
                actionId: crypto.randomUUID(),
              });
            }
          }}
          showFrontlineButton={isPlayerTurn && playerBattlefield.length > 0}
        />
      )}

      {hasQueuedPokerSpells && (
        <>
          <div className="poker-spell-tray-mount poker-spell-tray-mount--opponent">
            <PokerSpellTray caster="opponent" />
          </div>
          <div className="poker-spell-tray-mount poker-spell-tray-mount--player">
            <PokerSpellTray caster="player" />
          </div>
        </>
      )}

      {/* Family 3 — wager activation vfx surface. Pointer-events none
          so it never blocks the betting panel or hero clicks below. */}
      <div
        className="wager-activation-mount"
      />

      {/* Damage Animations — gated by showDamageNumbers setting */}
      {useSettingsStore.getState().showDamageNumbers && damageAnimations.map(anim => (
        <DamageIndicator
          id={anim.id}
          key={anim.id}
          damage={anim.damage}
          x={anim.x}
          y={anim.y}
          isHeal={anim.isHeal}
          onComplete={() => removeDamageAnimation(anim.id)}
        />
      ))}

      {/* Hero Gear Panel - opened from the compact hero dossier */}
      {showGearPanel && gameState?.players?.player && (
        <HeroGearPanel
          artifact={gameState.players.player.artifact}
          armorGear={gameState.players.player.armorGear}
          artifactState={gameState.players.player.artifactState}
          onClose={() => setShowGearPanel(false)}
        />
      )}

      <BattlefieldCardInspector
        card={inspectedCard?.card ?? null}
        source={inspectedCard?.source ?? 'hand'}
        onClose={() => setInspectedCard(null)}
      />
    </div>
  );
};

export const RagnarokCombatArena: React.FC<RagnarokCombatArenaProps> = ({ onCombatEnd }) => {
	const hourglassPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, '');
	const hourglassIds = {
		gold: `hourglass-${hourglassPrefix}-gold`,
		goldCap: `hourglass-${hourglassPrefix}-gold-cap`,
		sand: `hourglass-${hourglassPrefix}-sand`,
		glow: `hourglass-${hourglassPrefix}-glow`,
		topClip: `hourglass-${hourglassPrefix}-top-clip`,
		bottomClip: `hourglass-${hourglassPrefix}-bottom-clip`,
		innerShadow: `hourglass-${hourglassPrefix}-inner-shadow`,
		outerGlow: `hourglass-${hourglassPrefix}-outer-glow`,
	} as const;

  useGameLogIntegration();
  useEventAnimationBridge();
  const resetKingEvents = useKingPassiveEventStore(s => s.reset);

  /*
    Combat music — start `battle_theme` for the duration of the combat
    arena, swap to `victory`/`defeat` on game over, stop on unmount.
    The Howler tracks are loaded with preload:false and wrapped in
    try/catch in useAudio.tsx, so this is a safe no-op if the mp3 file
    doesn't exist on disk yet.
  */
  const playBackgroundMusic = useAudio(s => s.playBackgroundMusic);
  const stopBackgroundMusic = useAudio(s => s.stopBackgroundMusic);
  const combatMusicMissionId = useCampaignStore(s => s.currentMission);
  const combatMusicTrack = useMemo(() => {
    if (!combatMusicMissionId) return 'battle_theme' as const;
    const found = getMission(combatMusicMissionId);
    return found?.mission?.combatMusicId ?? 'battle_theme';
  }, [combatMusicMissionId]);
  useEffect(() => {
    playBackgroundMusic(combatMusicTrack);
    return () => {
      stopBackgroundMusic();
    };
  }, [playBackgroundMusic, stopBackgroundMusic, combatMusicTrack]);

  /*
    Boss quips — read the active campaign mission's optional bossQuips
    field, then fire a transient bubble over the opponent hero portrait
    on key combat events:
      - Combat start (mount): onCombatStart
      - Opponent HP crosses 50%: onLowHP (one-shot per combat)
    Outside campaign mode (PvP, dev test), currentMissionId is null and
    no bubble ever shows.

    quipText drives BossQuipBubble; quipKey makes consecutive identical
    quips re-trigger the animation.
  */
  const bossQuipMissionId = useCampaignStore(s => s.currentMission);
  const bossQuips = useMemo(() => {
    if (!bossQuipMissionId) return undefined;
    const found = getMission(bossQuipMissionId);
    return found?.mission?.bossQuips;
  }, [bossQuipMissionId]);
  // Resolve boss portrait URL once per mission so the bubble can render
  // a face. Falls back to undefined for non-campaign / no-art bosses.
  const bossPortrait = useMemo(() => {
    if (!bossQuipMissionId) return undefined;
    const found = getMission(bossQuipMissionId);
    if (!found?.mission?.aiHeroId) return undefined;
    return resolveHeroPortrait(found.mission.aiHeroId);
  }, [bossQuipMissionId]);
  const [quipText, setQuipText] = useState<string | null>(null);
  const [quipKey, setQuipKey] = useState(0);
  const lowHPQuipFiredRef = useRef(false);
  const lethalQuipFiredRef = useRef(false);
  const combatStartQuipFiredRef = useRef(false);

  // Combat-start quip — fires once when the arena mounts with quips data.
  useEffect(() => {
    if (combatStartQuipFiredRef.current) return;
    if (!bossQuips?.onCombatStart) return;
    combatStartQuipFiredRef.current = true;
    setQuipText(bossQuips.onCombatStart);
    setQuipKey(k => k + 1);
  }, [bossQuips]);

  // Opponent HP for boss quips is read after the combat controller mounts.

  /*
    Boss phases — mid-combat escalation. Watches opponent HP and fires
    each phase exactly once when its hpPercent threshold is crossed.
    Phases drive THREE things: a quip (story), a screen flash (visual),
    and a mechanical effect (gameplay). Defined per-mission via
    mission.bossPhases. See campaignTypes.ts BossPhase for the schema
    and useBossPhases.ts for the runner.
  */
  const [phaseFlash, setPhaseFlash] = useState<BossPhaseFlashKind | null>(null);

  /*
    Hero feud taunt — in PvP, when two heroes with a canonical rivalry
    meet (Loki vs Thor, Odin vs Fenrir, etc.), fire a one-time taunt
    quip 2s after combat start. Only in non-campaign mode (campaign has
    its own boss quip system). Reads hero IDs from combatState once
    available.
  */
  const feudFiredRef = useRef(false);
  const feudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    combatState,
    isActive,
    resolution,
    betAmount,
    setBetAmount,
    showdownCelebration,
    setShowdownCelebration,
    heroDeathState,
    heroPowerTargeting,
    weaponUpgraded,
    mulliganActive,
    gameStateMulligan,
    showdownBackupTimerRef,
    sharedBattlefieldRef,
    playerHand,
    selectedCard,
    playerMana,
    playerMaxMana,
    opponentMana,
    opponentMaxMana,
    isPlayerTurn,
    isOpponentTargetable,
    isPlayerTargetable,
    sharedRegisterCardPosition,
    sharedHandleCardPlay,
    handleOpponentHeroClick,
    handlePlayerHeroClick,
    executeHeroPowerEffect,
    handleHeroPower,
    cancelHeroPowerTargeting,
    handleWeaponUpgrade,
    handleAction,
    handleCombatEnd,
	    handleHeroDeathComplete,
	    handleUnifiedEndTurn,
    heroBattlePopups,
    removeHeroBattlePopup,
  } = useRagnarokCombatController({ onCombatEnd });

  // First-strike damage and phase transition are committed immediately from
  // the canonical combat state. The overlay receives a snapshot so changing
  // its choreography cannot delay or become the authority for gameplay.
  const [firstStrikePresentation, setFirstStrikePresentation] = useState<{
    readonly target: 'player' | 'opponent';
    readonly damage: number;
    readonly attackerName: string;
    readonly defenderName: string;
  } | null>(null);

  useEffect(() => {
    if (!combatState || !isActive) {
      setFirstStrikePresentation(null);
      return;
    }

    const firstStrike = combatState.firstStrike;
    if (combatState.phase !== CombatPhase.FIRST_STRIKE || !firstStrike || firstStrike.completed) return;

    setFirstStrikePresentation(current => {
      if (current?.target === firstStrike.target && current.damage === firstStrike.damage) return current;
      return {
        target: firstStrike.target,
        damage: firstStrike.damage,
        attackerName: firstStrike.target === 'player'
          ? combatState.opponent.playerName
          : combatState.player.playerName,
        defenderName: firstStrike.target === 'player'
          ? combatState.player.playerName
          : combatState.opponent.playerName,
      };
    });

    getPokerCombatAdapterState().completeFirstStrike();
  }, [combatState, isActive]);

  const quipOpponentHp = readViewerCombatHeroHp(combatState, 'opponent');
  const quipOpponentHP = quipOpponentHp?.current ?? 100;
  const quipOpponentMaxHP = quipOpponentHp?.max ?? 100;
  useBossPhases({
    opponentCurrentHP: quipOpponentHP,
    opponentMaxHP: quipOpponentMaxHP,
    setQuipText,
    setQuipKey,
    setFlash: setPhaseFlash,
  });
  useEffect(() => {
    if (lowHPQuipFiredRef.current) return;
    if (!bossQuips?.onLowHP) return;
    if (quipOpponentMaxHP <= 0) return;
    if (quipOpponentHP / quipOpponentMaxHP > 0.5) return;
    lowHPQuipFiredRef.current = true;
    setQuipText(bossQuips.onLowHP);
    setQuipKey(k => k + 1);
  }, [bossQuips, quipOpponentHP, quipOpponentMaxHP]);
  useEffect(() => {
    if (lethalQuipFiredRef.current) return;
    if (!lowHPQuipFiredRef.current) return;
    if (!bossQuips?.onLethal) return;
    if (quipOpponentMaxHP <= 0) return;
    if (quipOpponentHP / quipOpponentMaxHP > 0.15) return;
    lethalQuipFiredRef.current = true;
    setQuipText(bossQuips.onLethal);
    setQuipKey(k => k + 1);
  }, [bossQuips, quipOpponentHP, quipOpponentMaxHP]);

  const pokerDrama = usePokerDrama({ combatState, isActive });

  // Register poker drama VisualEvent handlers once per arena mount.
  useEffect(() => {
    const unregister = registerPokerDramaVisualEffects();
    return unregister;
  }, []);

  const elementalBuff = useElementalBuff();

  // Element matchup banner — show once when combat first initializes
  const [showMatchupBanner, setShowMatchupBanner] = useState(false);
  const matchupBannerShownRef = useRef(false);
  useEffect(() => {
    if (combatState && !matchupBannerShownRef.current) {
      matchupBannerShownRef.current = true;
      setShowMatchupBanner(true);
    }
  }, [combatState]);

  // Hero feud taunt — fires 2.5s after combat start in PvP if heroes
  // have a canonical rivalry. Delayed so it doesn't collide with boss quips.
  useEffect(() => {
    if (feudFiredRef.current) return;
    if (!combatState) return;
    if (bossQuipMissionId) return; // campaign has its own quip system
    const playerHero = combatState.player?.pet?.norseHeroId;
    const opponentHero = combatState.opponent?.pet?.norseHeroId;
    if (!playerHero || !opponentHero) return;
    const feud = getHeroFeud(playerHero, opponentHero);
    if (!feud) return;
    feudFiredRef.current = true;
    // Show tagline first, then the opponent's quip directed at the player
    feudTimerRef.current = setTimeout(() => {
      const opponentQuip = playerHero < opponentHero ? feud.bQuip : feud.aQuip;
      setQuipText(opponentQuip);
      setQuipKey(k => k + 1);
    }, 2500);
    return () => { if (feudTimerRef.current) clearTimeout(feudTimerRef.current); };
  }, [combatState, bossQuipMissionId]);

  useEffect(() => {
    return () => { resetKingEvents(); };
  }, [resetKingEvents]);

  // Realm selector — drives board skin + ambient particles (extracted to hook)
  const { realmAnnouncement, realmClass, activeRealmId, activeRealmName } = useRealmAnnouncement();

  // Prophecy tracker
  const prophecies = useGameStore(state => state.gameState?.prophecies);

  // Realm effects
  const activeRealmEffects = useGameStore(state => state.gameState?.activeRealm?.effects);
  const activeRealmDescription = useGameStore(state => state.gameState?.activeRealm?.description);
  const gamePlayers = useGameStore(state => state.gameState?.players);

  // HUD selectors
  const gamePhase = useGameStore(state => state.gameState?.gamePhase);
  const gameWinner = useGameStore(state => state.gameState?.winner);
  const turnNumber = useGameStore(state => state.gameState?.turnNumber ?? 1);
  const currentTurnForBanner = useGameStore(state => state.gameState?.currentTurn);
  const p2pDecisionConnectionState = usePeerStore(state => state.connectionState);
  const p2pDecisionMatch = useMatchStore(state => state.activeMatch);
  const outerDecisionView = useMemo(
    () => derivePokerDecisionView({
      combatState,
      connectionState: p2pDecisionConnectionState,
      isP2PCombat: p2pDecisionMatch?.opponent.kind === 'peer',
    }),
    [combatState, p2pDecisionConnectionState, p2pDecisionMatch]
  );
  const visibleTurnForBanner = outerDecisionView.displayTurn ?? currentTurnForBanner;
  const gameOverWinner = gameWinner === 'player' || gameWinner === 'opponent' || gameWinner === 'draw'
    ? gameWinner
    : 'draw';
  const playerDeckCount = useGameStore(state => state.gameState?.players?.player?.deck?.length ?? 0);
  const opponentDeckCount = useGameStore(state => state.gameState?.players?.opponent?.deck?.length ?? 0);
  const opponentHandCount = useGameStore(state => state.gameState?.players?.opponent?.hand?.length ?? 0);
  const attackingCardForShortcuts = useGameStore(state => state.attackingCard);
  const selectAttackerForClear = useGameStore(state => state.selectAttacker);
  const selectCard = useGameStore(state => state.selectCard);
  const playerHeroHealth = readViewerCombatHeroHp(combatState, 'player')?.current ?? 0;
  const opponentHeroHealth = readViewerCombatHeroHp(combatState, 'opponent')?.current ?? 0;
  const [battleIntelOpen, setBattleIntelOpen] = useState(false);

  const wagerIntel = useMemo(() => {
    const result: { player: Array<{ cardName: string; description: string }>; opponent: Array<{ cardName: string; description: string }> } = {
      player: [],
      opponent: [],
    };
    if (!gamePlayers) return result;

    for (const side of ['player', 'opponent'] as const) {
      const battlefield = gamePlayers[side]?.battlefield || [];
      for (const minion of battlefield) {
        const wager = (minion.card as WagerEffectCard | undefined)?.wagerEffect;
        if (!wager?.type) continue;
        result[side].push({
          cardName: minion.card?.name || 'Unknown',
          description: getWagerDescription(wager.type),
        });
      }
    }
    return result;
  }, [gamePlayers]);

  const activeProphecies = prophecies ?? [];
  const activeRealmModifiers = activeRealmEffects ?? [];
  const totalBattleIntelItems = activeRealmModifiers.length + activeProphecies.length + wagerIntel.player.length + wagerIntel.opponent.length;
  const hasBattleIntel = totalBattleIntelItems > 0;
  const currentPhaseLabel = combatState?.phase
    ? PHASE_LABELS[combatState.phase] || combatState.phase.replace(/_/g, ' ')
    : 'Battle Ready';
  const hudCallStake = combatState ? getActionPermissions(combatState, true) : null;
  const hudToCall = hudCallStake?.hasBetToCall ? hudCallStake.toCall : 0;

  useEffect(() => {
    if (!hasBattleIntel) {
      setBattleIntelOpen(false);
    }
  }, [hasBattleIntel]);

  // Screen shake in the outer component (extracted to hook)
  const { outerShakeClass } = useHeroHealthEffects({ playerHeroHealth, opponentHeroHealth });

  // Keyboard shortcuts + right-click cancel for targeting
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (isPlayerTurn && combatState) {
          handleUnifiedEndTurn();
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedCard) {
          selectCard(null);
        }
        if (attackingCardForShortcuts) {
          selectAttackerForClear(null);
        }
      }
    };
    const handleContextMenu = (e: MouseEvent) => {
      if (selectedCard) {
        e.preventDefault();
        selectCard(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isPlayerTurn, combatState, handleUnifiedEndTurn, attackingCardForShortcuts, selectAttackerForClear, selectedCard, selectCard]);

  if (!combatState || !isActive) {
    return null;
  }

  return (
    <GameViewport
      extraClassName={`${outerShakeClass} ${realmClass}`.trim()}
      safeX={POKER_VIEWPORT_SAFE_AREA.safeX}
      safeY={POKER_VIEWPORT_SAFE_AREA.safeY}
      maxScale={POKER_VIEWPORT_SAFE_AREA.maxScale}
    >
      <div
        className={`ragnarok-combat-arena arena-scaled viewport-mode bg-transparent ${isPlayerTurn ? 'player-turn' : 'opponent-turn'}`}
        style={POKER_VIEWPORT_LAYOUT_STYLE}
      >
        {/* ═════════════════════════════════════════════════════════════
            LAYERED ARCHITECTURE — see docs/POKER_ARENA_UI.md §Layers
            5 stacked layers, each absolute inset-0, never escape canvas:
              .layer-background  z 0-99    pointer-events: none
              .layer-game        z 100-399 pointer-events: auto (interactive)
              .layer-vfx         z 400-699 pointer-events: none (mount target
                                            for PokerDramaVFX + PhaseBanner)
              .layer-hud         z 700-899 pointer-events: auto (opt-in)
              .layer-modal       z 900+   pointer-events: auto (blockers)
            ═════════════════════════════════════════════════════════════ */}
        <div className="layer-background" />
        <div id="arena-layer-vfx" className="layer-vfx" {...arenaVfxLayerProps(ARENA_VFX_LAYERS.vfx)} />
        <div id="arena-layer-modal" className="layer-modal" {...arenaVfxLayerProps(ARENA_VFX_LAYERS.modal)} />

        {/* Hourglass Timer at Top Center */}
        {(() => {
          const t = outerDecisionView.remainingSeconds;
          const maxT = outerDecisionView.durationSeconds;
          const pct = outerDecisionView.timerProgress;
          const topH = pct * 30;
          const botH = (1 - pct) * 30;
          return (
            <div className={`hourglass-timer ${outerDecisionView.hasClock && outerDecisionView.timerTone === 'low' ? 'low-time' : ''} ${outerDecisionView.hasClock && (outerDecisionView.timerTone === 'critical' || outerDecisionView.timerTone === 'expired') ? 'critical' : ''} ${outerDecisionView.hasClock ? '' : 'hourglass-timer--parked'}`}>
              <svg className="hourglass-svg" viewBox="0 0 60 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id={hourglassIds.gold} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fff4dc" />
                    <stop offset="22%" stopColor="#f5d060" />
                    <stop offset="50%" stopColor="#d4a017" />
                    <stop offset="78%" stopColor="#a07818" />
                    <stop offset="100%" stopColor="#5c4008" />
                  </linearGradient>
                  <linearGradient id={hourglassIds.goldCap} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fff4dc" />
                    <stop offset="22%" stopColor="#ffe680" />
                    <stop offset="55%" stopColor="#d4a017" />
                    <stop offset="100%" stopColor="#5c4008" />
                  </linearGradient>
                  <linearGradient id={hourglassIds.sand} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fff4a8" />
                    <stop offset="35%" stopColor="#f5c842" />
                    <stop offset="100%" stopColor="#a07010" />
                  </linearGradient>
                  <radialGradient id={hourglassIds.glow}>
                    <stop offset="0%" stopColor="rgba(245,208,96,0.78)" />
                    <stop offset="55%" stopColor="rgba(245,208,96,0.22)" />
                    <stop offset="100%" stopColor="rgba(245,208,96,0)" />
                  </radialGradient>
                  <clipPath id={hourglassIds.topClip}>
                    <path d="M14 12 C14 12 14 32 30 42 C46 32 46 12 46 12 Z" />
                  </clipPath>
                  <clipPath id={hourglassIds.bottomClip}>
                    <path d="M14 72 C14 72 14 52 30 42 C46 52 46 72 46 72 Z" />
                  </clipPath>
                  <filter id={hourglassIds.innerShadow}>
                    <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
                  </filter>
                  <filter id={hourglassIds.outerGlow} x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="1.2" />
                  </filter>
                </defs>

                {/* Ambient glow behind hourglass — painterly atmospheric halo */}
                <ellipse cx="30" cy="42" rx="26" ry="38" fill={`url(#${hourglassIds.glow})`} className="hg-ambient-glow" />
                {/* Warm gold dust haze around body — extra painterly bloom */}
                <ellipse cx="30" cy="42" rx="18" ry="28" fill={`url(#${hourglassIds.glow})`} opacity="0.55" />
                {/* Soft cold rim from above — atmospheric depth */}
                <ellipse cx="30" cy="20" rx="14" ry="4" fill="rgba(180, 210, 255, 0.08)" />

                {/* Top cap — layered bevel + side spires */}
                <rect x="8" y="3" width="44" height="7" rx="1" fill={`url(#${hourglassIds.goldCap})`} stroke="#5c4008" strokeWidth="0.8" />
                <rect x="10" y="1.4" width="40" height="2.2" rx="0.6" fill="#fff4dc" opacity="0.85" />
                <line x1="12" y1="6.5" x2="48" y2="6.5" stroke="rgba(120,80,16,0.55)" strokeWidth="0.4" />
                {/* Top cap Norse diamond + interlace dots */}
                <path d="M30 4.4 L31.6 6.5 L30 8.6 L28.4 6.5 Z" fill="#fff4dc" opacity="0.95" />
                <circle cx="14" cy="6.5" r="0.6" fill="#fff4dc" opacity="0.7" />
                <circle cx="46" cy="6.5" r="0.6" fill="#fff4dc" opacity="0.7" />
                <circle cx="22" cy="6.5" r="0.4" fill="#8b6508" opacity="0.6" />
                <circle cx="38" cy="6.5" r="0.4" fill="#8b6508" opacity="0.6" />
                {/* Top cap side spires */}
                <path d="M8 6.5 L4 4 L4 9 Z" fill={`url(#${hourglassIds.goldCap})`} stroke="#5c4008" strokeWidth="0.5" />
                <path d="M52 6.5 L56 4 L56 9 Z" fill={`url(#${hourglassIds.goldCap})`} stroke="#5c4008" strokeWidth="0.5" />

                {/* Bottom cap — mirror */}
                <rect x="8" y="74" width="44" height="7" rx="1" fill={`url(#${hourglassIds.goldCap})`} stroke="#5c4008" strokeWidth="0.8" />
                <rect x="10" y="80.4" width="40" height="2.2" rx="0.6" fill="#fff4dc" opacity="0.85" />
                <line x1="12" y1="77.5" x2="48" y2="77.5" stroke="rgba(120,80,16,0.55)" strokeWidth="0.4" />
                <path d="M30 75.4 L31.6 77.5 L30 79.6 L28.4 77.5 Z" fill="#fff4dc" opacity="0.95" />
                <circle cx="14" cy="77.5" r="0.6" fill="#fff4dc" opacity="0.7" />
                <circle cx="46" cy="77.5" r="0.6" fill="#fff4dc" opacity="0.7" />
                <circle cx="22" cy="77.5" r="0.4" fill="#8b6508" opacity="0.6" />
                <circle cx="38" cy="77.5" r="0.4" fill="#8b6508" opacity="0.6" />
                <path d="M8 77.5 L4 75 L4 80 Z" fill={`url(#${hourglassIds.goldCap})`} stroke="#5c4008" strokeWidth="0.5" />
                <path d="M52 77.5 L56 75 L56 80 Z" fill={`url(#${hourglassIds.goldCap})`} stroke="#5c4008" strokeWidth="0.5" />

                {/* Glass frame — thicker gold, fantasy weight, painterly soft outer edge */}
                <path
                  d="M14 12 C14 12 14 32 30 42 C14 52 14 72 14 72 M46 12 C46 12 46 32 30 42 C46 52 46 72 46 72"
                  stroke={`url(#${hourglassIds.gold})`} strokeWidth="2.6" strokeLinecap="round" fill="none"
                />
                {/* Outer soft glow stroke (atmospheric bloom) */}
                <path
                  d="M14 12 C14 12 14 32 30 42 C14 52 14 72 14 72 M46 12 C46 12 46 32 30 42 C46 52 46 72 46 72"
                  stroke="rgba(255,200,80,0.4)" strokeWidth="5" strokeLinecap="round" fill="none"
                  filter={`url(#${hourglassIds.outerGlow})`}
                />
                {/* Inner gold accent line (parallel) for fantasy depth */}
                <path
                  d="M16 13 C16 13 16 32 30 42 C16 52 16 71 16 71 M44 13 C44 13 44 32 30 42 C44 52 44 71 44 71"
                  stroke="rgba(255,230,128,0.5)" strokeWidth="0.6" strokeLinecap="round" fill="none"
                />

                {/* Sand in top bulb — drains down */}
                <rect
                  className="hg-sand-top"
                  clipPath={`url(#${hourglassIds.topClip})`}
                  x="13" width="34"
                  fill={`url(#${hourglassIds.sand})`}
                  filter={`url(#${hourglassIds.innerShadow})`}
                  style={{ y: 12 + (24 - topH * 0.8), height: topH * 0.8, transition: 'height 1s linear, y 1s linear' }}
                />

                {/* Sand in bottom bulb — fills up */}
                <rect
                  className="hg-sand-bottom"
                  clipPath={`url(#${hourglassIds.bottomClip})`}
                  x="13" width="34"
                  fill={`url(#${hourglassIds.sand})`}
                  style={{ y: 72 - botH * 0.8, height: botH * 0.8, transition: 'height 1s linear, y 1s linear' }}
                />

                {/* Falling sand stream — thin line through the neck */}
                {outerDecisionView.hasClock && t > 0 && t < maxT && (
                  <g className="hg-stream-group">
                    <line x1="30" y1="36" x2="30" y2="48" stroke="#f5d060" strokeWidth="1.2" className="hg-stream" />
                    {/* Sand particles falling */}
                    <circle cx="30" cy="38" r="0.8" fill="#fff4a8" className="hg-particle hg-p1" />
                    <circle cx="29.4" cy="44" r="0.6" fill="#f5c842" className="hg-particle hg-p2" />
                    <circle cx="30.6" cy="41" r="0.7" fill="#fff4a8" className="hg-particle hg-p3" />
                  </g>
                )}

                {/* Glass shine highlight — curved reflections */}
                <path
                  d="M19 15 C19 15 21 28 28 37"
                  stroke="rgba(255,255,255,0.36)" strokeWidth="1.4" strokeLinecap="round" fill="none"
                  className="hg-shine-top"
                />
                <path
                  d="M19 69 C19 69 21 56 28 47"
                  stroke="rgba(255,255,255,0.2)" strokeWidth="1.1" strokeLinecap="round" fill="none"
                  className="hg-shine-bottom"
                />

                {/* Center neck ring ornament — fantasy: double ring + jewel */}
                <ellipse cx="30" cy="42" rx="5" ry="2.4" fill="none" stroke={`url(#${hourglassIds.gold})`} strokeWidth="1.4" />
                <ellipse cx="30" cy="42" rx="3" ry="1.4" fill="#b8860b" opacity="0.7" />
                <circle cx="30" cy="42" r="0.8" fill="#fff4dc" />
                <text
                  className="hg-countdown-text"
                  x="30"
                  y="96"
                  aria-label={outerDecisionView.hasClock ? `${t} seconds remaining` : 'No betting clock'}
                >
                  {outerDecisionView.hasClock ? t : '—'}
                </text>
              </svg>
            </div>
          );
        })()}
        
        <PhaseBanner phase={combatState.phase} forceHide={!!showdownCelebration} />
        <CombatFeedbackStack />

        {/* Hand strength indicator — live display of current best hand */}
        <HandStrengthIndicator
          handRank={pokerDrama.currentHandRank}
          handName={pokerDrama.currentHandName}
          tier={pokerDrama.handTier}
        />

        {/* Realm indicator badge */}
        {activeRealmId && (
          <div className="realm-indicator">
            <span className="realm-indicator-name">{activeRealmName || activeRealmId}</span>
          </div>
        )}

        {hasBattleIntel && (
          <div className={`battle-intel ${battleIntelOpen ? 'open' : ''}`}>
            <button
              type="button"
              className="battle-intel-toggle"
              onClick={() => setBattleIntelOpen((prev) => !prev)}
            >
              <span className="battle-intel-toggle-label">Battle Intel</span>
              <span className="battle-intel-toggle-count">{totalBattleIntelItems}</span>
            </button>

            <AnimatePresence>
              {battleIntelOpen && (
                <motion.div
                  className="battle-intel-panel"
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  {activeRealmId && (
                    <section className="battle-intel-section">
                      <div className="battle-intel-section-title">Realm</div>
                      <div className="battle-intel-emphasis">{activeRealmName || activeRealmId}</div>
                      {activeRealmDescription && (
                        <div className="battle-intel-copy">{activeRealmDescription}</div>
                      )}
                      {activeRealmModifiers.map((eff, index) => (
                        <div key={`${eff.type}-${index}`} className={`battle-intel-row with-icon ${eff.target}`}>
                          <span className="battle-intel-row-icon" aria-hidden="true">
                            <GameIcon name={getBattleIntelGlyph(eff.type)} size={14} />
                          </span>
                          <span className="battle-intel-row-text">
                            {eff.type.replace(/_/g, ' ')}{eff.value > 0 ? ` +${eff.value}` : ''} ({eff.target})
                          </span>
                        </div>
                      ))}
                    </section>
                  )}

                  {activeProphecies.length > 0 && (
                    <section className="battle-intel-section">
                      <div className="battle-intel-section-title">Prophecies</div>
                      {activeProphecies.map((prophecy) => (
                        <div key={prophecy.id} className={`battle-intel-row ${prophecy.turnsRemaining <= 1 ? 'imminent' : ''}`}>
                          <span className="battle-intel-row-text">{prophecy.name}</span>
                          <span className="battle-intel-timer">{prophecy.turnsRemaining}</span>
                        </div>
                      ))}
                    </section>
                  )}

                  {(wagerIntel.player.length > 0 || wagerIntel.opponent.length > 0) && (
                    <section className="battle-intel-section">
                      <div className="battle-intel-section-title">Wagers</div>
                      {wagerIntel.player.map((effect) => (
                        <div key={`player-${effect.cardName}-${effect.description}`} className="battle-intel-row with-icon player" data-card-family="nft">
                          <span className="battle-intel-row-icon" aria-hidden="true">
                            <GameIcon name="dice" size={14} />
                          </span>
                          <span className="battle-intel-row-text">{effect.description}</span>
                          <span className="battle-intel-source">{effect.cardName}</span>
                        </div>
                      ))}
                      {wagerIntel.opponent.map((effect) => (
                        <div key={`opponent-${effect.cardName}-${effect.description}`} className="battle-intel-row with-icon opponent" data-card-family="nft">
                          <span className="battle-intel-row-icon" aria-hidden="true">
                            <GameIcon name="dice" size={14} />
                          </span>
                          <span className="battle-intel-row-text">{effect.description}</span>
                          <span className="battle-intel-source">{effect.cardName}</span>
                        </div>
                      ))}
                    </section>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Realm shift announcement banner */}
        <AnimatePresence>
          {realmAnnouncement && (
            <motion.div
              className="realm-announcement"
              initial={{ opacity: 0, scale: 1.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <div className="realm-announcement-name">{realmAnnouncement}</div>
              <div className="realm-announcement-desc">Realm Shift</div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="arena-content">
          <UnifiedCombatArena
            onAction={handleAction}
            onEndTurn={handleUnifiedEndTurn}
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            showdownCelebration={showdownCelebration}
            onOpponentHeroClick={handleOpponentHeroClick}
            onPlayerHeroClick={handlePlayerHeroClick}
            isOpponentTargetable={isOpponentTargetable}
            isPlayerTargetable={isPlayerTargetable}
            playerMana={playerMana}
            playerMaxMana={playerMaxMana}
            opponentMana={opponentMana}
            opponentMaxMana={opponentMaxMana}
            playerPet={combatState.player.pet}
            opponentPet={combatState.opponent.pet}
            playerHpCommitted={combatState.player.hpCommitted}
            opponentHpCommitted={combatState.opponent.hpCommitted}
            playerLevel={combatState.player.pet?.stats?.level ?? 1}
            opponentLevel={combatState.opponent.pet?.stats?.level ?? 1}
            playerSecrets={[]}
            playerHeroClass={getCombatHeroClass(combatState.player) ?? 'neutral'}
            onHeroPowerClick={handleHeroPower}
            onWeaponUpgradeClick={handleWeaponUpgrade}
            isWeaponUpgraded={weaponUpgraded}
            heroPowerTargeting={heroPowerTargeting}
            executeHeroPowerEffect={executeHeroPowerEffect}
            handCards={playerHand}
            handCurrentMana={playerMana}
            handIsPlayerTurn={isPlayerTurn}
	            onCardPlay={sharedHandleCardPlay}
            registerCardPosition={sharedRegisterCardPosition}
            battlefieldRef={sharedBattlefieldRef}
            bossQuipText={quipText}
            bossQuipKey={quipKey}
            bossPortrait={bossPortrait}
          />
        </div>

      <TargetingOverlay />
      <CardBurnOverlay />
      <ActionAnnouncement />
      {/* Boss phase screen-flash overlay — fires from useBossPhases */}
      <BossPhaseFlash flash={phaseFlash} />
      {heroBattlePopups.map(popup => (
        <HeroBattlePopup key={popup.id} popup={popup} onComplete={removeHeroBattlePopup} />
      ))}
      <KingPassivePopup />
      <AIAttackAnimationProcessor />
      <PixiParticleCanvas realm={activeRealmId || 'midgard'} />
      <AnimationOverlay />
      
      {/* First Strike is a presentation snapshot; gameplay was committed above. */}
      {firstStrikePresentation && (
        <FirstStrikeAnimation
          target={firstStrikePresentation.target}
          damage={firstStrikePresentation.damage}
          attackerName={firstStrikePresentation.attackerName}
          defenderName={firstStrikePresentation.defenderName}
          onComplete={() => setFirstStrikePresentation(null)}
        />
      )}
      
      {/* Minion Elemental Buff Popup */}
      {elementalBuff.pendingMinionBuff && (
        <ElementBuffPopup
          show={!!elementalBuff.pendingMinionBuff}
          attackBonus={elementalBuff.pendingMinionBuff.attackBonus}
          healthBonus={elementalBuff.pendingMinionBuff.healthBonus}
          element={getCombatElement(elementalBuff.pendingMinionBuff.element)}
          position={elementalBuff.pendingMinionBuff.owner === 'player' ? 'left' : 'right'}
          onComplete={elementalBuff.clearMinionBuffNotification}
        />
      )}
      
      {/* Element Matchup Banner - shows at combat start */}
      {showMatchupBanner && combatState && (
        <ElementMatchupBanner
          playerElement={getCombatElement(combatState.player?.pet?.stats?.element)}
          opponentElement={getCombatElement(combatState.opponent?.pet?.stats?.element)}
          playerHasAdvantage={elementalBuff.playerHasAdvantage}
          opponentHasAdvantage={elementalBuff.opponentHasAdvantage}
          attackBonus={elementalBuff.playerBuff?.attackBonus ?? elementalBuff.opponentBuff?.attackBonus ?? 2}
          healthBonus={elementalBuff.playerBuff?.healthBonus ?? elementalBuff.opponentBuff?.healthBonus ?? 2}
          armorBonus={elementalBuff.playerBuff?.armorBonus ?? elementalBuff.opponentBuff?.armorBonus ?? 20}
        />
      )}

      {/* Spell/Battlecry Targeting Prompt */}
      <TargetingPrompt card={selectedCard} onCancel={() => selectCard(null)} />
      
      {/* Hero Power Targeting Prompt */}
      <HeroPowerPrompt targeting={heroPowerTargeting} onCancel={cancelHeroPowerTargeting} />

      {/* Mulligan Screen - rendered as overlay when mulligan is active */}
      {mulliganActive && gameStateMulligan && (
        <MulliganScreen
          mulligan={gameStateMulligan}
          playerHand={playerHand}
          onMulliganAction={() => {}}
        />
      )}

      {/* Non-blocking Showdown Celebration - replaces old blocking resolution-overlay */}
      {showdownCelebration && !heroDeathState?.isAnimating && (
        <ShowdownCelebration
          resolution={{
            winner: resolution?.winner || showdownCelebration.resolution.winner,
            resolutionType: resolution?.resolutionType || showdownCelebration.resolution.resolutionType,
            playerHand: resolution?.playerHand || showdownCelebration.resolution.playerHand,
            opponentHand: resolution?.opponentHand || showdownCelebration.resolution.opponentHand,
            playerDamage: resolution?.playerDamage ?? showdownCelebration.resolution.playerDamage,
            opponentDamage: resolution?.opponentDamage ?? showdownCelebration.resolution.opponentDamage,
            playerFinalHealth: resolution?.playerFinalHealth ?? showdownCelebration.resolution.playerFinalHealth,
            opponentFinalHealth: resolution?.opponentFinalHealth ?? showdownCelebration.resolution.opponentFinalHealth,
            whoFolded: resolution?.whoFolded || showdownCelebration.resolution.whoFolded,
            foldPenalty: resolution?.foldPenalty || showdownCelebration.resolution.foldPenalty
          }}
          playerHeroId={combatState?.player?.pet?.norseHeroId || 'hero-odin'}
          opponentHeroId={combatState?.opponent?.pet?.norseHeroId || 'hero-loki'}
          onComplete={() => {
            // Clear backup timer - animation completed normally
            if (showdownBackupTimerRef.current) {
              clearTimeout(showdownBackupTimerRef.current);
              showdownBackupTimerRef.current = null;
            }
            setShowdownCelebration(null);
            handleCombatEnd();
          }}
        />
      )}
      
      {/* Hero Death Animation - plays crumble/fade when a hero dies */}
      <AnimatePresence>
        {heroDeathState?.isAnimating && (
          <HeroDeathAnimation
            heroName={heroDeathState.deadHeroName}
            isPlayer={heroDeathState.isPlayerDead}
            onComplete={handleHeroDeathComplete}
          />
        )}
      </AnimatePresence>

      <GameHUD
        turnNumber={turnNumber}
        playerDeckCount={playerDeckCount}
        opponentDeckCount={opponentDeckCount}
        opponentHandCount={opponentHandCount}
        phaseLabel={currentPhaseLabel}
        pot={combatState?.pot ?? 0}
        playerCommitted={combatState?.player.hpCommitted ?? 0}
        opponentCommitted={combatState?.opponent.hpCommitted ?? 0}
        isPlayerTurn={visibleTurnForBanner === 'player'}
        toCall={hudToCall}
        playerElement={combatState ? getCombatElement(combatState.player?.pet?.stats?.element) : undefined}
        opponentElement={combatState ? getCombatElement(combatState.opponent?.pet?.stats?.element) : undefined}
        playerHasAdvantage={elementalBuff.playerHasAdvantage}
        opponentHasAdvantage={elementalBuff.opponentHasAdvantage}
      />

      {/* Game Over Screen - Victory/Defeat */}
      <GameOverScreen
        isVisible={gamePhase === 'game_over'}
        winner={gameOverWinner}
        turnNumber={turnNumber}
        playerHeroName={combatState?.player?.pet?.name ?? 'You'}
        opponentHeroName={combatState?.opponent?.pet?.name ?? 'Opponent'}
        playerHeroClass={getCombatHeroClass(combatState?.player)}
        opponentHeroClass={getCombatHeroClass(combatState?.opponent)}
        playerHeroPortrait={combatState?.player?.pet?.norseHeroId ? resolveHeroPortrait(combatState.player.pet.norseHeroId) : undefined}
        opponentHeroPortrait={combatState?.opponent?.pet?.norseHeroId ? resolveHeroPortrait(combatState.opponent.pet.norseHeroId) : undefined}
        onPlayAgain={onCombatEnd ? () => onCombatEnd(gameOverWinner) : undefined}
        onMainMenu={() => { window.location.hash = '/'; }}
      />

      <GameLog />

    </div>
    </GameViewport>
  );
};

export default RagnarokCombatArena;
