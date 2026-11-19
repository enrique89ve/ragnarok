/**
 * useRagnarokCombatController - Main combat controller hook
 * 
 * ARCHITECTURE: This hook centralizes all combat state management and logic
 * for the RagnarokCombatArena component. It extracts:
 * - Local betting and hero power targeting state
 * - Refs for AI response tracking and card positions
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
import { isOpeningMulliganGatingPoker } from '../../utils/mulliganUtils';
import { usePeerStore } from '../../stores/peerStore';
import { GAME_COMMAND_TYPES, createPokerHandRewardsCommand } from '../../core/commands';
import { useP2PActions } from '../../context/useP2PActions';
import { useMatchStore } from '../../match';
import { CombatPhase, CombatAction, type PokerResolvedHand } from '../../types/PokerCombatTypes';
import type { CardInstance } from '../../types';
import { fireAnnouncement } from '../../stores/unifiedUIStore';
import { ALL_NORSE_HEROES } from '../../data/norseHeroes';
import { isValidTargetForHeroPower } from '../../utils/combatUtils';
import { usePokerAI } from './usePokerAI';
import { usePokerPhases } from './usePokerPhases';
import { useCombatTimer } from './useCombatTimer';
import { useCombatEvents, type ShowdownCelebration as ShowdownCelebrationState } from './useCombatEvents';
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
import { computePokerCombatStateHash } from '../../p2p/phaseBoundaryRoot';
import { commitNextP2PCanonicalAction } from '../../p2p/canonicalActionOrder';
import { recordMove } from '../../../data/blockchain/transcriptBuilder';
import { localPlayerId } from '../../../data/blockchain/playerIdentity';
import { getNFTBridge } from '../../nft';
import { getCanonicalPokerActionNowMs } from '../../../../../shared/p2p-wire/pokerTurnClock';
import {
	progressResolvedPokerHand,
	type HeroDeathPresentation,
	type PokerCombatWinner,
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

export interface UseRagnarokCombatControllerOptions {
  onCombatEnd?: (winner: PokerCombatWinner, presentation?: HeroDeathPresentation) => void;
}

export interface UseRagnarokCombatControllerReturn {
  combatState: ReturnType<typeof usePokerCombatAdapter>['combatState'];
  isActive: boolean;
  betAmount: number;
  setBetAmount: (amount: number) => void;
  showdownCelebration: ShowdownCelebrationState | null;
  dismissShowdown: (snapshot: ShowdownCelebrationState) => void;
  heroPowerTargeting: HeroPowerTargetingState | null;
  heroPowerUsedThisTurn: boolean;
  weaponUpgraded: boolean;
  mulliganActive: boolean | undefined;
  gameStateMulligan: any;
  
  aiResponseInProgressRef: React.MutableRefObject<boolean>;
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
  handleOpponentHeroClick: () => void;
  handlePlayerHeroClick: () => void;
  executeHeroPowerEffect: (norseHero: any, heroPower: any, target: any) => void;
  handleHeroPower: () => void;
  cancelHeroPowerTargeting: () => void;
  handleWeaponUpgrade: () => void;
  handleAction: (action: CombatAction, hp?: number) => void;
	handleUnifiedEndTurn: () => void;
  
  turnPhase: string;
  orchestratorTurn: number;
  advanceTurnPhase: () => any;
  
  endTurn: () => void;
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
    lastResolvedHand,
    isActive,
    mulliganComplete,
    completeMulligan,
    performAction, 
    maybeCloseBettingRound,
    updateTimer,
    endCombat,
    applyDirectDamage
  } = usePokerCombatAdapter();
  
  const [betAmount, setBetAmount] = useState(10);
  
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
  const integrityError = usePeerStore(state => state.p2pIntegrityError);
  const p2pSessionAuthorized = usePeerStore(state => state.p2pSessionLocalAuthorized && state.p2pSessionRemoteAuthorized);
  const opponentKind = activeMatch?.opponent.kind ?? null;
  const isP2PCombat = opponentKind === 'peer';
  const pokerTurnProcessMode = getPokerTurnProcessMode(isP2PCombat);
  const p2pTransportConnected = connectionState === 'connected';
  const isP2PActionLocked = isP2PCombat && (!p2pTransportConnected || Boolean(integrityError));

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
  
  const { showdownCelebration, dismissShowdown } = useCombatEvents(combatState, lastResolvedHand);

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
  
  const sharedBattlefieldRef = useRef<HTMLDivElement>(null);
  
  const cardPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
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
  const openingMulliganGatingPoker = useGameStore(state => isOpeningMulliganGatingPoker(state.gameState));
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
  const isPlayerTurn = combatState
    ? pokerDecisionView.localCanAct && !isP2PActionLocked
    : currentTurn === 'player';
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
		}, () => {
			// The P2P wrapper invokes this only after the signed command has been
			// accepted for local application. Keeping the presentation here avoids
			// claiming an ability was used while a VPN reconnect or signer failure
			// held the command.
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
		});
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
		}, () => {
			// Do not lock the upgrade button or announce success until the
			// canonical P2P command has crossed the signing/apply boundary.
			fireAnnouncement('spell', `${norseHero.name} equips ${norseHero.weaponUpgrade.name}!`, { duration: 2500 });
			setWeaponUpgraded(true);
		});

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

    if (!openingMulliganGatingPoker) {
      setMulliganProcessed(true);
      completeMulligan();
      return;
    }

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
  }, [mulliganActive, combatState?.phase, completeMulligan, mulliganProcessed, mulliganArmed, mulliganComplete, openingMulliganGatingPoker]);
  
  const requestedHandRef = useRef<PokerResolvedHand | null>(null);
  const discoveryActive = useGameStore(state => state.gameState?.discovery?.active === true);
  const cardsGameOver = useGameStore(state => state.gameState?.gamePhase === 'game_over');

  useEffect(() => {
    if (!isActive || !combatState || openingMulliganGatingPoker || combatState.phase !== CombatPhase.RESOLUTION) return;
    const poker = getPokerCombatAdapterState();
    if (poker.combatState?.combatId !== combatState.combatId || poker.combatState.handNumber !== combatState.handNumber) return;
    poker.resolveCombat();
  }, [combatState, isActive, openingMulliganGatingPoker]);

  useEffect(() => {
    if (isP2PCombat && (isP2PActionLocked || !p2pSessionAuthorized)) {
      requestedHandRef.current = null;
      return;
    }
    if (!lastResolvedHand || requestedHandRef.current === lastResolvedHand || mulliganActive || cardsGameOver) return;
    const terminal = lastResolvedHand.resolution.playerFinalHealth <= 0 || lastResolvedHand.resolution.opponentFinalHealth <= 0;
    if (discoveryActive && !terminal) return;

    const gameStore = useGameStore.getState();
    requestedHandRef.current = lastResolvedHand;
    progressResolvedPokerHand(lastResolvedHand, {
      readPoker: getPokerCombatAdapterState,
      commitRewards: onCommitted => {
        const command = createPokerHandRewardsCommand({
          matchId: gameStore.matchId ?? gameStore.matchSeed ?? lastResolvedHand.combatId,
          ...lastResolvedHand,
        });
        p2pActions.grantPokerHandRewards(command, onCommitted);
      },
      startNextHand: () => {
        cardPositionsRef.current.clear();
        advanceTurnPhase();
        getPokerCombatAdapterState().startNextHand(lastResolvedHand.resolution);
      },
      endCombat: (winner, presentation) => {
        onCombatEnd?.(winner, presentation);
        const currentPoker = getPokerCombatAdapterState();
        if (currentPoker.lastResolvedHand === lastResolvedHand) currentPoker.endCombat();
      },
    });
  }, [advanceTurnPhase, cardsGameOver, discoveryActive, isP2PActionLocked, isP2PCombat, lastResolvedHand, mulliganActive, onCombatEnd, p2pActions, p2pSessionAuthorized]);

  const handleAction = useCallback(async (action: CombatAction, hp?: number) => {
    if (combatState && !isPlayerTurn) return;
    // Read the transport store again at the action boundary. React's render
    // value can lag a socket close/open by one tick; a stale "connected=false"
    // must never make a peer battle fall through to the local reducer.
    const livePeer = usePeerStore.getState();
    const liveP2PConnected = livePeer.connectionState === 'connected';
    const liveIntegrityLocked = Boolean(livePeer.p2pIntegrityError);
    if (isP2PActionLocked || (isP2PCombat && (!liveP2PConnected || liveIntegrityLocked))) {
      fireAnnouncement('warning', liveIntegrityLocked ? 'Game integrity paused' : 'P2P reconnecting', {
        subtitle: liveIntegrityLocked
          ? 'Actions are locked until you leave the match.'
          : 'Actions resume when the peer connection recovers.',
        duration: 1800,
      });
      return;
    }
    const freshState = getPokerCombatAdapterState().combatState;
    if (!freshState || freshState.player.isReady) {
      return;
    }
    // In a P2P match the authenticated referee, not either browser's wall
    // clock, decides whether the signed action arrived before the deadline.
    // Use the canonical pre-deadline instant for the local preflight; a late
    // action is still rejected by the server gate before the reducer commits.
    const actionNowMs = isP2PCombat
      ? getCanonicalPokerActionNowMs({
          origin: 'player',
          deadlineAtMs: freshState.turnDeadlineAtMs,
        })
      : undefined;
    const validation = validatePokerActionIntent({
      combatState: freshState,
      playerId: freshState.player.playerId,
      action,
      hpCommitment: hp,
      nowMs: actionNowMs,
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

    // In P2P multiplayer, both peers apply the same deterministic poker action.
    // The P2P protocol layer owns the wire shape; this controller only commits
    // the player's decision against the shared poker rules. Signing must
    // resolve before the local reducer runs; otherwise a failed signer leaves
    // a local-only poker result that the peer can never reproduce.
    const connectedP2P = isP2PCombat && liveP2PConnected;
    const previousStateHash = connectedP2P ? computePokerCombatStateHash(freshState) : null;
    const decisionId = connectedP2P
      ? `${freshState.turnId}:${freshState.player.playerId}:${Date.now()}`
      : null;
    if (connectedP2P) {
      let sent = false;
      try {
        sent = await p2pActions.sendPokerAction({
          playerId: freshState.player.playerId,
          action,
          origin: 'player',
          hpCommitment: hp,
          turnId: freshState.turnId,
          prevStateHash: previousStateHash ?? undefined,
          decisionId: decisionId ?? undefined,
        });
      } catch (error) {
        debug.warn('[CombatController] poker action send rejected before local commit', error);
      }
	      if (!sent) {
			const peerState = usePeerStore.getState();
			const subtitle = peerState.connectionState !== 'connected'
				? 'Connection interrupted — the match remains unchanged.'
				: peerState.p2pSessionAuthError
					? 'Session authorization is incomplete — wait for the referee.'
					: 'The referee did not authorize this action — try again when the turn is synced.';
			fireAnnouncement('warning', 'Poker action not committed', {
				subtitle,
				duration: 2500,
			});
			return;
		}
      const latestState = getPokerCombatAdapterState().combatState;
      if (
        !latestState
        || latestState.turnId !== freshState.turnId
        || !previousStateHash
        || computePokerCombatStateHash(latestState) !== previousStateHash
        || usePeerStore.getState().p2pIntegrityError !== null
      ) {
        debug.warn('[CombatController] poker action became stale while signing; local reducer not applied');
        return;
      }
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
    const committedActionNowMs = connectedP2P
      ? getCanonicalPokerActionNowMs({
          origin: 'player',
          deadlineAtMs: getPokerCombatAdapterState().combatState?.turnDeadlineAtMs ?? null,
        })
      : undefined;
    performAction(freshState.player.playerId, action, hp, 'player', committedActionNowMs);
    maybeCloseBettingRound();
	if (connectedP2P) {
		const actorId = usePeerStore.getState().myPeerId ?? '';
		const canonicalOrder = decisionId
			? commitNextP2PCanonicalAction({ actionId: decisionId, actorId, domain: 'poker' })
			: null;
		if (canonicalOrder === null) {
			usePeerStore.getState().setP2pIntegrityError('Game integrity diverged. Actions are paused until the match is left. (local_poker_canonical_order_unavailable)');
			return;
		}
		const recorded = recordMove('poker_action', {
			action,
			origin: 'player',
			hpCommitment: hp,
			turnId: freshState.turnId,
			decisionId,
		}, localPlayerId({
			hiveUsername: getNFTBridge().getUsername(),
			myPeerId: actorId,
		}), canonicalOrder);
		if (!recorded) {
			usePeerStore.getState().setP2pIntegrityError('Game integrity diverged. Actions are paused until the match is left. (local_poker_transcript_unavailable)');
			return;
		}
	}

    // Trigger poker drama VFX for the betting action (post-commit)
    emitBettingAction({ phase: freshState.phase, action, side: 'player', hpCommitment: hp });

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
  
  const handleUnifiedEndTurn = useCallback(() => {
    if (!combatState) return;
    if (!isPlayerTurn) return;
    if (isP2PActionLocked) {
      fireAnnouncement('warning', integrityError ? 'Game integrity paused' : 'P2P reconnecting', {
        subtitle: integrityError
          ? 'Actions are locked until you leave the match.'
          : 'Actions resume when the peer connection recovers.',
        duration: 1800,
      });
      return;
    }

    // Poker actions must use the same canonical intent boundary as the
    // betting controls.  In particular, never mutate the local reducer first
    // and then try to notify the peer: a failed signer/transport would leave a
    // battle state that the other browser can never reproduce.  The keyboard
    // and animation callbacks reach this shortcut, so route it through
    // handleAction as well.
    const freshState = getPokerCombatAdapterState().combatState;
    if (!freshState || freshState.player.isReady) return;
    const permissions = getActionPermissions(freshState, true);
    if (!permissions) return;
    const shortcutAction = permissions.hasBetToCall
      ? CombatAction.BRACE
      : CombatAction.DEFEND;
    void handleAction(shortcutAction);

  }, [combatState, handleAction, integrityError, isP2PActionLocked, isPlayerTurn]);

  return {
    combatState,
    isActive,
    betAmount,
    setBetAmount,
    showdownCelebration,
    dismissShowdown,
    heroPowerTargeting,
    heroPowerUsedThisTurn,
    weaponUpgraded,
    mulliganActive,
    gameStateMulligan,
    
    aiResponseInProgressRef,
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
    handleOpponentHeroClick,
    handlePlayerHeroClick,
    executeHeroPowerEffect,
    handleHeroPower,
    cancelHeroPowerTargeting,
    handleWeaponUpgrade,
    handleAction,
	    handleUnifiedEndTurn,
    
    turnPhase,
    orchestratorTurn,
    advanceTurnPhase,
    
    endTurn,
    endCombat,
    performAction,
    applyDirectDamage,

    heroBattlePopups,
    removeHeroBattlePopup
  };
}
