/**
 * Gain Armor Conditional Draw Effect Handler
 * 
 * Implements the battlecry:gain_armor_conditional_draw effect.
 * Hero gains armor, then draws if a condition is met.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';

/**
 * Execute a Gain Armor Conditional Draw effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeGainArmorConditionalDraw(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:gain_armor_conditional_draw for ${sourceCard.name}`);
    
    const armorValue = effect.value || effect.armorValue || 0;
    const drawCount = effect.drawCount || 1;
    const condition = effect.condition || 'always';
    const armorThreshold = effect.armorThreshold || 0;
    
    const previousArmor = context.currentPlayer.armor;
    context.currentPlayer.armor += armorValue;
    
    context.logGameEvent(`${sourceCard.name} gained ${armorValue} armor. Total: ${context.currentPlayer.armor}`);
    
    let conditionMet = false;
    
    switch (condition) {
      case 'always':
        conditionMet = true;
        break;
      case 'has_armor':
        conditionMet = previousArmor > 0;
        break;
      case 'armor_threshold':
        conditionMet = context.currentPlayer.armor >= armorThreshold;
        break;
      case 'damaged_hero':
        conditionMet = context.currentPlayer.health < context.currentPlayer.maxHealth;
        break;
      case 'full_hand':
        conditionMet = context.currentPlayer.hand.length >= MAX_HAND_SIZE;
        break;
      case 'empty_board':
        conditionMet = context.currentPlayer.board.length === 0;
        break;
      case 'has_weapon':
        conditionMet = (context.currentPlayer.hero as any)?.weapon !== undefined;
        break;
      default:
        conditionMet = true;
    }
    
    let cardsDrawn = 0;
    
    if (conditionMet) {
      const drawnCards = context.drawCards(drawCount);
      cardsDrawn = drawnCards.length;
      context.logGameEvent(`Condition "${condition}" met. Drew ${cardsDrawn} card(s).`);
    } else {
      context.logGameEvent(`Condition "${condition}" not met. No cards drawn.`);
    }
    
    return { 
      success: true, 
      additionalData: { 
        armorGained: armorValue,
        previousArmor,
        newArmor: context.currentPlayer.armor,
        conditionMet,
        cardsDrawn
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:gain_armor_conditional_draw:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:gain_armor_conditional_draw: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
