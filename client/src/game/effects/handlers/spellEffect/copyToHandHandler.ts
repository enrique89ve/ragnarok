/**
 * Copy To Hand Effect Handler
 * 
 * This handler implements the spellEffect:copy_to_hand effect.
 * Copies a minion or card to the player's hand.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';

export default function executeCopyToHand(
  context: GameContext, 
  effect: SpellEffect, 
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
    context.logGameEvent(`Executing spellEffect:copy_to_hand for ${sourceCard.name}`);
    
    const targetType = effect.targetType || 'friendly_minion';
    const targetsAll = effect.targetsAll || false;
    const condition = effect.condition;
    
    let targets = context.getTargets(targetType, sourceCardInstance);
    
    if (condition) {
      targets = targets.filter(target => {
        if (condition === 'damaged' && target.card.type === 'minion') {
          const currentHealth = target.currentHealth || target.card.health || 0;
          const maxHealth = target.card.health || 0;
          return currentHealth < maxHealth;
        }
        if (condition === 'deathrattle') {
          return target.card.deathrattle !== undefined;
        }
        if (condition === 'battlecry') {
          return target.card.battlecry !== undefined;
        }
        return true;
      });
    }
    
    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for copy_to_hand`);
      return { success: false, error: 'No valid targets' };
    }
    
    if (!targetsAll) {
      targets = [targets[0]];
    }
    
    const copiedCards: string[] = [];
    
    targets.forEach(target => {
      if (context.currentPlayer.hand.length >= MAX_HAND_SIZE) {
        context.logGameEvent(`Hand is full, couldn't copy ${target.card.name}`);
        return;
      }
      
      const copy = {
        instanceId: 'copy-' + Date.now() + '-' + Math.random().toString(36).substring(7),
        card: { ...target.card },
        canAttack: false,
        isPlayed: false,
        isSummoningSick: true,
        attacksPerformed: 0,
        currentHealth: target.card.health
      };
      
      context.currentPlayer.hand.push(copy as any);
      copiedCards.push(target.card.name);
      context.logGameEvent(`Copied ${target.card.name} to hand`);
    });
    
    return { 
      success: true,
      additionalData: {
        copiedCount: copiedCards.length,
        cardNames: copiedCards
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:copy_to_hand:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:copy_to_hand: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
