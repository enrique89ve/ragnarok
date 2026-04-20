/**
 * Poker Combat Adapter Hook
 * 
 * Provides a clean interface to the unified combat store for poker combat operations.
 * Components import this instead of directly using the store.
 */

import React from 'react';
import { useUnifiedCombatStore, PokerPhase } from '../stores/unifiedCombatStore';
import {
  PokerCombatState,
  CombatAction,
  CombatResolution,
  CombatPhase,
  PokerCard,
  PetData,
} from '../types/PokerCombatTypes';
import { initializeNorseContext, resetNorseContext } from '../utils/norseIntegration';

export interface ActionPermissions {
  isPreForesight: boolean;
  hasBetToCall: boolean;
  toCall: number;
  availableHP: number;
  minBet: number;
  canCheck: boolean;
  canBet: boolean;
  canCall: boolean;
  canRaise: boolean;
  canFold: boolean;
  maxBetAmount: number;
  isAllIn: boolean;
  isMyTurnToAct: boolean;
  waitingForOpponent: boolean;
}

export function getActionPermissions(
  combatState: PokerCombatState | null,
  isPlayer: boolean = true
): ActionPermissions | null {
  if (!combatState) return null;
  
  const actor = isPlayer ? combatState.player : combatState.opponent;
  const opponent = isPlayer ? combatState.opponent : combatState.player;
  const minBet = combatState.minBet || 10;
  
  const toCall = Math.max(0, combatState.currentBet - actor.hpCommitted);
  const hasBetToCall = toCall > 0;
  const actorCurrentHP = Math.max(0, actor.pet.stats.currentHealth);
  const actorStaminaCap = actor.pet.stats.currentStamina * 10;
  const availableHP = Math.min(actorCurrentHP, actorStaminaCap);
  
  const isResolution = combatState.phase === CombatPhase.RESOLUTION;
  
  const isActorOpener = isPlayer ? combatState.openerIsPlayer : !combatState.openerIsPlayer;
  const actorIsReady = actor.isReady;
  const opponentIsReady = opponent.isReady;
  
  let isMyTurnToAct = false;
  let waitingForOpponent = false;
  
  if (isResolution || combatState.foldWinner) {
    isMyTurnToAct = false;
    waitingForOpponent = false;
  } else {
    // Use activePlayerId as the single source of truth for whose turn it is
    const myId = actor.playerId;
    isMyTurnToAct = combatState.activePlayerId === myId;
    waitingForOpponent = combatState.activePlayerId !== null && combatState.activePlayerId !== myId;
  }
  
  const canCheck = !hasBetToCall && !isResolution;
  const canBet = !hasBetToCall && availableHP >= minBet && !isResolution;
  const canCall = hasBetToCall && availableHP > 0 && !isResolution;
  const actualCallAmount = Math.min(toCall, availableHP);
  const isAllIn = actualCallAmount < toCall;
  const canRaise = hasBetToCall && (toCall + minBet) <= availableHP && !isResolution;
  const canFold = !isResolution && hasBetToCall;
  
  const maxBetAmount = hasBetToCall 
    ? Math.max(0, availableHP - toCall)
    : availableHP;
  
  return {
    isPreForesight: combatState.phase === CombatPhase.SPELL_PET || combatState.phase === CombatPhase.PRE_FLOP,
    hasBetToCall,
    toCall,
    availableHP,
    minBet,
    canCheck,
    canBet,
    canCall,
    canRaise,
    canFold,
    maxBetAmount,
    isAllIn,
    isMyTurnToAct,
    waitingForOpponent
  };
}

export interface PokerCombatAdapter {
  combatState: PokerCombatState | null;
  deck: PokerCard[];
  isActive: boolean;
  mulliganComplete: boolean;
  
  initializeCombat: (
    playerId: string,
    playerName: string,
    playerPet: PetData,
    opponentId: string,
    opponentName: string,
    opponentPet: PetData,
    skipMulligan?: boolean,
    playerKingId?: string,
    opponentKingId?: string,
    firstStrikeTarget?: 'player' | 'opponent'
  ) => void;
  performAction: (playerId: string, action: CombatAction, hpCommitment?: number) => void;
  advancePhase: () => void;
  maybeCloseBettingRound: () => void;
  resolveCombat: () => CombatResolution | null;
  endCombat: () => void;
  completeMulligan: () => void;
  setPlayerReady: (playerId: string) => void;
  updateTimer: (newTime: number) => void;
  startNextHand: (resolution?: CombatResolution) => void;
  startNextHandDelayed: (resolution: CombatResolution) => void;
  setTransitioning: (value: boolean) => void;
  applyDirectDamage: (targetPlayerId: 'player' | 'opponent', damage: number, sourceDescription?: string) => void;
  healPlayerHero: (amount: number) => void;
  healOpponentHero: (amount: number) => void;
  setPlayerHeroBuffs: (attack: number, armor: number) => void;
  addPlayerArmor: (amount: number) => void;
  addOpponentArmor: (amount: number) => void;
  markBothPlayersReady: () => void;
  completeFirstStrike: () => void;
}

const POKER_TO_UNIFIED_PHASE: Record<string, PokerPhase> = {
  FAITH: 'FAITH',
  FORESIGHT: 'FORESIGHT',
  DESTINY: 'DESTINY',
  RESOLUTION: 'SHOWDOWN',
};

export function usePokerCombatAdapter(): PokerCombatAdapter {
  const combatState = useUnifiedCombatStore(s => s.pokerCombatState);
  const deck = useUnifiedCombatStore(s => s.pokerDeck);
  const isActive = useUnifiedCombatStore(s => s.pokerIsActive);
  const mulliganComplete = useUnifiedCombatStore(s => s.mulliganComplete);

  const initializePokerCombat = useUnifiedCombatStore(s => s.initializePokerCombat);
  const initializeCombat = useUnifiedCombatStore(s => s.initializeCombat);
  const performPokerAction = useUnifiedCombatStore(s => s.performPokerAction);
  const advancePokerPhase = useUnifiedCombatStore(s => s.advancePokerPhase);
  const resolvePokerCombat = useUnifiedCombatStore(s => s.resolvePokerCombat);
  const endPokerCombat = useUnifiedCombatStore(s => s.endPokerCombat);
  const completeMulliganFn = useUnifiedCombatStore(s => s.completeMulligan);
  const setPlayerReadyFn = useUnifiedCombatStore(s => s.setPlayerReady);
  const updatePokerTimer = useUnifiedCombatStore(s => s.updatePokerTimer);
  const startNextHandDelayedFn = useUnifiedCombatStore(s => s.startNextHandDelayed);
  const startNextHandFn = useUnifiedCombatStore(s => s.startNextHand);
  const maybeCloseBettingRoundFn = useUnifiedCombatStore(s => s.maybeCloseBettingRound);
  const applyDirectDamageFn = useUnifiedCombatStore(s => s.applyDirectDamage);
  const healPlayerHeroFn = useUnifiedCombatStore(s => s.healPlayerHero);
  const healOpponentHeroFn = useUnifiedCombatStore(s => s.healOpponentHero);
  const setPlayerHeroBuffsFn = useUnifiedCombatStore(s => s.setPlayerHeroBuffs);
  const addPlayerArmorFn = useUnifiedCombatStore(s => s.addPlayerArmor);
  const addOpponentArmorFn = useUnifiedCombatStore(s => s.addOpponentArmor);
  const markBothPlayersReadyFn = useUnifiedCombatStore(s => s.markBothPlayersReady);
  const completeFirstStrikeFn = useUnifiedCombatStore(s => s.completeFirstStrike);

  return React.useMemo(() => ({
    combatState,
    deck,
    isActive,
    mulliganComplete,

    initializeCombat: (playerId, playerName, playerPet, opponentId, opponentName, opponentPet, skipMulligan, playerKingId, opponentKingId, firstStrikeTarget?: 'player' | 'opponent') => {
      initializePokerCombat(
        playerId,
        playerName,
        playerPet,
        opponentId,
        opponentName,
        opponentPet,
        skipMulligan,
        playerKingId,
        opponentKingId,
        firstStrikeTarget
      );

      initializeNorseContext(
        playerKingId || null,
        opponentKingId || null,
        playerPet.norseHeroId || null,
        opponentPet.norseHeroId || null
      );

      initializeCombat(
        [{
          id: 'player-king',
          type: 'king',
          heroId: playerId,
          position: { row: 0, col: 4 },
          isAlive: true,
          hasMoved: false,
          ownerId: 'player',
        }],
        [{
          id: 'opponent-king',
          type: 'king',
          heroId: opponentId,
          position: { row: 7, col: 4 },
          isAlive: true,
          hasMoved: false,
          ownerId: 'opponent',
        }]
      );
    },

    performAction: (playerId, action, hpCommitment) => {
      performPokerAction(playerId, action, hpCommitment);
    },

    advancePhase: () => {
      advancePokerPhase();
    },

    resolveCombat: () => {
      return resolvePokerCombat();
    },

    endCombat: () => {
      resetNorseContext();
      endPokerCombat();
    },

    completeMulligan: () => {
      completeMulliganFn();
    },

    setPlayerReady: (playerId: string) => {
      setPlayerReadyFn(playerId);
    },

    updateTimer: (newTime: number) => {
      updatePokerTimer(newTime);
    },

    startNextHandDelayed: (resolution: CombatResolution) => {
      startNextHandDelayedFn(resolution);
    },

    startNextHand: (resolution?: CombatResolution) => {
      startNextHandFn(resolution);
    },

    setTransitioning: (value: boolean) => {
      useUnifiedCombatStore.setState({ isTransitioningHand: value });
    },

    maybeCloseBettingRound: () => {
      maybeCloseBettingRoundFn();
    },

    applyDirectDamage: (targetPlayerId: 'player' | 'opponent', damage: number, sourceDescription?: string) => {
      applyDirectDamageFn(targetPlayerId, damage, sourceDescription);
    },

    healPlayerHero: (amount: number) => {
      healPlayerHeroFn(amount);
    },

    healOpponentHero: (amount: number) => {
      healOpponentHeroFn(amount);
    },

    setPlayerHeroBuffs: (attack: number, armor: number) => {
      setPlayerHeroBuffsFn({ attack, armor });
    },

    addPlayerArmor: (amount: number) => {
      addPlayerArmorFn(amount);
    },

    addOpponentArmor: (amount: number) => {
      addOpponentArmorFn(amount);
    },

    markBothPlayersReady: () => {
      markBothPlayersReadyFn();
    },

    completeFirstStrike: () => {
      completeFirstStrikeFn();
    },
  // Deps intentionally limited — adapter identity should only change on these 4 values
  }), [combatState, deck, isActive, mulliganComplete]);
}

export function getPokerCombatAdapterState(): PokerCombatAdapter {
  const getStore = () => useUnifiedCombatStore.getState();

  return {
    combatState: getStore().pokerCombatState,
    deck: getStore().pokerDeck,
    isActive: getStore().pokerIsActive,
    mulliganComplete: getStore().mulliganComplete,

    initializeCombat: (playerId, playerName, playerPet, opponentId, opponentName, opponentPet, skipMulligan, playerKingId, opponentKingId, firstStrikeTarget?: 'player' | 'opponent') => {
      getStore().initializePokerCombat(
        playerId,
        playerName,
        playerPet,
        opponentId,
        opponentName,
        opponentPet,
        skipMulligan,
        playerKingId,
        opponentKingId,
        firstStrikeTarget
      );
      initializeNorseContext(
        playerKingId || null,
        opponentKingId || null,
        playerPet.norseHeroId || null,
        opponentPet.norseHeroId || null
      );
      getStore().initializeCombat(
        [{
          id: 'player-king',
          type: 'king',
          heroId: playerId,
          position: { row: 0, col: 4 },
          isAlive: true,
          hasMoved: false,
          ownerId: 'player',
        }],
        [{
          id: 'opponent-king',
          type: 'king',
          heroId: opponentId,
          position: { row: 7, col: 4 },
          isAlive: true,
          hasMoved: false,
          ownerId: 'opponent',
        }]
      );
    },

    completeMulligan: () => {
      getStore().completeMulligan();
    },

    performAction: (playerId, action, hpCommitment) => {
      getStore().performPokerAction(playerId, action, hpCommitment);
    },

    advancePhase: () => {
      getStore().advancePokerPhase();
    },

    maybeCloseBettingRound: () => {
      getStore().maybeCloseBettingRound();
    },

    resolveCombat: () => {
      return getStore().resolvePokerCombat();
    },

    endCombat: () => {
      resetNorseContext();
      getStore().endPokerCombat();
    },

    setPlayerReady: (playerId: string) => {
      getStore().setPlayerReady(playerId);
    },

    updateTimer: (newTime: number) => {
      getStore().updatePokerTimer(newTime);
    },

    startNextHand: (resolution?: CombatResolution) => {
      getStore().startNextHand(resolution);
    },

    startNextHandDelayed: (resolution: CombatResolution) => {
      getStore().startNextHandDelayed(resolution);
    },

    setTransitioning: (value: boolean) => {
      useUnifiedCombatStore.setState({ isTransitioningHand: value });
    },

    applyDirectDamage: (targetPlayerId: 'player' | 'opponent', damage: number, sourceDescription?: string) => {
      getStore().applyDirectDamage(targetPlayerId, damage, sourceDescription);
    },

    healPlayerHero: (amount: number) => {
      getStore().healPlayerHero(amount);
    },

    healOpponentHero: (amount: number) => {
      getStore().healOpponentHero(amount);
    },

    setPlayerHeroBuffs: (attack: number, armor: number) => {
      getStore().setPlayerHeroBuffs({ attack, armor });
    },

    addPlayerArmor: (amount: number) => {
      getStore().addPlayerArmor(amount);
    },

    addOpponentArmor: (amount: number) => {
      getStore().addOpponentArmor(amount);
    },

    markBothPlayersReady: () => {
      getStore().markBothPlayersReady();
    },

    completeFirstStrike: () => {
      getStore().completeFirstStrike();
    },
  };
}
