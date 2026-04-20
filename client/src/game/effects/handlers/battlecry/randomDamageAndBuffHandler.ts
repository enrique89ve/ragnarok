/**
 * RandomDamageAndBuff Battlecry Handler
 * 
 * Implements the "random_damage_and_buff" battlecry effect.
 * Deals random damage (1 to effect.maxValue) and buffs based on damage dealt.
 * Example card: Sire Denathrius (ID: 20320)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a random_damage_and_buff battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeRandomDamageAndBuff(
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
    context.logGameEvent(`Executing battlecry:random_damage_and_buff for ${sourceCard.name}`);
    
    const minValue = effect.minValue || 1;
    const maxValue = effect.maxValue || effect.value || 1;
    const isRandomSplit = effect.isRandomSplit === true;
    const damageSourceCounter = effect.damageSourceCounter || 0;
    const buffAttack = effect.buffAttack || 0;
    const buffHealth = effect.buffHealth || 0;
    const targetType = effect.targetType || 'enemy_character';
    
    let damageValue: number;
    if (damageSourceCounter > 0) {
      damageValue = damageSourceCounter;
      context.logGameEvent(`Using counter value: ${damageValue}`);
    } else {
      damageValue = Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;
      context.logGameEvent(`Random damage rolled: ${damageValue} (range: ${minValue}-${maxValue})`);
    }
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (targets.length === 0) {
      context.logGameEvent(`No targets available for random_damage_and_buff`);
      return { success: true, additionalData: { damageDealt: 0, damageValue } };
    }
    
    let totalDamageDealt = 0;
    
    if (isRandomSplit) {
      let remainingDamage = damageValue;
      
      while (remainingDamage > 0 && targets.length > 0) {
        const activeTargets = targets.filter(t => {
          if (t.card.type === 'minion' && t.currentHealth !== undefined) {
            return t.currentHealth > 0;
          }
          return true;
        });
        
        if (activeTargets.length === 0) break;
        
        const randomIndex = Math.floor(Math.random() * activeTargets.length);
        const target = activeTargets[randomIndex];
        
        context.dealDamage(target, 1);
        totalDamageDealt += 1;
        remainingDamage -= 1;
      }
      
      context.logGameEvent(`${sourceCard.name} dealt ${totalDamageDealt} damage split randomly among enemies`);
    } else {
      const randomIndex = Math.floor(Math.random() * targets.length);
      const target = targets[randomIndex];
      
      context.dealDamage(target, damageValue);
      totalDamageDealt = damageValue;
      context.logGameEvent(`${sourceCard.name} dealt ${damageValue} random damage to ${target.card.name}`);
    }
    
    context.currentPlayer.damageDealtThisTurn += totalDamageDealt;
    
    const sourceOnBoard = context.currentPlayer.board.find(
      minion => minion.card.id === sourceCard.id
    );
    
    if (sourceOnBoard) {
      const actualBuffAttack = effect.buffPerDamage ? totalDamageDealt * (effect.buffPerDamage || 1) : buffAttack;
      const actualBuffHealth = effect.buffPerDamage ? totalDamageDealt * (effect.buffPerDamage || 1) : buffHealth;
      
      if (actualBuffAttack > 0) {
        sourceOnBoard.currentAttack = (sourceOnBoard.currentAttack || sourceOnBoard.card.attack || 0) + actualBuffAttack;
        context.logGameEvent(`${sourceCard.name} gained +${actualBuffAttack} Attack from damage dealt`);
      }
      
      if (actualBuffHealth > 0) {
        sourceOnBoard.currentHealth = (sourceOnBoard.currentHealth || sourceOnBoard.card.health || 0) + actualBuffHealth;
        if (sourceOnBoard.card.health !== undefined) {
          sourceOnBoard.card.health += actualBuffHealth;
        }
        context.logGameEvent(`${sourceCard.name} gained +${actualBuffHealth} Health from damage dealt`);
      }
      
      if (actualBuffAttack > 0 || actualBuffHealth > 0) {
        context.logGameEvent(`${sourceCard.name} is now ${sourceOnBoard.currentAttack}/${sourceOnBoard.currentHealth}`);
      }
    }
    
    return { 
      success: true, 
      additionalData: { 
        damageValue,
        totalDamageDealt,
        isRandomSplit
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:random_damage_and_buff:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:random_damage_and_buff: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
