/**
 * WheelOfYogg Battlecry Handler
 * 
 * Implements the "wheel_of_yogg" battlecry effect.
 * Spins a wheel for a random crazy effect (Utgarda-Loki, Lord of Illusions).
 * Example card: Moirai, Master of Fate (ID: 95231)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_BATTLEFIELD_SIZE, MAX_HAND_SIZE } from '../../../constants/gameConstants';

const ROD_MAX_ITERATIONS = 50;

const YOGG_WHEEL_EFFECTS = [
  {
    name: 'Rod of Roasting',
    description: 'Cast Pyroblast randomly until a hero dies',
    execute: (context: GameContext, sourceCard: Card) => {
      const results: string[] = [];
      let playerHealth = context.currentPlayer.health;
      let opponentHealth = context.opponentPlayer.health;
      
      while (playerHealth > 0 && opponentHealth > 0 && results.length < ROD_MAX_ITERATIONS) {
        const targetPlayer = Math.random() < 0.5;
        if (targetPlayer) {
          playerHealth -= 10;
          results.push('Pyroblast hit you for 10');
        } else {
          opponentHealth -= 10;
          results.push('Pyroblast hit enemy for 10');
        }
      }
      
      context.currentPlayer.health = Math.max(0, playerHealth);
      context.opponentPlayer.health = Math.max(0, opponentHealth);
      
      return { effectName: 'Rod of Roasting', results };
    }
  },
  {
    name: 'Mystifying Miscreation',
    description: 'Fill your board with random minions',
    execute: (context: GameContext, sourceCard: Card) => {
      const slotsAvailable = MAX_BATTLEFIELD_SIZE - context.currentPlayer.board.length;
      const summoned: string[] = [];
      
      for (let i = 0; i < slotsAvailable; i++) {
        const randomStats = {
          attack: Math.floor(Math.random() * 8) + 1,
          health: Math.floor(Math.random() * 8) + 1,
          cost: Math.floor(Math.random() * 10)
        };
        
        const randomMinion: CardInstance = {
          instanceId: 'yogg-minion-' + Date.now() + '-' + i,
          card: {
            id: 99900 + i,
            name: `Yogg's Creation ${i + 1}`,
            description: 'Created by the Wheel of Illusions',
            manaCost: randomStats.cost,
            type: 'minion',
            rarity: 'mythic',
            heroClass: 'neutral',
            attack: randomStats.attack,
            health: randomStats.health
          },
          currentAttack: randomStats.attack,
          currentHealth: randomStats.health,
          canAttack: false,
          isPlayed: true,
          isSummoningSick: true,
          attacksPerformed: 0
        };
        
        context.currentPlayer.board.push(randomMinion);
        summoned.push(`${randomStats.attack}/${randomStats.health}`);
      }
      
      return { effectName: 'Mystifying Miscreation', summoned };
    }
  },
  {
    name: 'Hand of Fate',
    description: 'Fill your hand with random spells (they cost 0)',
    execute: (context: GameContext, sourceCard: Card) => {
      const slotsAvailable = MAX_HAND_SIZE - context.currentPlayer.hand.length;
      const added: string[] = [];
      
      const spellTypes = ['Runefire Bolt', 'Frostbolt', 'Arcane Intellect', 'Runefire Blast', 'Niflheim\'s Embrace', 'Flamestrike'];
      
      for (let i = 0; i < slotsAvailable; i++) {
        const spellName = spellTypes[Math.floor(Math.random() * spellTypes.length)];
        
        const spell: CardInstance = {
          instanceId: 'yogg-spell-' + Date.now() + '-' + i,
          card: {
            id: 99800 + i,
            name: `${spellName} (Free)`,
            description: 'Costs 0 this turn only.',
            manaCost: 0,
            type: 'spell',
            rarity: 'rare',
            heroClass: 'neutral'
          },
          canAttack: false,
          isPlayed: false,
          isSummoningSick: false,
          attacksPerformed: 0
        };
        
        context.currentPlayer.hand.push(spell);
        added.push(spellName);
      }
      
      return { effectName: 'Hand of Fate', spellsAdded: added };
    }
  },
  {
    name: 'Curse of Flesh',
    description: 'Fill both boards with random minions',
    execute: (context: GameContext, sourceCard: Card) => {
      const results = { friendly: [] as string[], enemy: [] as string[] };
      
      const friendlySlots = MAX_BATTLEFIELD_SIZE - context.currentPlayer.board.length;
      const enemySlots = MAX_BATTLEFIELD_SIZE - context.opponentPlayer.board.length;
      
      for (let i = 0; i < friendlySlots; i++) {
        const stats = { attack: Math.floor(Math.random() * 6) + 1, health: Math.floor(Math.random() * 6) + 1 };
        const minion: CardInstance = {
          instanceId: 'curse-friendly-' + Date.now() + '-' + i,
          card: {
            id: 99700 + i,
            name: 'Flesh Horror',
            description: 'Summoned by Curse of Flesh',
            manaCost: 3,
            type: 'minion',
            rarity: 'common',
            heroClass: 'neutral',
            attack: stats.attack,
            health: stats.health
          },
          currentAttack: stats.attack,
          currentHealth: stats.health,
          canAttack: false,
          isPlayed: true,
          isSummoningSick: true,
          attacksPerformed: 0
        };
        context.currentPlayer.board.push(minion);
        results.friendly.push(`${stats.attack}/${stats.health}`);
      }
      
      for (let i = 0; i < enemySlots; i++) {
        const stats = { attack: Math.floor(Math.random() * 6) + 1, health: Math.floor(Math.random() * 6) + 1 };
        const minion: CardInstance = {
          instanceId: 'curse-enemy-' + Date.now() + '-' + i,
          card: {
            id: 99600 + i,
            name: 'Flesh Horror',
            description: 'Summoned by Curse of Flesh',
            manaCost: 3,
            type: 'minion',
            rarity: 'common',
            heroClass: 'neutral',
            attack: stats.attack,
            health: stats.health
          },
          currentAttack: stats.attack,
          currentHealth: stats.health,
          canAttack: false,
          isPlayed: true,
          isSummoningSick: true,
          attacksPerformed: 0
        };
        context.opponentPlayer.board.push(minion);
        results.enemy.push(`${stats.attack}/${stats.health}`);
      }
      
      return { effectName: 'Curse of Flesh', ...results };
    }
  },
  {
    name: 'Mindflayer Goggles',
    description: 'Take control of 3 random enemy minions',
    execute: (context: GameContext, sourceCard: Card) => {
      const stolen: string[] = [];
      const enemyMinions = [...context.opponentPlayer.board];
      const slotsAvailable = MAX_BATTLEFIELD_SIZE - context.currentPlayer.board.length;
      const toSteal = Math.min(3, enemyMinions.length, slotsAvailable);
      
      for (let i = 0; i < toSteal; i++) {
        if (enemyMinions.length === 0) break;
        
        const randomIndex = Math.floor(Math.random() * enemyMinions.length);
        const minion = enemyMinions.splice(randomIndex, 1)[0];
        
        const boardIndex = context.opponentPlayer.board.findIndex(m => m.instanceId === minion.instanceId);
        if (boardIndex !== -1) {
          context.opponentPlayer.board.splice(boardIndex, 1);
          minion.isPlayerOwned = true;
          minion.isSummoningSick = true;
          context.currentPlayer.board.push(minion);
          stolen.push(minion.card.name);
        }
      }
      
      return { effectName: 'Mindflayer Goggles', stolenMinions: stolen };
    }
  },
  {
    name: 'Devouring Hunger',
    description: 'Destroy all other minions. Gain their stats.',
    execute: (context: GameContext, sourceCard: Card) => {
      let totalAttack = 0;
      let totalHealth = 0;
      const destroyed: string[] = [];
      
      const sourceMinion = context.getFriendlyMinions().find(m => m.card.id === sourceCard.id);
      
      for (const minion of [...context.currentPlayer.board, ...context.opponentPlayer.board]) {
        if (minion.card.id === sourceCard.id) continue;
        
        totalAttack += minion.currentAttack || minion.card.attack || 0;
        totalHealth += minion.currentHealth || minion.card.health || 0;
        destroyed.push(minion.card.name);
      }
      
      context.currentPlayer.board = context.currentPlayer.board.filter(m => m.card.id === sourceCard.id);
      context.opponentPlayer.board = [];
      
      if (sourceMinion) {
        sourceMinion.currentAttack = (sourceMinion.currentAttack || sourceMinion.card.attack || 0) + totalAttack;
        sourceMinion.currentHealth = (sourceMinion.currentHealth || sourceMinion.card.health || 0) + totalHealth;
      }
      
      return { effectName: 'Devouring Hunger', destroyed, statsGained: `+${totalAttack}/+${totalHealth}` };
    }
  }
];

export default function executeWheelOfYogg(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:wheel_of_yogg for ${sourceCard.name}`);
    
    const condition = effect.condition;
    const conditionValue = effect.conditionValue || 10;
    
    if (condition === 'spells_cast') {
      const spellsCast = (context as any).spellsCastThisGame?.length || 0;
      if (spellsCast < conditionValue) {
        context.logGameEvent(`Wheel of Illusions condition not met: only ${spellsCast} spells cast (need ${conditionValue})`);
        return { success: true, additionalData: { conditionNotMet: true, spellsCast, required: conditionValue } };
      }
    }
    
    const randomEffect = YOGG_WHEEL_EFFECTS[Math.floor(Math.random() * YOGG_WHEEL_EFFECTS.length)];
    
    context.logGameEvent(`The wheel lands on: ${randomEffect.name} - ${randomEffect.description}`);
    
    const result = randomEffect.execute(context, sourceCard);
    
    context.logGameEvent(`${randomEffect.name} completed!`);
    
    return { 
      success: true, 
      additionalData: result
    };
  } catch (error) {
    debug.error(`Error executing battlecry:wheel_of_yogg:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:wheel_of_yogg: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
