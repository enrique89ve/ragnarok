/**
 * CopyToHand Battlecry Handler
 * 
 * Copies a minion and adds it to the player's hand.
 * Example card: Zola the Gorgon (ID: 20306)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';

export default function executeCopyToHand(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing copy_to_hand battlecry for ${sourceCard.name}`);
    
    const targetType = effect.targetType || 'friendly_minion';
    const isGolden = effect.isGolden || false;
    
    const sourceCardInstance: CardInstance = {
      instanceId: 'temp-' + Date.now(),
      card: sourceCard,
      canAttack: false,
      isPlayed: true,
      isSummoningSick: false,
      attacksPerformed: 0
    };
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (targets.length === 0) {
      context.logGameEvent('No valid targets for copy_to_hand');
      return { success: false, error: 'No valid targets' };
    }
    
    const target = targets[0];
    
    if (context.currentPlayer.hand.length >= MAX_HAND_SIZE) {
      context.logGameEvent('Hand is full, cannot add copied card.');
      return { success: false, error: 'Hand is full' };
    }
    
    const copiedCard: CardInstance = {
      instanceId: `copy-${target.card.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      card: { ...target.card },
      currentHealth: target.card.health,
      currentAttack: target.card.attack,
      canAttack: false,
      isPlayed: false,
      isSummoningSick: false,
      attacksPerformed: 0,
      hasDivineShield: target.hasDivineShield,
      isPoisonous: target.isPoisonous,
      hasLifesteal: target.hasLifesteal
    };
    
    if (isGolden) {
      if (copiedCard.card.attack) copiedCard.card.attack *= 2;
      if (copiedCard.card.health) copiedCard.card.health *= 2;
      copiedCard.currentAttack = copiedCard.card.attack;
      copiedCard.currentHealth = copiedCard.card.health;
    }
    
    context.currentPlayer.hand.push(copiedCard);
    context.logGameEvent(`Copied ${target.card.name} to hand${isGolden ? ' (Golden)' : ''}.`);
    
    return { 
      success: true, 
      additionalData: { copiedCard, originalTarget: target }
    };
  } catch (error) {
    debug.error('Error executing copy_to_hand:', error);
    return { success: false, error: `Failed to execute copy_to_hand: ${error}` };
  }
}
