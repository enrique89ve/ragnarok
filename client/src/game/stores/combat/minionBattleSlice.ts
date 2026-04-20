/**
 * MinionBattleSlice - Minion battlefield state and actions
 * 
 * Manages minion spawning, removal, and attack resolution on the battlefield.
 * Also owns the sharedDeck state for card management.
 */

import { StateCreator } from 'zustand';
import { MinionBattleResolver, MinionState, HeroState, BattlefieldState, CombatResult } from '../../flow/MinionBattleResolver';
import { 
  MinionBattleSlice,
  UnifiedCombatStore
} from './types';

const battleResolver = new MinionBattleResolver();

export const createMinionBattleSlice: StateCreator<
  UnifiedCombatStore,
  [],
  [],
  MinionBattleSlice
> = (set, get) => ({
  battlefield: null,
  sharedDeck: null,
  pendingElementalBuffNotification: null,

  initializeSharedDeck: (cardIds: string[]) => {
    set({
      sharedDeck: {
        remainingCards: [...cardIds],
        burnedCards: [],
        dealtToPlayer: [],
        dealtToOpponent: []
      }
    });
  },

  burnCard: (cardId: string) => {
    const sharedDeck = get().sharedDeck;
    if (!sharedDeck) return;

    set({
      sharedDeck: {
        ...sharedDeck,
        remainingCards: sharedDeck.remainingCards.filter(id => id !== cardId),
        burnedCards: [...sharedDeck.burnedCards, cardId]
      }
    });
  },

  dealCardToPlayer: (player: 'player' | 'opponent', cardId: string) => {
    const sharedDeck = get().sharedDeck;
    if (!sharedDeck) return;

    const updatedDeck = {
      ...sharedDeck,
      remainingCards: sharedDeck.remainingCards.filter(id => id !== cardId)
    };

    if (player === 'player') {
      updatedDeck.dealtToPlayer = [...sharedDeck.dealtToPlayer, cardId];
    } else {
      updatedDeck.dealtToOpponent = [...sharedDeck.dealtToOpponent, cardId];
    }

    set({ sharedDeck: updatedDeck });
  },

  spawnMinion: (minion) => {
    const battlefield = get().battlefield;
    const pokerCombatState = get().pokerCombatState;
    if (!battlefield) return;

    const buffedMinion = { ...minion };
    
    const ownerState = minion.ownerId === 'player' 
      ? pokerCombatState?.player 
      : pokerCombatState?.opponent;
    
    if (ownerState?.elementBuff?.hasAdvantage) {
      const attackBonus = ownerState.elementBuff.attackBonus || 0;
      const healthBonus = ownerState.elementBuff.healthBonus || 0;
      buffedMinion.attack = (buffedMinion.attack || 0) + attackBonus;
      buffedMinion.health = (buffedMinion.health || 0) + healthBonus;
      buffedMinion.maxHealth = (buffedMinion.maxHealth || buffedMinion.health || 0) + healthBonus;
      (buffedMinion as any).hasElementalBuff = true;
      (buffedMinion as any).elementalBuffAmount = { attack: attackBonus, health: healthBonus };
      
      set({
        pendingElementalBuffNotification: {
          minionId: buffedMinion.instanceId,
          minionName: buffedMinion.name,
          attackBonus,
          healthBonus,
          element: ownerState.pet?.stats?.element || 'neutral',
          owner: minion.ownerId as 'player' | 'opponent',
          timestamp: Date.now()
        }
      });
    }

    if (minion.ownerId === 'player') {
      set({
        battlefield: {
          ...battlefield,
          playerMinions: [...battlefield.playerMinions, buffedMinion],
        },
      });
    } else {
      set({
        battlefield: {
          ...battlefield,
          opponentMinions: [...battlefield.opponentMinions, buffedMinion],
        },
      });
    }
  },

  removeMinion: (instanceId) => {
    const battlefield = get().battlefield;
    if (!battlefield) return;

    set({
      battlefield: {
        ...battlefield,
        playerMinions: battlefield.playerMinions.filter((m) => m.instanceId !== instanceId),
        opponentMinions: battlefield.opponentMinions.filter((m) => m.instanceId !== instanceId),
      },
    });
  },

  resolveMinionAttack: (attackerId, targetId) => {
    const battlefield = get().battlefield;
    if (!battlefield) return null;

    const allMinions = [...battlefield.playerMinions, ...battlefield.opponentMinions];
    const attacker = allMinions.find((m) => m.instanceId === attackerId);
    const defender = allMinions.find((m) => m.instanceId === targetId);

    if (!attacker) return null;

    if (defender) {
      const { result, updatedAttacker, updatedDefender } = battleResolver.resolveMinionVsMinion(attacker, defender);
      
      set({
        battlefield: {
          ...battlefield,
          playerMinions: battlefield.playerMinions
            .map((m) => (m.instanceId === attackerId ? updatedAttacker : m.instanceId === targetId ? updatedDefender : m))
            .filter((m) => m.health > 0),
          opponentMinions: battlefield.opponentMinions
            .map((m) => (m.instanceId === attackerId ? updatedAttacker : m.instanceId === targetId ? updatedDefender : m))
            .filter((m) => m.health > 0),
        },
      });

      get().addLogEntry({
        id: `attack_${Date.now()}`,
        timestamp: Date.now(),
        type: 'attack',
        message: `${attacker.name} attacks ${defender.name}`,
        details: result,
      });

      return result;
    }

    const targetHero = targetId === battlefield.playerHero.heroId
      ? battlefield.playerHero
      : battlefield.opponentHero;

    const { result, updatedAttacker, updatedDefender } = battleResolver.resolveMinionVsHero(attacker, targetHero);

    set({
      battlefield: {
        ...battlefield,
        playerHero: targetId === battlefield.playerHero.heroId ? updatedDefender : battlefield.playerHero,
        opponentHero: targetId === battlefield.opponentHero.heroId ? updatedDefender : battlefield.opponentHero,
        playerMinions: battlefield.playerMinions.map((m) =>
          m.instanceId === attackerId ? updatedAttacker : m
        ),
        opponentMinions: battlefield.opponentMinions.map((m) =>
          m.instanceId === attackerId ? updatedAttacker : m
        ),
      },
    });

    get().addLogEntry({
      id: `attack_hero_${Date.now()}`,
      timestamp: Date.now(),
      type: 'attack',
      message: `${attacker.name} attacks ${targetHero.name}`,
      details: result,
    });

    return result;
  },

  clearElementalBuffNotification: () => {
    set({ pendingElementalBuffNotification: null });
  },
});

export { battleResolver };
