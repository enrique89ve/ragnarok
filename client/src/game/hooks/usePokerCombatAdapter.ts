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
  PokerCard,
  PetData,
  PokerCombatDeterministicOptions,
} from '../types/PokerCombatTypes';
import { initializeNorseContext, resetNorseContext } from '../utils/norseIntegration';
import {
  getPokerActionPermissions,
  type ActionPermissions,
} from '../combat/rules/pokerActionRules';
import type { PokerCombatAdapterInit } from '../combat/pokerCombatAdapterContract';
import type { PokerActionOrigin } from '@shared/p2p-wire/combat';

export type { ActionPermissions };

export function getActionPermissions(
  combatState: PokerCombatState | null,
  isPlayer: boolean = true
): ActionPermissions | null {
  return getPokerActionPermissions(combatState, isPlayer);
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
    firstStrikeTarget?: 'player' | 'opponent',
    deterministic?: PokerCombatDeterministicOptions
  ) => void;
  initializeCombatFromPayload: (payload: PokerCombatAdapterInit) => void;
  performAction: (
    playerId: string,
    action: CombatAction,
    hpCommitment?: number,
    origin?: PokerActionOrigin,
    nowMs?: number,
  ) => void;
  advancePhase: () => void;
  maybeCloseBettingRound: () => void;
  resolveCombat: () => CombatResolution | null;
  endCombat: () => void;
  completeMulligan: () => void;
  setPlayerReady: (playerId: string) => void;
  updateTimer: (newTime: number) => void;
  syncTurnClock: (input: {
    turnId: string;
    combatId: string;
    phase: string;
    activePlayerId: string;
    actionsThisRound: number;
    durationMs: number;
    sentAtMs?: number;
    remainingMs?: number;
    receivedAtMs: number;
  }) => void;
  applyNotarizedTurnClock: (input: {
    turnId: string;
    combatId: string;
    phase: string;
    activePlayerId: string;
    actionsThisRound: number;
    remainingMsAtCommit: number;
    receivedAtMs: number;
  }) => void;
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
  const syncPokerTurnClockFn = useUnifiedCombatStore(s => s.syncPokerTurnClock);
  const applyNotarizedPokerTurnClockFn = useUnifiedCombatStore(s => s.applyNotarizedPokerTurnClock);
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

  return React.useMemo(() => {
    const initializeCombatFromPayload = (payload: PokerCombatAdapterInit) => {
      initializePokerCombat(
        payload.playerId,
        payload.playerName,
        payload.playerPet,
        payload.opponentId,
        payload.opponentName,
        payload.opponentPet,
        payload.skipMulligan,
        payload.playerKingId,
        payload.opponentKingId,
        payload.firstStrikeTarget,
        payload.deterministic
      );

      initializeNorseContext(
        payload.playerKingId || null,
        payload.opponentKingId || null,
        payload.playerPet.norseHeroId || null,
        payload.opponentPet.norseHeroId || null
      );

      initializeCombat(
        [{
          id: 'player-king',
          type: 'king',
          heroId: payload.playerId,
          position: { row: 0, col: 4 },
          isAlive: true,
          hasMoved: false,
          ownerId: 'player',
        }],
        [{
          id: 'opponent-king',
          type: 'king',
          heroId: payload.opponentId,
          position: { row: 7, col: 4 },
          isAlive: true,
          hasMoved: false,
          ownerId: 'opponent',
        }]
      );
    };

    return {
      combatState,
      deck,
      isActive,
      mulliganComplete,

      initializeCombat: (
        playerId,
        playerName,
        playerPet,
        opponentId,
        opponentName,
        opponentPet,
        skipMulligan,
        playerKingId,
        opponentKingId,
        firstStrikeTarget,
        deterministic
      ) => {
        initializeCombatFromPayload({
          playerId,
          playerName,
          playerPet,
          opponentId,
          opponentName,
          opponentPet,
          skipMulligan: skipMulligan ?? false,
          playerKingId,
          opponentKingId,
          firstStrikeTarget,
          deterministic,
        });
      },
      initializeCombatFromPayload,

      performAction: (playerId, action, hpCommitment, origin, nowMs) => {
        if (nowMs === undefined) {
          performPokerAction(playerId, action, hpCommitment, origin);
        } else {
          performPokerAction(playerId, action, hpCommitment, origin, nowMs);
        }
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

      syncTurnClock: (input) => {
        syncPokerTurnClockFn(input);
      },

      applyNotarizedTurnClock: (input) => {
        applyNotarizedPokerTurnClockFn(input);
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
    };
  // Deps intentionally limited - adapter identity should only change on these 4 values
  }, [combatState, deck, isActive, mulliganComplete]);
}

export function getPokerCombatAdapterState(): PokerCombatAdapter {
  const getStore = () => useUnifiedCombatStore.getState();
  const initializeCombatFromPayload = (payload: PokerCombatAdapterInit) => {
    const store = getStore();

    store.initializePokerCombat(
      payload.playerId,
      payload.playerName,
      payload.playerPet,
      payload.opponentId,
      payload.opponentName,
      payload.opponentPet,
      payload.skipMulligan,
      payload.playerKingId,
      payload.opponentKingId,
      payload.firstStrikeTarget,
      payload.deterministic
    );
    initializeNorseContext(
      payload.playerKingId || null,
      payload.opponentKingId || null,
      payload.playerPet.norseHeroId || null,
      payload.opponentPet.norseHeroId || null
    );
    store.initializeCombat(
      [{
        id: 'player-king',
        type: 'king',
        heroId: payload.playerId,
        position: { row: 0, col: 4 },
        isAlive: true,
        hasMoved: false,
        ownerId: 'player',
      }],
      [{
        id: 'opponent-king',
        type: 'king',
        heroId: payload.opponentId,
        position: { row: 7, col: 4 },
        isAlive: true,
        hasMoved: false,
        ownerId: 'opponent',
      }]
    );
  };

  return {
    combatState: getStore().pokerCombatState,
    deck: getStore().pokerDeck,
    isActive: getStore().pokerIsActive,
    mulliganComplete: getStore().mulliganComplete,

    initializeCombat: (playerId, playerName, playerPet, opponentId, opponentName, opponentPet, skipMulligan, playerKingId, opponentKingId, firstStrikeTarget?: 'player' | 'opponent', deterministic?: PokerCombatDeterministicOptions) => {
      initializeCombatFromPayload({
        playerId,
        playerName,
        playerPet,
        opponentId,
        opponentName,
        opponentPet,
        skipMulligan: skipMulligan ?? false,
        playerKingId,
        opponentKingId,
        firstStrikeTarget,
        deterministic,
      });
    },

    initializeCombatFromPayload,

    completeMulligan: () => {
      getStore().completeMulligan();
    },

    performAction: (playerId, action, hpCommitment, origin, nowMs) => {
      if (nowMs === undefined) {
        getStore().performPokerAction(playerId, action, hpCommitment, origin);
      } else {
        getStore().performPokerAction(playerId, action, hpCommitment, origin, nowMs);
      }
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

    syncTurnClock: (input) => {
      getStore().syncPokerTurnClock(input);
    },

    applyNotarizedTurnClock: (input) => {
      getStore().applyNotarizedPokerTurnClock(input);
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
