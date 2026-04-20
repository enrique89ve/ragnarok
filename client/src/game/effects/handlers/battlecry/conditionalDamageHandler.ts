/**
 * ConditionalDamage Battlecry Handler
 * 
 * Implements the "conditional_damage" battlecry effect.
 * Checks effect.condition (like 'elemental_played_this_turn'), if true deals effect.value damage.
 * Example card: Blazecaller (ID: 30030)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Check if a condition is met for the current game state
 */
function checkCondition(context: GameContext, condition: string): boolean {
  switch (condition) {
    case 'elemental_played_this_turn':
    case 'elemental_played_last_turn':
      return context.currentPlayer.minionsPlayedThisTurn > 0;
    
    case 'combo':
      return context.currentPlayer.cardsPlayedThisTurn > 0;
    
    case 'holding_dragon':
      return context.currentPlayer.hand.some(card => (card.card.race || '').toLowerCase() === 'dragon');
    
    case 'holding_spell':
      return context.currentPlayer.hand.some(card => card.card.type === 'spell');
    
    case 'holding_minion':
      return context.currentPlayer.hand.some(card => card.card.type === 'minion');
    
    case 'damaged_hero':
      return context.currentPlayer.health < context.currentPlayer.maxHealth;
    
    case 'enemy_damaged':
      return context.opponentPlayer.health < context.opponentPlayer.maxHealth;
    
    case 'board_has_minions':
      return context.currentPlayer.board.length > 0;
    
    case 'enemy_board_has_minions':
      return context.opponentPlayer.board.length > 0;
    
    case 'overloaded':
      return context.currentPlayer.mana.overloaded > 0;
    
    case 'hand_empty':
      return context.currentPlayer.hand.length === 0;
    
    case 'deck_has_no_duplicates':
      const cardIds = context.currentPlayer.deck.map(c => c.card.id);
      return cardIds.length === new Set(cardIds).size;
    
    default:
      debug.warn(`Unknown condition: ${condition}`);
      return false;
  }
}

/**
 * Execute a conditional_damage battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeConditionalDamage(
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
    context.logGameEvent(`Executing battlecry:conditional_damage for ${sourceCard.name}`);
    
    const condition = effect.condition;
    const damageValue = effect.value || 0;
    const requiresTarget = effect.requiresTarget === true;
    const targetType = effect.targetType || 'enemy_character';
    
    if (!condition) {
      context.logGameEvent(`ConditionalDamage effect missing condition property`);
      return { success: false, error: 'No condition specified' };
    }
    
    if (damageValue <= 0) {
      context.logGameEvent(`ConditionalDamage effect has no damage value`);
      return { success: false, error: 'No damage value specified' };
    }
    
    const conditionMet = checkCondition(context, condition);
    
    if (!conditionMet) {
      context.logGameEvent(`${sourceCard.name}'s condition "${condition}" was not met - no damage dealt`);
      return { success: true, additionalData: { conditionMet: false, damageDealt: 0 } };
    }
    
    context.logGameEvent(`${sourceCard.name}'s condition "${condition}" was met!`);
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (requiresTarget && targets.length === 0) {
      context.logGameEvent(`No valid targets for conditional damage`);
      return { success: false, error: 'No valid targets' };
    }
    
    if (targets.length === 0) {
      context.logGameEvent(`No targets available for conditional damage effect`);
      return { success: true, additionalData: { conditionMet: true, damageDealt: 0 } };
    }
    
    let totalDamageDealt = 0;
    
    targets.forEach(target => {
      context.dealDamage(target, damageValue);
      totalDamageDealt += damageValue;
      context.logGameEvent(`${sourceCard.name} dealt ${damageValue} conditional damage to ${target.card.name}`);
    });
    
    context.currentPlayer.damageDealtThisTurn += totalDamageDealt;
    
    return { success: true, additionalData: { conditionMet: true, totalDamageDealt } };
  } catch (error) {
    debug.error(`Error executing battlecry:conditional_damage:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:conditional_damage: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
