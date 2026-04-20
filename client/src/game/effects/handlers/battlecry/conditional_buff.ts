/**
 * Conditional Buff Effect Handler
 * 
 * This handler implements the battlecry:conditional_buff effect.
 * Checks a condition before applying the buff.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';

/**
 * Execute a Conditional Buff effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeConditionalBuff(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  const sourceCardInstance: any = {
    instanceId: 'temp-' + Date.now(),
    card: sourceCard,
    canAttack: false,
    isPlayed: true,
    isSummoningSick: false,
    attacksPerformed: 0
  };

  try {
    context.logGameEvent(`Executing battlecry:conditional_buff for ${sourceCard.name}`);
    
    const condition = effect.condition;
    const requiresTarget = effect.requiresTarget === true;
    const targetType = effect.targetType || 'self';
    const buffAttack = effect.buffAttack || 0;
    const buffHealth = effect.buffHealth || 0;
    
    if (!condition) {
      context.logGameEvent(`No condition specified for conditional_buff`);
      return { success: false, error: 'No condition specified' };
    }
    
    const conditionMet = checkCondition(context, condition, sourceCardInstance);
    
    if (!conditionMet) {
      context.logGameEvent(`Condition "${condition}" not met for ${sourceCard.name}`);
      return { success: true };
    }
    
    context.logGameEvent(`Condition "${condition}" met, applying buff`);
    
    if (buffAttack === 0 && buffHealth === 0) {
      context.logGameEvent(`ConditionalBuff effect has no buffs specified`);
      return { success: true };
    }
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (requiresTarget && targets.length === 0) {
      context.logGameEvent(`No valid targets for battlecry:conditional_buff`);
      return { success: false, error: 'No valid targets' };
    }
    
    if (targets.length === 0) {
      context.logGameEvent(`No targets available for conditional_buff effect`);
      return { success: true };
    }
    
    let buffedCount = 0;
    
    targets.forEach(target => {
      if (target.card.type === 'minion') {
        if (buffAttack !== 0) {
          target.currentAttack = (target.currentAttack || target.card.attack || 0) + buffAttack;
          target.card.attack = (target.card.attack || 0) + buffAttack;
        }
        
        if (buffHealth !== 0) {
          target.currentHealth = (target.currentHealth || target.card.health || 0) + buffHealth;
          target.card.health = (target.card.health || 0) + buffHealth;
        }
        
        buffedCount++;
        context.logGameEvent(`${sourceCard.name} buffed ${target.card.name} by +${buffAttack}/+${buffHealth}`);
      }
    });
    
    return { success: true, additionalData: { buffedCount, conditionMet: true } };
  } catch (error) {
    debug.error(`Error executing battlecry:conditional_buff:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:conditional_buff: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

function checkCondition(context: GameContext, condition: string, sourceCard: any): boolean {
  switch (condition) {
    case 'holding_dragon':
      return context.currentPlayer.hand.some(c => (c.card.race || '').toLowerCase() === 'dragon');

    case 'holding_beast':
      return context.currentPlayer.hand.some(c => (c.card.race || '').toLowerCase() === 'beast');
    
    case 'holding_spell':
      return context.currentPlayer.hand.some(c => c.card.type === 'spell');
    
    case 'holding_weapon':
      return context.currentPlayer.hand.some(c => c.card.type === 'weapon');
    
    case 'played_elemental_last_turn':
      return (context as any).playedElementalLastTurn === true;
    
    case 'combo':
      return context.currentPlayer.cardsPlayedThisTurn > 0;
    
    case 'enemy_minion_damaged':
      return context.opponentPlayer.board.some(m => 
        (m.currentHealth || m.card.health || 0) < (m.card.health || 0)
      );
    
    case 'friendly_minion_damaged':
      return context.currentPlayer.board.some(m => 
        (m.currentHealth || m.card.health || 0) < (m.card.health || 0)
      );
    
    case 'board_has_minion':
      return context.currentPlayer.board.length > 0;
    
    case 'hand_empty':
      return context.currentPlayer.hand.length === 0;
    
    case 'deck_empty':
      return context.currentPlayer.deck.length === 0;
    
    case 'enemy_board_full':
      return context.opponentPlayer.board.length >= MAX_BATTLEFIELD_SIZE;
    
    case 'friendly_board_full':
      return context.currentPlayer.board.length >= MAX_BATTLEFIELD_SIZE;
    
    case 'has_weapon':
      return (context.currentPlayer as any).weapon !== undefined;
    
    case 'no_duplicates_deck':
      const deckIds = context.currentPlayer.deck.map(c => c.card.id);
      return deckIds.length === new Set(deckIds).size;
    
    case 'low_health':
      return context.currentPlayer.health <= 15;
    
    case 'high_health':
      return context.currentPlayer.health >= 25;
    
    default:
      debug.warn(`Unknown condition: ${condition}`);
      return false;
  }
}
