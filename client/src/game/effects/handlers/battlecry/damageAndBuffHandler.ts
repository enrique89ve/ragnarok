/**
 * DamageAndBuff Battlecry Handler
 * 
 * Implements the "damage_and_buff" battlecry effect.
 * Deals damage to target AND buffs the source minion with effect.buffAttack/effect.buffHealth.
 * Example card: Card ID: 5009
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a damage_and_buff battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeDamageAndBuff(
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
    context.logGameEvent(`Executing battlecry:damage_and_buff for ${sourceCard.name}`);
    
    const damageValue = effect.value || 0;
    const buffAttack = effect.buffAttack || 0;
    const buffHealth = effect.buffHealth || 0;
    const requiresTarget = effect.requiresTarget === true;
    const targetType = effect.targetType || 'enemy_character';
    
    if (damageValue <= 0) {
      context.logGameEvent(`DamageAndBuff effect has no damage value`);
      return { success: false, error: 'No damage value specified' };
    }
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (requiresTarget && targets.length === 0) {
      context.logGameEvent(`No valid targets for damage_and_buff`);
      return { success: false, error: 'No valid targets' };
    }
    
    let totalDamageDealt = 0;
    
    if (targets.length > 0) {
      targets.forEach(target => {
        context.dealDamage(target, damageValue);
        totalDamageDealt += damageValue;
        context.logGameEvent(`${sourceCard.name} dealt ${damageValue} damage to ${target.card.name}`);
      });
      
      context.currentPlayer.damageDealtThisTurn += totalDamageDealt;
    }
    
    const sourceOnBoard = context.currentPlayer.board.find(
      minion => minion.card.id === sourceCard.id
    );
    
    if (sourceOnBoard) {
      if (buffAttack > 0) {
        sourceOnBoard.currentAttack = (sourceOnBoard.currentAttack || sourceOnBoard.card.attack || 0) + buffAttack;
        context.logGameEvent(`${sourceCard.name} gained +${buffAttack} Attack`);
      }
      
      if (buffHealth > 0) {
        sourceOnBoard.currentHealth = (sourceOnBoard.currentHealth || sourceOnBoard.card.health || 0) + buffHealth;
        if (sourceOnBoard.card.health !== undefined) {
          sourceOnBoard.card.health += buffHealth;
        }
        context.logGameEvent(`${sourceCard.name} gained +${buffHealth} Health`);
      }
      
      if (buffAttack > 0 || buffHealth > 0) {
        context.logGameEvent(`${sourceCard.name} is now ${sourceOnBoard.currentAttack}/${sourceOnBoard.currentHealth}`);
      }
    } else {
      context.logGameEvent(`Could not find ${sourceCard.name} on board to apply buff`);
    }
    
    return { 
      success: true, 
      additionalData: { 
        totalDamageDealt, 
        buffApplied: { attack: buffAttack, health: buffHealth } 
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:damage_and_buff:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:damage_and_buff: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
