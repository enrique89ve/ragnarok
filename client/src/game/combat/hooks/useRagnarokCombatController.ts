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
import { useGameStore } from '../../stores/gameStore';
import { CombatPhase, CombatAction } from '../../types/PokerCombatTypes';
import { fireAnnouncement } from '../../stores/unifiedUIStore';
import { ALL_NORSE_HEROES } from '../../data/norseHeroes';
import { executeNorseHeroPower } from '../../utils/norseHeroPowerUtils';
import { isValidTargetForHeroPower } from '../../utils/combatUtils';
import { getSmartAIAction } from '../modules/SmartAI';
import { usePokerAI } from './usePokerAI';
import { usePokerPhases } from './usePokerPhases';
import { useCombatTimer } from './useCombatTimer';
import { useCombatEvents, ShowdownCelebration as ShowdownCelebrationState, HeroDeathState } from './useCombatEvents';
import { useTurnOrchestrator } from './useTurnOrchestrator';
import { COMBAT_DEBUG } from '../debugConfig';
import { hasKeyword } from '../../utils/cards/keywordUtils';
import { debug } from '../../config/debugConfig';
import type { HeroBattlePopupData, BattlePopupAction, BattlePopupTarget } from '../components/HeroBattlePopup';
import { getPokerDramaCallbacks } from './usePokerDrama';

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
  playerHand: any[];
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

  usePokerAI({ combatState, isActive, aiResponseInProgressRef, addHeroBattlePopup });

  usePokerPhases({ combatState, isActive });

  useCombatTimer({ combatState, isActive, updateTimer, addHeroBattlePopup });
  
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
  const playerHand = useGameStore(state => state.gameState?.players?.player?.hand ?? []);
  const attackingCard = useGameStore(state => state.attackingCard);
  const selectedCard = useGameStore(state => state.selectedCard);
  const attackWithCard = useGameStore(state => state.attackWithCard);
  const selectAttacker = useGameStore(state => state.selectAttacker);
  const heroTargetMode = useGameStore(state => state.heroTargetMode);
  const playerMana = useGameStore(state => state.gameState?.players?.player?.mana?.current ?? 0);
  const playerMaxMana = useGameStore(state => state.gameState?.players?.player?.mana?.max ?? 10);
  const opponentMana = useGameStore(state => state.gameState?.players?.opponent?.mana?.current ?? 0);
  const opponentMaxMana = useGameStore(state => state.gameState?.players?.opponent?.mana?.max ?? 10);
  
  const isPlayerTurn = currentTurn === 'player';
  const isOpponentTargetable: boolean = !!(isPlayerTurn && (!!attackingCard || !!heroTargetMode ||
    (!!selectedCard && (selectedCard.card.type === 'spell' ||
      (selectedCard.card.type === 'minion' && hasKeyword(selectedCard, 'battlecry'))))));
  const isPlayerTargetable: boolean = !!(isPlayerTurn &&
    (!!selectedCard && (selectedCard.card.type === 'spell' ||
      (selectedCard.card.type === 'minion' && hasKeyword(selectedCard, 'battlecry')))));
  
  const selectCard = useGameStore(state => state.selectCard);
  const playCard = useGameStore(state => state.playCard);
  
  const sharedHandleCardPlay = useCallback((card: any, position?: { row?: number; col?: number; insertionIndex?: number }) => {
    if (!isPlayerTurn) {
      return;
    }
    const cardId = card?.instanceId || card?.id || card?.card?.id;
    if (!cardId) {
      return;
    }
    playCard(cardId, undefined, undefined, position?.insertionIndex);
  }, [isPlayerTurn, playCard]);
  
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
    
    const heroPowerGameState = useGameStore.getState();
    const playerState = heroPowerGameState.gameState?.players?.player;
    if (playerState) {
      const newMana = Math.max(0, (playerState.mana?.current || 0) - heroPower.cost);
      useGameStore.setState(prev => ({
        ...prev,
        gameState: {
          ...prev.gameState!,
          players: {
            ...prev.gameState!.players,
            player: {
              ...prev.gameState!.players.player,
              mana: {
                ...prev.gameState!.players.player.mana,
                current: newMana
              },
              heroPower: {
                ...prev.gameState!.players.player.heroPower,
                used: true
              }
            }
          }
        }
      }));
    }
    
    const isHeroTarget = target?.isHero === true;
    const isOpponentHeroTarget = isHeroTarget && target?.isOpponent === true;
    const isPlayerHeroTarget = isHeroTarget && target?.isOpponent === false;
    const targetMinion = isHeroTarget ? null : target;
    
    const targetName = isHeroTarget 
      ? (isOpponentHeroTarget ? ' on enemy hero' : ' on your hero')
      : (targetMinion?.card?.name ? ` on ${targetMinion.card.name}` : '');
    fireAnnouncement('spell', `${norseHero.name} uses ${heroPower.name}${targetName}!`, { duration: 2000 });
    
    setHeroPowerUsedThisTurn(true);
    setHeroPowerTargeting(null);
    
    const effectValue = heroPower.value || 2;
    const secondaryValue = heroPower.secondaryValue || 0;
    const effectType = heroPower.effectType as string;
    
    const healPlayerHero = (amount: number) => {
      getPokerCombatAdapterState().healPlayerHero(amount);
    };
    
    const healOpponentHero = (amount: number) => {
      getPokerCombatAdapterState().healOpponentHero(amount);
    };
    
    if (isHeroTarget) {
      switch (effectType) {
        case 'damage_single':
        case 'damage':
          if (isOpponentHeroTarget) {
            applyDirectDamage('opponent', effectValue, `${norseHero.name}'s ${heroPower.name}`);
          } else if (isPlayerHeroTarget) {
            applyDirectDamage('player', effectValue, `${norseHero.name}'s ${heroPower.name}`);
          }
          break;
        
        case 'heal_single':
        case 'heal':
          if (isPlayerHeroTarget) {
            healPlayerHero(effectValue);
          } else if (isOpponentHeroTarget) {
            healOpponentHero(effectValue);
          }
          break;
        
        case 'damage_and_heal':
          if (isOpponentHeroTarget) {
            applyDirectDamage('opponent', effectValue, `${norseHero.name}'s ${heroPower.name}`);
            healPlayerHero(secondaryValue || effectValue);
          }
          break;
        
        case 'buff_single':
        case 'buff':
          break;
        
        default:
          break;
      }
      return;
    }
    
    if (targetMinion) {
      const currentGameState = useGameStore.getState().gameState;
      if (currentGameState) {
        const newGameState = executeNorseHeroPower(
          currentGameState,
          'player',
          norseHero.id,
          targetMinion.instanceId,
          false
        );
        useGameStore.setState(state => ({ ...state, gameState: newGameState }));
      }
      return;
    }
    
    const currentGameState = useGameStore.getState().gameState;
    
    const minionAffectingEffects = [
      'damage_aoe', 'damage_random', 'buff_aoe', 'buff_single', 'debuff_aoe', 
      'debuff_single', 'summon', 'freeze', 'stealth', 'draw', 'copy', 'scry', 
      'reveal', 'grant_keyword'
    ];
    
    if (minionAffectingEffects.includes(effectType) && currentGameState) {
      const newGameState = executeNorseHeroPower(
        currentGameState,
        'player',
        norseHero.id,
        undefined,
        false
      );
      useGameStore.setState(state => ({ ...state, gameState: newGameState }));
    }
    
    switch (effectType) {
      case 'heal_aoe':
        healPlayerHero(effectValue);
        break;
        
      case 'damage_and_heal':
        applyDirectDamage('opponent', effectValue, `${norseHero.name}'s ${heroPower.name}`);
        healPlayerHero(secondaryValue || effectValue);
        break;
        
      case 'self_damage_and_summon':
        applyDirectDamage('player', heroPower.value || 0, `${norseHero.name}'s ${heroPower.name}`);
        if (currentGameState) {
          const newGameState = executeNorseHeroPower(
            currentGameState,
            'player',
            norseHero.id,
            undefined,
            false
          );
          useGameStore.setState(state => ({ ...state, gameState: newGameState }));
        }
        break;
        
      case 'draw_and_damage':
        applyDirectDamage('player', heroPower.selfDamage || heroPower.value || 0, `${norseHero.name}'s ${heroPower.name}`);
        if (currentGameState) {
          const newGameState = executeNorseHeroPower(
            currentGameState,
            'player',
            norseHero.id,
            undefined,
            false
          );
          useGameStore.setState(state => ({ ...state, gameState: newGameState }));
        }
        break;
        
      case 'buff_hero':
        getPokerCombatAdapterState().setPlayerHeroBuffs(effectValue, heroPower.armorValue || 0);
        break;
        
      case 'buff_single':
        if (secondaryValue > 0) {
          healPlayerHero(secondaryValue);
        }
        break;
    }
    
  }, [applyDirectDamage, setHeroPowerUsedThisTurn, setHeroPowerTargeting]);
  
  const handleHeroPower = useCallback(() => {
    if (heroPowerProcessingRef.current) return;
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
  }, [combatState, heroPowerUsedThisTurn, playerMana, executeHeroPowerEffect]);
  
  const cancelHeroPowerTargeting = useCallback(() => {
    if (heroPowerTargeting?.active) {
      setHeroPowerTargeting(null);
    }
  }, [heroPowerTargeting]);
  
  const handleWeaponUpgrade = useCallback(() => {
    if (weaponUpgradeProcessingRef.current) return;
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

    const WEAPON_COST = 5;
    const currentMana = playerMana;

    if (currentMana < WEAPON_COST) {
      weaponUpgradeProcessingRef.current = false;
      return;
    }

    if (weaponUpgraded) {
      weaponUpgradeProcessingRef.current = false;
      return;
    }

    fireAnnouncement('spell', `${norseHero.name} equips ${norseHero.weaponUpgrade.name}!`, { duration: 2500 });

    setWeaponUpgraded(true);

    useGameStore.setState(state => {
      if (!state.gameState?.players?.player?.mana) return state;
      return {
        ...state,
        gameState: {
          ...state.gameState,
          players: {
            ...state.gameState.players,
            player: {
              ...state.gameState.players.player,
              mana: {
                ...state.gameState.players.player.mana,
                current: Math.max(0, state.gameState.players.player.mana.current - WEAPON_COST)
              }
            }
          }
        }
      };
    });

    const immediateEffect = norseHero.weaponUpgrade.immediateEffect;

    if (immediateEffect.value) {
      switch (immediateEffect.type) {
        case 'damage':
          applyDirectDamage('opponent', immediateEffect.value, `${norseHero.weaponUpgrade.name}`);
          break;
        case 'heal':
          getPokerCombatAdapterState().healPlayerHero(immediateEffect.value || 0);
          break;
        case 'armor':
          getPokerCombatAdapterState().addPlayerArmor(immediateEffect.value || 0);
          break;
        default:
      }
    }

    weaponUpgradeProcessingRef.current = false;
  }, [combatState, weaponUpgraded, applyDirectDamage, playerMana]);
  
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
        playCard(selectedCard.instanceId, 'opponent-hero', 'hero');
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
        playCard(selectedCard.instanceId, 'opponent-hero', 'hero');
        selectCard(null);
        return;
      }
    }
    
    if (attackingCard) {
      attackWithCard(attackingCard.instanceId, 'opponent-hero');
      selectAttacker(null);
    }
  }, [isOpponentTargetable, attackingCard, attackWithCard, selectAttacker, selectedCard, playCard, selectCard, heroPowerTargeting, executeHeroPowerEffect]);
  
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
        playCard(selectedCard.instanceId, 'player-hero', 'hero');
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
        playCard(selectedCard.instanceId, 'player-hero', 'hero');
        selectCard(null);
        return;
      }
    }
  }, [isPlayerTargetable, selectedCard, playCard, selectCard, heroPowerTargeting, executeHeroPowerEffect]);
  
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
  
  const endTurn = useGameStore(state => state.endTurn);
  const grantPokerHandRewards = useGameStore(state => state.grantPokerHandRewards);
  
  const handleAction = useCallback((action: CombatAction, hp?: number) => {
    const freshState = getPokerCombatAdapterState().combatState;
    if (!freshState || freshState.player.isReady) {
      return;
    }

    if (action === CombatAction.DEFEND) {
      addHeroBattlePopup({ action: 'defend', target: 'player', text: 'Defend', subtitle: '+1 STA' });
    } else if (action === CombatAction.ATTACK) {
      addHeroBattlePopup({ action: 'attack', target: 'player', text: hp ? `Attacks for ${hp} HP` : 'Attack' });
    } else if (action === CombatAction.ENGAGE) {
      addHeroBattlePopup({ action: 'engage', target: 'both', text: 'Engage!' });
    } else if (action === CombatAction.BRACE) {
      addHeroBattlePopup({ action: 'brace', target: 'player', text: 'Brace' });
    }

    // In P2P multiplayer (non-host), send poker action via P2P instead of executing locally
    const peer = (globalThis as Record<string, unknown>).__ragnarokPeerStore as
      { getState: () => { isHost: boolean; connectionState: string; send: (data: unknown) => void } } | undefined;
    const peerState = peer?.getState();
    if (peerState && peerState.connectionState === 'connected' && !peerState.isHost) {
      peerState.send({ type: 'poker_action', playerId: freshState.player.playerId, action: action as string, hpCommitment: hp });
    } else {
      performAction(freshState.player.playerId, action, hp);
    }

    // Trigger poker drama VFX for the betting action
    try {
      const dramaCallbacks = getPokerDramaCallbacks();
      dramaCallbacks.onBettingAction(action, true);
    } catch { /* drama VFX is non-critical */ }

    if (action === CombatAction.BRACE) {
      endTurn();
    }

    const phaseBeforeAction = freshState.phase;
    
    setTimeout(() => {
      try {
        if (aiResponseInProgressRef.current) {
          if (COMBAT_DEBUG.AI) {
            debug.combat('[AI Response handleAction] SKIP: AI action already in progress from usePokerAI hook');
          }
          return;
        }
        
        const adapterState = getPokerCombatAdapterState();
        const freshStateAfterAction = adapterState.combatState;
        
        if (COMBAT_DEBUG.AI) {
          debug.combat('[AI Response handleAction] Checking if AI should respond...', {
            hasFreshState: !!freshStateAfterAction,
            opponentReady: freshStateAfterAction?.opponent?.isReady,
            playerReady: freshStateAfterAction?.player?.isReady,
            phase: freshStateAfterAction?.phase,
            phaseBeforeAction,
            foldWinner: freshStateAfterAction?.foldWinner,
            isAllInShowdown: freshStateAfterAction?.isAllInShowdown,
            playerHP: freshStateAfterAction?.player?.pet?.stats?.currentHealth,
            opponentHP: freshStateAfterAction?.opponent?.pet?.stats?.currentHealth
          });
        }
        
        if (!freshStateAfterAction || freshStateAfterAction.opponent.isReady) {
          if (COMBAT_DEBUG.AI) {
            debug.combat('[AI Response handleAction] SKIP: No fresh state or opponent already ready');
          }
          return;
        }
        
        if (freshStateAfterAction.phase !== phaseBeforeAction) {
          if (COMBAT_DEBUG.AI) {
            debug.combat('[AI Response handleAction] SKIP: Phase has advanced');
          }
          return;
        }
        
        if (freshStateAfterAction.phase === CombatPhase.RESOLUTION) {
          if (COMBAT_DEBUG.AI) {
            debug.combat('[AI Response handleAction] SKIP: Already in RESOLUTION');
          }
          return;
        }
        
        if (freshStateAfterAction.foldWinner) {
          if (COMBAT_DEBUG.AI) {
            debug.combat('[AI Response handleAction] SKIP: Fold winner already set');
          }
          return;
        }
        
        if (freshStateAfterAction.isAllInShowdown) {
          if (COMBAT_DEBUG.AI) {
            debug.combat('[AI Response handleAction] SKIP: All-in showdown - auto-advance useEffect handles phases');
          }
          return;
        }
        
        aiResponseInProgressRef.current = true;
        
        if (COMBAT_DEBUG.AI) {
          debug.combat('[AI Response handleAction] AI will respond now');
        }
        
        const aiDecision = getSmartAIAction(freshStateAfterAction, false);
        if (COMBAT_DEBUG.AI) {
          debug.combat('[AI Response handleAction] AI decision:', aiDecision);
        }
        
        getPokerCombatAdapterState().performAction(freshStateAfterAction.opponent.playerId, aiDecision.action, aiDecision.betAmount);

        // Trigger poker drama VFX for AI action
        try {
          const dramaCallbacks = getPokerDramaCallbacks();
          dramaCallbacks.onBettingAction(aiDecision.action, false);
        } catch { /* drama VFX is non-critical */ }

        setTimeout(() => {
          const adapterAfterAI = getPokerCombatAdapterState();
          if (adapterAfterAI.combatState && 
              adapterAfterAI.combatState.player.isReady && 
              adapterAfterAI.combatState.opponent.isReady &&
              adapterAfterAI.combatState.phase !== CombatPhase.RESOLUTION) {
            adapterAfterAI.maybeCloseBettingRound();
          }
          aiResponseInProgressRef.current = false;
        }, 100);
      } catch (error) {
        debug.error('[AI Response handleAction] ERROR:', error);
        aiResponseInProgressRef.current = false;
      }
    }, 1000);
  }, [performAction, endTurn, addHeroBattlePopup]);
  
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
  
  useEffect(() => {
    if (showdownCelebration && !heroDeathState?.isAnimating) {
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
        handleCombatEnd();
      }, 6000);
    }
    
    return () => {
      if (showdownBackupTimerRef.current) {
        clearTimeout(showdownBackupTimerRef.current);
        showdownBackupTimerRef.current = null;
      }
    };
  // handleCombatEnd excluded: stable ref-based callback; including it re-fires the 6s backup timer on every render
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

  const handleHeroDeathComplete = useCallback(() => {
    if (!heroDeathState) return;
    
    let winner: 'player' | 'opponent' = heroDeathState.isPlayerDead ? 'opponent' : 'player';
    if (heroDeathState.pendingResolution?.winner === 'player' || 
        heroDeathState.pendingResolution?.winner === 'opponent') {
      winner = heroDeathState.pendingResolution.winner;
    }
    
    setHeroDeathState(null);
    setShowdownCelebration(null);
    
    if (onCombatEnd) {
      onCombatEnd(winner);
    }
    endCombat();
  }, [heroDeathState, onCombatEnd, endCombat]);

  const handleUnifiedEndTurn = useCallback(() => {
    if (!combatState) return;
    
    if (!combatState.player.isReady) {
      performAction(combatState.player.playerId, CombatAction.DEFEND);
    }
    
    endTurn();
    
  }, [combatState, performAction, endTurn]);

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
