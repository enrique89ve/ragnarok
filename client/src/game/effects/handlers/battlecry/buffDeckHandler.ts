/**
 * BuffDeck Battlecry Handler
 * 
 * Implements the "buff_deck" battlecry effect.
 * Buffs all minions in the player's deck.
 * Example card: Prince Keleseth (ID: 20705)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a buff_deck battlecry effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeBuffDeck(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:buff_deck for ${sourceCard.name}`);
    
    const buffAttack = effect.buffAttack || 0;
    const buffHealth = effect.buffHealth || 0;
    const condition = effect.condition;
    
    if (buffAttack === 0 && buffHealth === 0) {
      context.logGameEvent(`BuffDeck effect has no buffs specified`);
      return { success: true };
    }
    
    if (condition) {
      const conditionMet = checkCondition(context, condition);
      if (!conditionMet) {
        context.logGameEvent(`Condition "${condition}" not met for buff_deck`);
        return { success: true };
      }
    }
    
    const deck = context.currentPlayer.deck;
    
    if (deck.length === 0) {
      context.logGameEvent(`Deck is empty, no minions to buff`);
      return { success: true };
    }
    
    let buffedCount = 0;
    
    deck.forEach(cardInstance => {
      if (cardInstance.card.type === 'minion') {
        if (buffAttack !== 0) {
          cardInstance.card.attack = (cardInstance.card.attack || 0) + buffAttack;
        }
        
        if (buffHealth !== 0) {
          cardInstance.card.health = (cardInstance.card.health || 0) + buffHealth;
        }
        
        buffedCount++;
      }
    });
    
    context.logGameEvent(`${sourceCard.name} buffed ${buffedCount} minions in deck by +${buffAttack}/+${buffHealth}`);
    
    return { success: true, additionalData: { buffedCount } };
  } catch (error) {
    debug.error(`Error executing battlecry:buff_deck:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:buff_deck: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

function checkCondition(context: GameContext, condition: string): boolean {
  switch (condition) {
    case 'no_2_cost_cards':
      return !context.currentPlayer.deck.some(c => c.card.manaCost === 2);
    case 'no_duplicates':
      const cardIds = context.currentPlayer.deck.map(c => c.card.id);
      return cardIds.length === new Set(cardIds).size;
    case 'hand_empty':
      return context.currentPlayer.hand.length === 0;
    case 'board_empty':
      return context.currentPlayer.board.length === 0;
    default:
      return true;
  }
}
