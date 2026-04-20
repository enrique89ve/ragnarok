/**
 * DestroySpellsByCost Battlecry Handler
 * 
 * Implements the "destroy_spells_by_cost" battlecry effect.
 * Destroys all spells of a specific mana cost from both players' hands and decks.
 * Example card: Skulking Geist (ID: 30021) - destroys 1-cost spells
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a destroy_spells_by_cost battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data (effect.value is the mana cost to target)
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeDestroySpellsByCost(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:destroy_spells_by_cost for ${sourceCard.name}`);
    
    const targetCost = effect.value ?? 1;
    let totalDestroyed = 0;
    const destroyedCards: string[] = [];
    
    const destroySpellsFromLocation = (cards: any[], location: string, owner: string) => {
      const toRemove: number[] = [];
      
      cards.forEach((card, index) => {
        const cardData = card.card || card;
        if (cardData.type === 'spell' && cardData.manaCost === targetCost) {
          toRemove.push(index);
          destroyedCards.push(`${cardData.name} (${owner}'s ${location})`);
        }
      });
      
      for (let i = toRemove.length - 1; i >= 0; i--) {
        cards.splice(toRemove[i], 1);
        totalDestroyed++;
      }
    };
    
    destroySpellsFromLocation(context.currentPlayer.hand, 'hand', 'your');
    destroySpellsFromLocation(context.opponentPlayer.hand, 'hand', "opponent's");
    
    destroySpellsFromLocation(context.currentPlayer.deck, 'deck', 'your');
    destroySpellsFromLocation(context.opponentPlayer.deck, 'deck', "opponent's");
    
    if (totalDestroyed === 0) {
      context.logGameEvent(`No ${targetCost}-cost spells found to destroy`);
    } else {
      context.logGameEvent(`${sourceCard.name} destroyed ${totalDestroyed} ${targetCost}-cost spell(s)`);
      destroyedCards.forEach(cardInfo => {
        context.logGameEvent(`  Destroyed: ${cardInfo}`);
      });
    }
    
    return { 
      success: true, 
      additionalData: { 
        spellsDestroyed: totalDestroyed,
        targetCost,
        destroyedCards
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:destroy_spells_by_cost:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:destroy_spells_by_cost: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
