/**
 * HealthPerCard Battlecry Handler
 * 
 * Implements the "health_per_card" battlecry effect.
 * Gains health based on cards in hand/deck (e.g., Twilight Drake).
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a health_per_card battlecry effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeHealthPerCard(
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
    attacksPerformed: 0,
    currentHealth: sourceCard.health || 0,
    currentAttack: sourceCard.attack || 0
  };

  try {
    context.logGameEvent(`Executing battlecry:health_per_card for ${sourceCard.name}`);
    
    const cardSource = effect.cardSource || 'hand';
    const healthPerCard = effect.healthPerCard || 1;
    const attackPerCard = effect.attackPerCard || 0;
    const targetType = effect.targetType || 'self';
    
    let cardCount = 0;
    
    switch (cardSource) {
      case 'hand':
        cardCount = context.currentPlayer.hand.length;
        break;
      case 'deck':
        cardCount = context.currentPlayer.deck.length;
        break;
      case 'board':
        cardCount = context.currentPlayer.board.length;
        break;
      case 'graveyard':
        cardCount = context.currentPlayer.graveyard ? context.currentPlayer.graveyard.length : 0;
        break;
      default:
        cardCount = context.currentPlayer.hand.length;
    }
    
    const healthGain = cardCount * healthPerCard;
    const attackGain = cardCount * attackPerCard;
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (targets.length === 0) {
      context.logGameEvent(`No targets for health_per_card effect, targeting self`);
      if (healthGain > 0) {
        sourceCardInstance.currentHealth = (sourceCardInstance.currentHealth || sourceCard.health || 0) + healthGain;
        sourceCardInstance.card.health = (sourceCard.health || 0) + healthGain;
      }
      if (attackGain > 0) {
        sourceCardInstance.currentAttack = (sourceCardInstance.currentAttack || sourceCard.attack || 0) + attackGain;
        sourceCardInstance.card.attack = (sourceCard.attack || 0) + attackGain;
      }
      context.logGameEvent(`${sourceCard.name} gained +${attackGain}/+${healthGain} (from ${cardCount} cards in ${cardSource})`);
      return { success: true, additionalData: { cardCount, healthGain, attackGain } };
    }
    
    targets.forEach(target => {
      if (target.card.type === 'minion') {
        if (healthGain > 0) {
          target.currentHealth = (target.currentHealth || target.card.health || 0) + healthGain;
          target.card.health = (target.card.health || 0) + healthGain;
        }
        if (attackGain > 0) {
          target.currentAttack = (target.currentAttack || target.card.attack || 0) + attackGain;
          target.card.attack = (target.card.attack || 0) + attackGain;
        }
        context.logGameEvent(`${sourceCard.name} gave ${target.card.name} +${attackGain}/+${healthGain} (from ${cardCount} cards in ${cardSource})`);
      }
    });
    
    return { success: true, additionalData: { cardCount, healthGain, attackGain } };
  } catch (error) {
    debug.error(`Error executing battlecry:health_per_card:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:health_per_card: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
