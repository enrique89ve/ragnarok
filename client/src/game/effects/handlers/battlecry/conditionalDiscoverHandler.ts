/**
 * ConditionalDiscover Battlecry Handler
 * 
 * Implements the "conditional_discover" battlecry effect.
 * Checks a condition (combo, holding_dragon, played_elemental, etc.) before discovering.
 * Example card: Servant of Kalimos (ID: 30032) - requires playing an Elemental last turn
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';
import { getRandomCardsFromPool } from '../../../data/discoverPools';
import { getDiscoveryOptions } from '../../../utils/discoveryUtils';

/**
 * Check if a condition is met for conditional discover
 */
function checkCondition(
  context: GameContext, 
  condition: string | { type: string; [key: string]: any },
  sourceCard: Card
): boolean {
  const conditionType = typeof condition === 'string' ? condition : condition.type;
  
  switch (conditionType) {
    case 'combo':
      return context.currentPlayer.cardsPlayedThisTurn > 0;
      
    case 'holding_dragon':
      return context.currentPlayer.hand.some((cardInstance: CardInstance) => {
        const card = cardInstance.card;
        const race = (card.race || '').toLowerCase();
        return race === 'dragon';
      });
      
    case 'holding_beast':
      return context.currentPlayer.hand.some((cardInstance: CardInstance) => {
        const card = cardInstance.card;
        const race = (card.race || '').toLowerCase();
        return race === 'beast';
      });
      
    case 'played_elemental':
    case 'elemental_played_last_turn':
      return context.currentPlayer.minionsPlayedThisTurn > 0 || 
             context.currentPlayer.hand.some((cardInstance: CardInstance) => {
               const card = cardInstance.card;
               const race = (card.race || '').toLowerCase();
               return race === 'elemental';
             });
      
    case 'board_has_minion':
      return context.currentPlayer.board.length > 0;
      
    case 'enemy_board_has_minion':
      return context.opponentPlayer.board.length > 0;
      
    case 'damaged_hero':
      return context.currentPlayer.health < context.currentPlayer.maxHealth;
      
    case 'no_duplicates':
    case 'highlander':
      const cardCounts = new Map<number | string, number>();
      for (const cardInstance of context.currentPlayer.deck) {
        const id = cardInstance.card.id;
        cardCounts.set(id, (cardCounts.get(id) || 0) + 1);
        if (cardCounts.get(id)! > 1) return false;
      }
      return true;
      
    case 'weapon_equipped':
      return context.currentPlayer.hand.some((cardInstance: CardInstance) => 
        cardInstance.card.type === 'weapon'
      );
      
    case 'spell_in_hand':
      return context.currentPlayer.hand.some((cardInstance: CardInstance) => 
        cardInstance.card.type === 'spell'
      );
      
    case 'empty_hand':
      return context.currentPlayer.hand.length === 0;
      
    case 'full_hand':
      return context.currentPlayer.hand.length >= MAX_HAND_SIZE;
      
    default:
      debug.warn(`Unknown condition type: ${conditionType}, defaulting to true`);
      return true;
  }
}

/**
 * Execute a conditional_discover battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect to execute with condition and discoveryType
 * @param sourceCard - The card that triggered the effect
 * @returns EffectResult with discovery state if condition is met
 */
export default function executeConditionalDiscover(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:conditional_discover for ${sourceCard.name}`);
    
    const condition = effect.condition;
    const discoveryType = effect.discoveryType || effect.discoverType || effect.pool || 'any';
    const discoveryCount = effect.discoveryCount || effect.count || 3;
    
    if (!condition) {
      context.logGameEvent(`ConditionalDiscover effect missing condition, proceeding with discovery`);
    }
    
    const conditionMet = condition ? checkCondition(context, condition, sourceCard) : true;
    
    if (!conditionMet) {
      const conditionName = typeof condition === 'string' ? condition : condition?.type || 'unknown';
      context.logGameEvent(`Condition '${conditionName}' not met for ${sourceCard.name}'s discover`);
      return { 
        success: true,
        additionalData: {
          conditionMet: false,
          conditionType: conditionName
        }
      };
    }
    
    context.logGameEvent(`Condition met! Discovering ${discoveryType} cards`);
    
    let discoveryOptions: any[] = [];
    
    if (discoveryType !== 'any') {
      discoveryOptions = getRandomCardsFromPool(discoveryType, discoveryCount);
    }
    
    if (discoveryOptions.length === 0) {
      discoveryOptions = getDiscoveryOptions(
        discoveryCount,
        discoveryType as any,
        sourceCard.heroClass as string || 'any'
      );
    }
    
    if (discoveryOptions.length === 0) {
      context.logGameEvent(`No cards available for conditional discovery`);
      return { 
        success: false, 
        error: 'No cards available for discovery' 
      };
    }
    
    context.logGameEvent(`Presenting ${discoveryOptions.length} discovery options to player`);
    
    return { 
      success: true,
      additionalData: {
        conditionMet: true,
        discoveryState: {
          active: true,
          options: discoveryOptions,
          sourceCardId: String(sourceCard.id),
          sourceCardName: sourceCard.name,
          discoverType: discoveryType,
          addToHand: effect.addToHand !== false
        }
      }
    };
  } catch (error) {
    debug.error(`Error executing battlecry:conditional_discover:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:conditional_discover: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
