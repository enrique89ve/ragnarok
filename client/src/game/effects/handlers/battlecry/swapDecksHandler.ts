/**
 * SwapDecks Battlecry Handler
 * 
 * Implements the "swap_decks" battlecry effect.
 * Swaps your deck with your opponent's deck.
 * Example card: King Togwaggle (ID: 20603)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';

export default function executeSwapDecks(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:swap_decks for ${sourceCard.name}`);
    
    const playerDeckSize = context.currentPlayer.deck.length;
    const opponentDeckSize = context.opponentPlayer.deck.length;
    
    const playerDeck = [...context.currentPlayer.deck];
    const opponentDeck = [...context.opponentPlayer.deck];
    
    context.currentPlayer.deck = opponentDeck;
    context.opponentPlayer.deck = playerDeck;
    
    context.logGameEvent(`${sourceCard.name} swapped decks! You now have ${opponentDeckSize} cards, opponent has ${playerDeckSize} cards.`);
    
    if (effect.giveRansom) {
      const ransomCard: CardInstance = {
        instanceId: 'ransom-' + Date.now(),
        card: {
          id: effect.ransomCardId || 99998,
          name: effect.ransomCardName || "King's Ransom",
          description: "Swap decks with your opponent.",
          manaCost: effect.ransomCost || 5,
          type: 'spell',
          rarity: 'mythic',
          heroClass: 'neutral',
          spellEffect: {
            type: 'swap_decks'
          }
        },
        canAttack: false,
        isPlayed: false,
        isSummoningSick: false,
        attacksPerformed: 0
      };
      
      if (context.opponentPlayer.hand.length < MAX_HAND_SIZE) {
        context.opponentPlayer.hand.push(ransomCard);
        context.logGameEvent(`Opponent received ${ransomCard.card.name} to swap decks back`);
      } else {
        context.logGameEvent(`Opponent's hand is full, ${ransomCard.card.name} was burned`);
      }
    }
    
    return { 
      success: true, 
      additionalData: { 
        yourNewDeckSize: opponentDeckSize,
        opponentNewDeckSize: playerDeckSize,
        ransomGiven: effect.giveRansom || false
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:swap_decks:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:swap_decks: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
