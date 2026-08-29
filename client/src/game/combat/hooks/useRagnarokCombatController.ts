/**
 * useRagnarokCombatController - Main combat controller hook
 * 
 * ARCHITECTURE: This hook centralizes all combat state management and logic
 * for the RagnarokCombatArena component. It extracts:
 * - useState declarations for resolution, betting, celebration, hero power targeting
 * - useRef declarations for AI response tracking, backup timers, card positions
 * - useCallback functions for hero clicks, hero power, weapon upgrades, actions
 * - useGameStore selectors for card game state integration
 * - Computed values for turn state and targetability
 * 
 * The hook integrates with:
 * - usePokerCombatAdapter: Core poker combat state and actions
 * - usePokerAI: AI decision making and response logic
 * - usePokerPhases: Phase transition handling
 * - useCombatTimer: Turn timer countdown
 * - useCombatEvents: Event bus subscriptions, showdown, hero death
 * - useTurnOrchestrator: Phase coordination (Poker → Minion → End-of-Turn)
 * 
 * @param options - Configuration options
 * @param options.onCombatEnd - Callback when combat ends with winner
 * @returns All state, refs, callbacks, and computed values for the arena component
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePokerCombatAdapter, getActionPermissions, getPokerCombatAdapterState } from '../../hooks/usePokerCombatAdapter';
import { useGameStore, selectPlayerHand } from '../../stores/gameStore';
import { usePeerStore } from '../../stores/peerStore';
import { GAME_COMMAND_TYPES } from '../../core/commands';
import { useP2PActions } from '../../context/useP2PActions';
import { useMatchStore } from '../../match';
import { CombatPhase, CombatAction } from '../../types/PokerCombatTypes';
import type { CardInstance } from '../../types';
import { fireAnnouncement } from '../../stores/unifiedUIStore';
import { ALL_NORSE_HEROES } from '../../data/norseHeroes';
import { isValidTargetForHeroPower } from '../../utils/combatUtils';
import { usePokerAI } from './usePokerAI';
import { usePokerPhases } from './usePokerPhases';
import { useCombatTimer } from './useCombatTimer';
import { useCombatEvents, ShowdownCelebration as ShowdownCelebrationState, HeroDeathState } from './useCombatEvents';
import { useTurnOrchestrator } from './useTurnOrchestrator';
import { COMBAT_DEBUG } from '../debugConfig';
import { hasKeyword } from '../../utils/cards/keywordUtils';
import { debug } from '../../config/debugConfig';
import type { HeroBattlePopupData, BattlePopupAction, BattlePopupTarget } from '../components/HeroBattlePopup';
import { validatePokerActionIntent } from '../rules/pokerActionRules';
import { getPokerTurnProcessMode } from '../decision/pokerTurnPolicy';
import { derivePokerDecisionView } from '../decision/pokerDecisionView';
import { getPokerActionPresentation } from '../decision/pokerActionPresentation';
import { emitBettingAction } from '../vfx/events';
import { MAX_MANA } from '../../constants/gameConstants';
import { emitHeroPowerUsed } from '../../actions/gameActions';
import {
	HERO_DEATH_PRESENTATION_BUDGET_MS,
	SHOWDOWN_BACKUP_MS,
} from '../pokerResolutionOutcome';

/**
 * Hero power targeting state structure
 */
export interface HeroPowerTargetingState {
  active: boolean;
  norseHeroId: string;
  targetType: string;
  effectType: string;
  value: number;
  secondaryValue?: number;
  powerName: string;
  heroName: string;
  manaCost: number;
}

/**
 * Hero death animation state structure
 */
export interface HeroDeathAnimationState {
  isAnimating: boolean;
  deadHeroName: string;
  isPlayerDead: boolean;
  pendingResolution: any;
}

export interface UseRagnarokCombatControllerOptions {
  onCombatEnd?: (winner: 'player' | 'opponent' | 'draw') => void;
}

export interface UseRagnarokCombatControllerReturn {
  combatState: ReturnType<typeof usePokerCombatAdapter>['combatState'];
  isActive: boolean;
  resolution: any;
  setResolution: (resolution: any) => void;
  betAmount: number;
  setBetAmount: (amount: number) => void;
  showdownCelebration: ShowdownCelebrationState | null;
  setShowdownCelebration: (celebration: ShowdownCelebrationState | null) => void;
  heroDeathState: HeroDeathAnimationState | null;
  setHeroDeathState: (state: HeroDeathAnimationState | null) => void;
  heroPowerTargeting: HeroPowerTargetingState | null;
  heroPowerUsedThisTurn: boolean;
  weaponUpgraded: boolean;
  mulliganActive: boolean | undefined;
  gameStateMulligan: any;
  
  aiResponseInProgressRef: React.MutableRefObject<boolean>;
  showdownBackupTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  sharedBattlefieldRef: React.RefObject<HTMLDivElement | null>;
  cardPositionsRef: React.MutableRefObject<Map<string, { x: number; y: number }>>;
  
  currentTurn: 'player' | 'opponent' | undefined;
  playerHand: CardInstance[];
  attackingCard: any;
  selectedCard: any;
  playerMana: number;
  playerMaxMana: number;
  opponentMana: number;
  opponentMaxMana: number;
  
  isPlayerTurn: boolean;
  isOpponentTargetable: boolean;
  isPlayerTargetable: boolean;
  
  sharedRegisterCardPosition: (card: any, position: { x: number; y: number }) => void;
  sharedHandleCardPlay: (card: any, position?: { row?: number; col?: number }) => void;
  handleOpponentHeroClick: () => void;
  handlePlayerHeroClick: () => void;
  executeHeroPowerEffect: (norseHero: any, heroPower: any, target: any) => void;
  handleHeroPower: () => void;
  cancelHeroPowerTargeting: () => void;
  handleWeaponUpgrade: () => void;
  handleAction: (action: CombatAction, hp?: number) => void;
  handleCombatEnd: () => void;
	handleHeroDeathComplete: () => void;
	handleUnifiedEndTurn: () => void;
  
  turnPhase: string;
  orchestratorTurn: number;
  advanceTurnPhase: () => any;
  
  endTurn: () => void;
  grantPokerHandRewards: () => void;
  endCombat: () => void;
  performAction: ReturnType<typeof usePokerCombatAdapter>['performAction'];
  applyDirectDamage: ReturnType<typeof usePokerCombatAdapter>['applyDirectDamage'];

  heroBattlePopups: HeroBattlePopupData[];
  removeHeroBattlePopup: (id: string) => void;
}

export function useRagnarokCombatController(
  options: UseRagnarokCombatControllerOptions = {}
): UseRagnarokCombatControllerReturn {
  const { onCombatEnd } = options;
  
  const { 
    combatState, 
    isActive,
    mulliganComplete,
    completeMulligan,
    performAction, 
    advancePhase,
    maybeCloseBettingRound,
    resolveCombat,
    startNextHand,
    updateTimer,
    endCombat,
    applyDirectDamage
  } = usePokerCombatAdapter();
  
  const [resolution, setResolution] = useState<any>(null);
  const [betAmount, setBetAmount] = useState(10);
  
  const [showdownCelebration, setShowdownCelebration] = useState<ShowdownCelebrationState | null>(null);
  
  const [heroDeathState, setHeroDeathState] = useState<HeroDeathAnimationState | null>(null);
  
  const [heroPowerTargeting, setHeroPowerTargeting] = useState<HeroPowerTargetingState | null>(null);

  const [heroBattlePopups, setHeroBattlePopups] = useState<HeroBattlePopupData[]>([]);

  const addHeroBattlePopup = useCallback((params: { action: BattlePopupAction; target: BattlePopupTarget; text: string; subtitle?: string }) => {
    const popup: HeroBattlePopupData = {
      ...params,
      id: `hbp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now()
    };
    setHeroBattlePopups(prev => [...prev, popup]);
  }, []);

  const removeHeroBattlePopup = useCallback((id: string) => {
    setHeroBattlePopups(prev => prev.filter(p => p.id !== id));
  }, []);

  const aiResponseInProgressRef = useRef(false);
  const p2pActions = useP2PActions();
  const activeMatch = useMatchStore(state => state.activeMatch);
  const connectionState = usePeerStore(state => state.connectionState);
  const opponentKind = activeMatch?.opponent.kind ?? null;
  const isP2PCombat = opponentKind === 'peer';
  const pokerTurnProcessMode = getPokerTurnProcessMode(isP2PCombat);
  const p2pTransportConnected = connectionState === 'connected';
  const isP2PActionLocked = isP2PCombat && !p2pTransportConnected;

  usePokerAI({
    combatState,
    isActive: isActive && pokerTurnProcessMode === 'local_ai',
    aiResponseInProgressRef,
    addHeroBattlePopup
  });

  usePokerPhases({
    combatState,
    isActive: isActive && !isP2PActionLocked,
    processMode: pokerTurnProcessMode,
  });

  useCombatTimer({
    combatState,
    // The absolute Poker deadline belongs to the combat state, not the
    // transport. Disconnects lock input/phase advancement, but never pause or
    // restart the decision clock.
    isActive,
    updateTimer,
    isP2PCombat,
    opponentKind,
    p2pTransportConnected,
    sendPokerAction: p2pActions.sendPokerAction,
    sendPokerTurnStarted: p2pActions.sendPokerTurnStarted,
    confirmMulligan: () => p2pActions.dispatchGameCommand({ type: GAME_COMMAND_TYPES.confirmMulligan }),
    addHeroBattlePopup,
  });
  
  useCombatEvents({
    combatState,
    isActive,
    onShowdownCelebration: setShowdownCelebration,
    onHeroDeath: setHeroDeathState,
    resolveCombat,
    setResolution
  });
  
  const onPhaseChangeCb = useCallback((from: string, to: string, context: { turnNumber: number }) => {
    if (COMBAT_DEBUG.PHASES) {
      debug.combat(`[TurnOrchestrator] Phase: ${from} → ${to} (Turn ${context.turnNumber})`);
    }
  }, []);

  const {
    currentPhase: turnPhase,
    turnNumber: orchestratorTurn,
    completePhase: advanceTurnPhase,
    startTurn: startOrchestratorTurn
  } = useTurnOrchestrator({
    onPhaseChange: onPhaseChangeCb
  });
  
  const showdownBackupTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const sharedBattlefieldRef = useRef<HTMLDivElement>(null);
  
  const cardPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const handEndProcessedRef = useRef(false);
  const combatEndFiredRef = useRef(false);
  const combatEndRetryCountRef = useRef(0);
  const heroPowerProcessingRef = useRef(false);
  const weaponUpgradeProcessingRef = useRef(false);

  const sharedRegisterCardPosition = useCallback((card: any, position: { x: number; y: number }) => {
    const cardId = card?.instanceId || card?.id;
    if (cardId && position) {
      cardPositionsRef.current.set(cardId, position);
    }
  }, []);

  const currentTurn = useGameStore(state => state.gameState?.currentTurn);
  const mulliganActive = useGameStore(state => state.gameState?.mulligan?.active);
  const gameStateMulligan = useGameStore(state => state.gameState?.mulligan);
  const playerHand = useGameStore(selectPlayerHand);
  const attackingCard = useGameStore(state => state.attackingCard);
  const selectedCard = useGameStore(state => state.selectedCard);
  const selectAttacker = useGameStore(state => state.selectAttacker);
  const heroTargetMode = useGameStore(state => state.heroTargetMode);
  const playerMana = useGameStore(state => state.gameState?.players?.player?.mana?.current ?? 0);
  const playerMaxMana = useGameStore(state => state.gameState?.players?.player?.mana?.max ?? MAX_MANA);
  const opponentMana = useGameStore(state => state.gameState?.players?.opponent?.mana?.current ?? 0);
  const opponentMaxMana = useGameStore(state => state.gameState?.players?.opponent?.mana?.max ?? MAX_MANA);
  
  const pokerDecisionView = derivePokerDecisionView({
    combatState,
    connectionState,
    isP2PCombat,
    permissions: getActionPermissions(combatState, true),
  });
  // During Poker, activePlayerId + deadline are the only local-action
  // authority. currentTurn remains a card-game presentation field outside
  // Poker and must not gate auxiliary Poker actions.
  const isPlayerTurn = combatState ? pokerDecisionView.localCanAct : currentTurn === 'player';
  const isOpponentTargetable: boolean = !!(isPlayerTurn && (!!attackingCard || !!heroTargetMode ||
    (!!selectedCard && (selectedCard.card.type === 'spell' ||
      (selectedCard.card.type === 'minion' && hasKeyword(selectedCard, 'battlecry'))))));
  const isPlayerTargetable: boolean = !!(isPlayerTurn &&
    (!!selectedCard && (selectedCard.card.type === 'spell' ||
      (selectedCard.card.type === 'minion' && hasKeyword(selectedCard, 'battlecry')))));
  
  const selectCard = useGameStore(state => state.selectCard);
  const dispatchPlayCardCommand = useCallback((
    cardId: string,
    targetId?: string,
    targetType?: 'minion' | 'hero',
    insertionIndex?: number,
    payWithBlood?: boolean
  ) => {
    p2pActions.dispatchGameCommand({
      type: GAME_COMMAND_TYPES.playCard,
      cardId,
      targetId,
      targetType,
      insertionIndex,
      payWithBlood,
    });
  }, [p2pActions]);

  const dispatchAttackCommand = useCallback((attackerId: string, defenderId?: string) => {
    p2pActions.dispatchGameCommand({
      type: GAME_COMMAND_TYPES.attack,
      attackerId,
      defenderId,
    });
  }, [p2pActions]);

  const endTurn = useCallback(() => {
    p2pActions.dispatchGameCommand({ type: GAME_COMMAND_TYPES.endTurn });
  }, [p2pActions]);
  
  const sharedHandleCardPlay = useCallback((card: any, position?: { row?: number; col?: number; insertionIndex?: number }) => {
    if (!isPlayerTurn) {
      return;
    }
    const cardId = card?.instanceId || card?.id || card?.card?.id;
    if (!cardId) {
      return;
    }
    dispatchPlayCardCommand(cardId, undefined, undefined, position?.insertionIndex);
  }, [isPlayerTurn, dispatchPlayCardCommand]);
  
  const [heroPowerUsedThisTurn, setHeroPowerUsedThisTurn] = useState(false);
  
  const [weaponUpgraded, setWeaponUpgraded] = useState(false);
  
  useEffect(() => {
    if (combatState?.combatId) {
      setHeroPowerUsedThisTurn(false);
      setWeaponUpgraded(false);
    }
  }, [combatState?.combatId]);
  
  useEffect(() => {
    if (!isActive) {
      setWeaponUpgraded(false);
      combatEndFiredRef.current = false;
    }
  }, [isActive]);
  
  const executeHeroPowerEffect = useCallback((norseHero: any, heroPower: any, target: any) => {
    if (combatState && !isPlayerTurn) return;

    const targetId = target?.isHero === true
      ? (target.isOpponent === true ? 'opponent-hero' : 'player-hero')
      : target?.instanceId;
    const targetType = target?.isHero === true ? 'hero' : targetId ? 'minion' : undefined;
    const actionId = crypto.randomUUID();

    p2pActions.dispatchGameCommand({
      type: GAME_COMMAND_TYPES.norseHeroPower,
      norseHeroId: norseHero.id,
      targetId,
      targetType,
      actionId,
    });

    const targetName = target?.isHero === true
      ? (target.isOpponent === true ? ' on enemy hero' : ' on your hero')
      : target?.card?.name ? ` on ${target.card.name}` : '';
    fireAnnouncement('spell', `${norseHero.name} uses ${heroPower.name}${targetName}!`, { duration: 2000 });
    emitHeroPowerUsed({
      player: 'player',
      heroPowerName: typeof heroPower?.name === 'string' ? heroPower.name : 'Hero Power',
      cost: typeof heroPower?.cost === 'number' ? heroPower.cost : 0,
    });
    setHeroPowerUsedThisTurn(true);
    setHeroPowerTargeting(null);
  }, [combatState, isPlayerTurn, p2pActions, setHeroPowerTargeting]);
  
  const handleHeroPower = useCallback(() => {
    if (heroPowerProcessingRef.current) return;
    if (combatState && !isPlayerTurn) return;
    heroPowerProcessingRef.current = true;

    if (COMBAT_DEBUG.PHASES) {
      debug.combat('[handleHeroPower] Called!');
    }

    const currentGameState = useGameStore.getState();
    const playerHeroPower = currentGameState.gameState?.players?.player?.heroPower;
    if (playerHeroPower?.used) {
      if (COMBAT_DEBUG.PHASES) {
        debug.combat('[handleHeroPower] Blocked: Already used this turn (gameStore)');
      }
      heroPowerProcessingRef.current = false;
      return;
    }

    const norseHeroId = combatState?.player?.pet?.norseHeroId;
    if (!norseHeroId) {
      if (COMBAT_DEBUG.PHASES) {
        debug.combat('[handleHeroPower] Blocked: No norseHeroId found');
      }
      heroPowerProcessingRef.current = false;
      return;
    }

    if (!combatState) {
      if (COMBAT_DEBUG.PHASES) {
        debug.combat('[handleHeroPower] Blocked: No combatState');
      }
      heroPowerProcessingRef.current = false;
      return;
    }

    const norseHero = ALL_NORSE_HEROES[norseHeroId];
    if (!norseHero) {
      if (COMBAT_DEBUG.PHASES) {
        debug.combat('[handleHeroPower] Blocked: norseHero not found for ID:', norseHeroId);
      }
      heroPowerProcessingRef.current = false;
      return;
    }

    const heroPower = norseHero.heroPower;
    const manaCost = heroPower.cost;
    const currentMana = playerMana;

    if (COMBAT_DEBUG.PHASES) {
      debug.combat('[handleHeroPower] Hero:', norseHero.name, 'Power:', heroPower.name, 'Cost:', manaCost, 'Current mana:', currentMana);
    }

    if (currentMana < manaCost) {
      if (COMBAT_DEBUG.PHASES) {
        debug.combat('[handleHeroPower] Blocked: Not enough mana');
      }
      heroPowerProcessingRef.current = false;
      return;
    }

    if (heroPowerUsedThisTurn) {
      if (COMBAT_DEBUG.PHASES) {
        debug.combat('[handleHeroPower] Blocked: heroPowerUsedThisTurn is true');
      }
      heroPowerProcessingRef.current = false;
      return;
    }

    const targetType = heroPower.targetType || 'none';

    const noTargetTypes = ['none', 'self', 'all_enemies', 'all_friendly', 'random_enemy', 'random_friendly'];

    if (noTargetTypes.includes(targetType)) {
      if (COMBAT_DEBUG.PHASES) {
        debug.combat('[handleHeroPower] Executing immediately (no target needed), targetType:', targetType);
      }
      executeHeroPowerEffect(norseHero, heroPower, null);
      heroPowerProcessingRef.current = false;
      return;
    }

    if (COMBAT_DEBUG.PHASES) {
      debug.combat('[handleHeroPower] Entering targeting mode, targetType:', targetType);
    }
    setHeroPowerTargeting({
      active: true,
      norseHeroId,
      targetType,
      effectType: heroPower.effectType,
      value: heroPower.value || 0,
      secondaryValue: heroPower.secondaryValue,
      powerName: heroPower.name,
      heroName: norseHero.name,
      manaCost
    });
    fireAnnouncement('spell', `Select a target for ${heroPower.name}`, { duration: 3000 });
    heroPowerProcessingRef.current = false;
  }, [combatState, heroPowerUsedThisTurn, isPlayerTurn, playerMana, executeHeroPowerEffect]);
  
  const cancelHeroPowerTargeting = useCallback(() => {
    if (heroPowerTargeting?.active) {
      setHeroPowerTargeting(null);
    }
  }, [heroPowerTargeting]);
  
  const handleWeaponUpgrade = useCallback(() => {
    if (weaponUpgradeProcessingRef.current) return;
    if (combatState && !isPlayerTurn) return;
    weaponUpgradeProcessingRef.current = true;

    const norseHeroId = combatState?.player?.pet?.norseHeroId;
    if (!norseHeroId) {
      weaponUpgradeProcessingRef.current = false;
      return;
    }

    if (!combatState) {
      weaponUpgradeProcessingRef.current = false;
      return;
    }

    const norseHero = ALL_NORSE_HEROES[norseHeroId];
    if (!norseHero) {
      weaponUpgradeProcessingRef.current = false;
      return;
    }

    const weaponCost = norseHero.weaponUpgrade.manaCost;
    const currentMana = playerMana;

    if (currentMana < weaponCost) {
      weaponUpgradeProcessingRef.current = false;
      return;
    }

    if (weaponUpgraded) {
      weaponUpgradeProcessingRef.current = false;
      return;
    }

    p2pActions.dispatchGameCommand({
      type: GAME_COMMAND_TYPES.weaponUpgrade,
      norseHeroId,
      actionId: crypto.randomUUID(),
    });
    fireAnnouncement('spell', `${norseHero.name} equips ${norseHero.weaponUpgrade.name}!`, { duration: 2500 });
    setWeaponUpgraded(true);

    weaponUpgradeProcessingRef.current = false;
  }, [combatState, isPlayerTurn, weaponUpgraded, p2pActions, playerMana]);
  
  const handleOpponentHeroClick = useCallback(() => {
    if (heroPowerTargeting?.active) {
      if (isValidTargetForHeroPower(heroPowerTargeting.targetType, { isMinion: false, isHero: true, isFriendly: false })) {
        const norseHero = ALL_NORSE_HEROES[heroPowerTargeting.norseHeroId];
        if (norseHero) {
          executeHeroPowerEffect(norseHero, norseHero.heroPower, { isHero: true, isOpponent: true });
        }
        return;
      } else {
        return;
      }
    }
    
    if (!isOpponentTargetable) return;
    
    if (selectedCard && selectedCard.card.type === 'spell') {
      const spellEffect = selectedCard.card.spellEffect;
      const targetType = spellEffect?.targetType || '';
      const allowsEnemyHero = targetType.includes('character') ||
        targetType.includes('any') ||
        targetType.includes('enemy') ||
        targetType.includes('hero') ||
        targetType.includes('any_character') ||
        !targetType.includes('minion');
      if (allowsEnemyHero) {
        dispatchPlayCardCommand(selectedCard.instanceId, 'opponent-hero', 'hero');
        selectCard(null);
        return;
      }
    }
    
    // Handle both card.card.battlecry and card.battlecry structures
    const selectedCardType = (selectedCard?.card as any)?.type || (selectedCard as any)?.type;
    const selectedBattlecry = (selectedCard?.card as any)?.battlecry || (selectedCard as any)?.battlecry;
    
    if (selectedCard && selectedCardType === 'minion' && selectedBattlecry?.requiresTarget) {
      const targetType = selectedBattlecry.targetType || '';
      const allowsEnemyHero = targetType.includes('character') ||
        targetType.includes('any') ||
        targetType.includes('enemy') ||
        targetType.includes('hero') ||
        targetType.includes('any_character') ||
        !targetType.includes('minion');
      if (allowsEnemyHero) {
        debug.combat('[Battlecry Debug] Playing minion with battlecry targeting opponent hero');
        dispatchPlayCardCommand(selectedCard.instanceId, 'opponent-hero', 'hero');
        selectCard(null);
        return;
      }
    }
    
    if (attackingCard) {
      dispatchAttackCommand(attackingCard.instanceId, 'opponent-hero');
      selectAttacker(null);
    }
  }, [isOpponentTargetable, attackingCard, dispatchAttackCommand, selectAttacker, selectedCard, dispatchPlayCardCommand, selectCard, heroPowerTargeting, executeHeroPowerEffect]);
  
  const handlePlayerHeroClick = useCallback(() => {
    if (heroPowerTargeting?.active) {
      if (isValidTargetForHeroPower(heroPowerTargeting.targetType, { isMinion: false, isHero: true, isFriendly: true })) {
        const norseHero = ALL_NORSE_HEROES[heroPowerTargeting.norseHeroId];
        if (norseHero) {
          executeHeroPowerEffect(norseHero, norseHero.heroPower, { isHero: true, isOpponent: false });
        }
        return;
      } else {
        return;
      }
    }
    
    if (!isPlayerTargetable) return;
    
    if (selectedCard && selectedCard.card.type === 'spell') {
      const spellEffect = selectedCard.card.spellEffect;
      const targetType = spellEffect?.targetType || '';
      const allowsFriendlyHero = targetType.includes('character') ||
        targetType.includes('any') ||
        targetType.includes('friendly') ||
        targetType.includes('hero') ||
        targetType.includes('any_character') ||
        !targetType.includes('minion') && !targetType.includes('enemy');
      if (allowsFriendlyHero) {
        dispatchPlayCardCommand(selectedCard.instanceId, 'player-hero', 'hero');
        selectCard(null);
        return;
      }
    }
    
    // Handle both card.card.battlecry and card.battlecry structures for player hero targeting
    const selectedCardTypeP = (selectedCard?.card as any)?.type || (selectedCard as any)?.type;
    const selectedBattlecryP = (selectedCard?.card as any)?.battlecry || (selectedCard as any)?.battlecry;
    
    if (selectedCard && selectedCardTypeP === 'minion' && selectedBattlecryP?.requiresTarget) {
      const targetType = selectedBattlecryP.targetType || '';
      const allowsFriendlyHero = targetType.includes('character') ||
        targetType.includes('any') ||
        targetType.includes('friendly') ||
        targetType.includes('hero') ||
        targetType.includes('any_character') ||
        !targetType.includes('minion') && !targetType.includes('enemy');
      if (allowsFriendlyHero) {
        debug.combat('[Battlecry Debug] Playing minion with battlecry targeting player hero');
        dispatchPlayCardCommand(selectedCard.instanceId, 'player-hero', 'hero');
        selectCard(null);
        return;
      }
    }
  }, [isPlayerTargetable, selectedCard, dispatchPlayCardCommand, selectCard, heroPowerTargeting, executeHeroPowerEffect]);
  
  useEffect(() => {
    if (!selectedCard) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selectCard(null);
      }
    };
    
    const handleRightClick = (e: MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault();
        selectCard(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleRightClick);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleRightClick);
    };
  }, [selectedCard, selectCard]);

  const prevMulliganActiveRef = useRef<boolean | undefined>(undefined);
  
  const [mulliganProcessed, setMulliganProcessed] = useState(false);
  const [mulliganArmed, setMulliganArmed] = useState(false);
  
  useEffect(() => {
    if (combatState?.combatId) {
      setMulliganProcessed(false);
      setMulliganArmed(false);
      prevMulliganActiveRef.current = undefined;
    }
  }, [combatState?.combatId]);
  
  useEffect(() => {
    if (mulliganComplete || mulliganProcessed) {
      return;
    }
    
    if (combatState?.phase !== CombatPhase.MULLIGAN) {
      return;
    }
    
    const wasActive = prevMulliganActiveRef.current;
    const isNowActive = mulliganActive === true;
    const isNowInactive = mulliganActive === false;
    
    prevMulliganActiveRef.current = mulliganActive;
    
    if (isNowActive && !mulliganArmed) {
      setMulliganArmed(true);
      return;
    }
    
    if (mulliganArmed && isNowInactive) {
      setMulliganProcessed(true);
      completeMulligan();
    }
  }, [mulliganActive, combatState?.phase, completeMulligan, mulliganProcessed, mulliganArmed, mulliganComplete]);
  
  const grantPokerHandRewards = useGameStore(state => state.grantPokerHandRewards);
  
  const handleAction = useCallback((action: CombatAction, hp?: number) => {
    if (combatState && !isPlayerTurn) return;
    if (isP2PActionLocked) {
      fireAnnouncement('warning', 'P2P reconnecting', {
        subtitle: 'Actions resume when the peer connection recovers.',
        duration: 1800,
      });
      return;
    }
    const freshState = getPokerCombatAdapterState().combatState;
    if (!freshState || freshState.player.isReady) {
      return;
    }
    const validation = validatePokerActionIntent({
      combatState: freshState,
      playerId: freshState.player.playerId,
      action,
      hpCommitment: hp,
    });
    if (!validation.ok) {
      debug.combat('[CombatController] poker action rejected before send', {
        action,
        reason: validation.reason,
      });
      return;
    }
    if (isP2PCombat && !freshState.turnId) {
      debug.combat('[CombatController] poker action rejected before send: missing turnId');
      return;
    }

    const feedback = getPokerActionPresentation({
      actor: 'player',
      action,
      amount: hp,
    });
    if (feedback.showPopup) {
      addHeroBattlePopup({
        action: feedback.action,
        target: feedback.target,
        text: feedback.text,
        subtitle: feedback.subtitle,
      });
    }

    // In P2P multiplayer, both peers apply the same deterministic poker action.
    // The P2P protocol layer owns the wire shape; this controller only commits
    // the player's decision against the shared poker rules.
    const connectedP2P = isP2PCombat && p2pTransportConnected;
    if (connectedP2P) {
      p2pActions.sendPokerAction({
        playerId: freshState.player.playerId,
        action,
				origin: 'player',
        hpCommitment: hp,
        turnId: freshState.turnId,
      });
    }
    performAction(freshState.player.playerId, action, hp);
    maybeCloseBettingRound();

    // Trigger poker drama VFX for the betting action (post-commit)
    emitBettingAction({ phase: freshState.phase, action, side: 'player' });

    if (action === CombatAction.BRACE && !connectedP2P) {
      endTurn();
    }
    if (connectedP2P) {
      return;
    }

    // VS AI and campaign AI are owned by usePokerAI. Keeping AI scheduling out
    // of the click handler prevents duplicate decisions and keeps P2P separate.
  }, [
    performAction,
    maybeCloseBettingRound,
    endTurn,
    addHeroBattlePopup,
    p2pActions,
    isP2PActionLocked,
    isP2PCombat,
    isPlayerTurn,
    p2pTransportConnected,
  ]);
  
  useEffect(() => {
    if (resolution) {
      handEndProcessedRef.current = false;
      combatEndFiredRef.current = false;
      combatEndRetryCountRef.current = 0;
    }
  }, [resolution]);
  
  const handleCombatEnd = useCallback(() => {
    if (!resolution) return;
    if (handEndProcessedRef.current) {
      debug.combat('[handleCombatEnd] Blocked: already processed this hand end');
      return;
    }
    const mulliganStillActive = useGameStore.getState().gameState?.mulligan?.active;
    if (mulliganStillActive) return;

    const discoveryActive = useGameStore.getState().gameState?.discovery?.active;
    if (discoveryActive) {
      combatEndRetryCountRef.current += 1;
      if (combatEndRetryCountRef.current >= 20) {
        debug.warn('[handleCombatEnd] Discovery retry limit reached (20) — forcing combat end');
        handEndProcessedRef.current = true;
      } else {
        debug.combat(`[handleCombatEnd] Discovery active — will retry in 500ms (attempt ${combatEndRetryCountRef.current}/20)`);
        setTimeout(() => handleCombatEnd(), 500);
        return;
      }
    }

    combatEndRetryCountRef.current = 0;
    handEndProcessedRef.current = true;
    cardPositionsRef.current.clear();

    advanceTurnPhase();

    grantPokerHandRewards();

    getPokerCombatAdapterState().startNextHandDelayed(resolution);
    setResolution(null);
  }, [resolution, grantPokerHandRewards, advanceTurnPhase]);

  const handleCombatEndRef = useRef(handleCombatEnd);
  useEffect(() => {
    handleCombatEndRef.current = handleCombatEnd;
  }, [handleCombatEnd]);

  useEffect(() => {
    if (showdownCelebration && !heroDeathState?.isAnimating) {
      // Commit the resolved hand immediately. The celebration is a retained
      // presentation snapshot and must not own phase/reward progression.
      if (resolution) handleCombatEndRef.current();

      if (showdownBackupTimerRef.current) {
        clearTimeout(showdownBackupTimerRef.current);
      }
      
      showdownBackupTimerRef.current = setTimeout(() => {
        if (combatEndFiredRef.current) return;
        combatEndFiredRef.current = true;
        const mulliganStillActive = useGameStore.getState().gameState?.mulligan?.active;
        if (mulliganStillActive) { combatEndFiredRef.current = false; return; }
        debug.warn('[RagnarokCombatArena] Showdown backup timer fired - forcing combat end', { hasResolution: !!resolution });
        setShowdownCelebration(null);
        handleCombatEndRef.current();
      }, SHOWDOWN_BACKUP_MS);
    }
    
    return () => {
      if (showdownBackupTimerRef.current) {
        clearTimeout(showdownBackupTimerRef.current);
        showdownBackupTimerRef.current = null;
      }
    };
  // handleCombatEnd is read through a ref so the backup timer is not
  // recreated on every render.
  }, [showdownCelebration, heroDeathState?.isAnimating, resolution]);

  // RESOLUTION phase escape timer — safety net for rare freezes where showdown never triggers
  const resolutionEscapeRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const phase = combatState?.phase;
    if (phase === CombatPhase.RESOLUTION && !showdownCelebration && !heroDeathState && isActive) {
      if (resolutionEscapeRef.current) clearTimeout(resolutionEscapeRef.current);
      resolutionEscapeRef.current = setTimeout(() => {
        if (combatEndFiredRef.current) return;
        combatEndFiredRef.current = true;
        const adapter = getPokerCombatAdapterState();
        const currentPhase = adapter.combatState?.phase;
        if (currentPhase === CombatPhase.RESOLUTION) {
          debug.warn('[ResolutionEscape] Stuck in RESOLUTION for 3s — forcing next hand');
          cardPositionsRef.current.clear();
          adapter.setTransitioning(false);
          advanceTurnPhase();
          grantPokerHandRewards();
          adapter.startNextHand();
        }
      }, 3000);
    } else {
      if (resolutionEscapeRef.current) {
        clearTimeout(resolutionEscapeRef.current);
        resolutionEscapeRef.current = null;
      }
    }
    return () => {
      if (resolutionEscapeRef.current) {
        clearTimeout(resolutionEscapeRef.current);
        resolutionEscapeRef.current = null;
      }
    };
  }, [combatState?.phase, showdownCelebration, heroDeathState, isActive, advanceTurnPhase, grantPokerHandRewards]);

  const heroDeathFinishedRef = useRef(false);
  useEffect(() => {
    if (heroDeathState?.isAnimating) {
      heroDeathFinishedRef.current = false;
    }
  }, [heroDeathState?.isAnimating]);

  const handleHeroDeathComplete = useCallback(() => {
    if (!heroDeathState) return;
    if (heroDeathFinishedRef.current) return;
    heroDeathFinishedRef.current = true;

    const pendingWinner = heroDeathState.pendingResolution?.winner;
    let winner: 'player' | 'opponent' | 'draw' = heroDeathState.isPlayerDead ? 'opponent' : 'player';
    if (pendingWinner === 'player' || pendingWinner === 'opponent' || pendingWinner === 'draw') {
      winner = pendingWinner;
    }

    setHeroDeathState(null);
    setShowdownCelebration(null);

    if (onCombatEnd) {
      onCombatEnd(winner);
    }
    endCombat();
  }, [heroDeathState, onCombatEnd, endCombat]);

  const handleHeroDeathCompleteRef = useRef(handleHeroDeathComplete);
  handleHeroDeathCompleteRef.current = handleHeroDeathComplete;
  useEffect(() => {
    if (!heroDeathState?.isAnimating) return;
    const timer = setTimeout(() => {
      debug.warn('[HeroDeath] presentation budget exceeded — completing combat');
      handleHeroDeathCompleteRef.current();
    }, HERO_DEATH_PRESENTATION_BUDGET_MS);
    return () => clearTimeout(timer);
  }, [heroDeathState?.isAnimating]);

  const handleUnifiedEndTurn = useCallback(() => {
    if (!combatState) return;
    if (!isPlayerTurn) return;
    if (isP2PActionLocked) {
      fireAnnouncement('warning', 'P2P reconnecting', {
        subtitle: 'Actions resume when the peer connection recovers.',
        duration: 1800,
      });
      return;
    }

    if (!combatState.player.isReady) {
      performAction(combatState.player.playerId, CombatAction.DEFEND);
    }
    
    endTurn();
    
  }, [combatState, endTurn, isP2PActionLocked, isPlayerTurn, performAction]);

  return {
    combatState,
    isActive,
    resolution,
    setResolution,
    betAmount,
    setBetAmount,
    showdownCelebration,
    setShowdownCelebration,
    heroDeathState,
    setHeroDeathState,
    heroPowerTargeting,
    heroPowerUsedThisTurn,
    weaponUpgraded,
    mulliganActive,
    gameStateMulligan,
    
    aiResponseInProgressRef,
    showdownBackupTimerRef,
    sharedBattlefieldRef,
    cardPositionsRef,
    
    currentTurn,
    playerHand,
    attackingCard,
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
    
    turnPhase,
    orchestratorTurn,
    advanceTurnPhase,
    
    endTurn,
    grantPokerHandRewards,
    endCombat,
    performAction,
    applyDirectDamage,

    heroBattlePopups,
    removeHeroBattlePopup
  };
}
