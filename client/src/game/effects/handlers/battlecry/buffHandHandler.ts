/**
 * BuffHand Battlecry Handler
 * 
 * Implements the "buff_hand" battlecry effect.
 * Buffs minions in the player's hand.
 * Example card: Don Han'Cho (ID: 20218)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a buff_hand battlecry effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeBuffHand(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:buff_hand for ${sourceCard.name}`);
    
    const buffAttack = effect.buffAttack || 0;
    const buffHealth = effect.buffHealth || 0;
    const isRandom = effect.isRandom === true;
    const cardType = effect.cardType || 'minion';
    const count = effect.count || (isRandom ? 1 : undefined);
    
    if (buffAttack === 0 && buffHealth === 0) {
      context.logGameEvent(`BuffHand effect has no buffs specified`);
      return { success: true };
    }
    
    const hand = context.currentPlayer.hand;
    
    let eligibleCards = hand.filter(cardInstance => {
      if (cardType === 'minion') {
        return cardInstance.card.type === 'minion';
      } else if (cardType === 'all') {
        return true;
      } else {
        return cardInstance.card.type === cardType;
      }
    });
    
    if (eligibleCards.length === 0) {
      context.logGameEvent(`No eligible cards in hand to buff`);
      return { success: true };
    }
    
    let targetCards = eligibleCards;
    
    if (isRandom && count) {
      targetCards = [];
      const shuffled = [...eligibleCards].sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(count, shuffled.length); i++) {
        targetCards.push(shuffled[i]);
      }
    }
    
    let buffedCount = 0;
    
    targetCards.forEach(cardInstance => {
      if (cardInstance.card.type === 'minion') {
        if (buffAttack !== 0) {
          cardInstance.card.attack = (cardInstance.card.attack || 0) + buffAttack;
        }
        
        if (buffHealth !== 0) {
          cardInstance.card.health = (cardInstance.card.health || 0) + buffHealth;
        }
        
        buffedCount++;
        context.logGameEvent(`${sourceCard.name} buffed ${cardInstance.card.name} in hand by +${buffAttack}/+${buffHealth}`);
      }
    });
    
    return { success: true, additionalData: { buffedCount } };
  } catch (error) {
    debug.error(`Error executing battlecry:buff_hand:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:buff_hand: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
