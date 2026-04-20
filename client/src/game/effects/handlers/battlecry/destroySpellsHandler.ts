/**
 * DestroySpells Battlecry Handler
 * 
 * Implements the "destroy_spells" battlecry effect.
 * Destroys all spells in the opponent's hand.
 * Example card: Skulking Geist (ID: 31008)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a destroy_spells battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeDestroySpells(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:destroy_spells for ${sourceCard.name}`);
    
    const opponentHand = context.opponentPlayer.hand;
    const destroyedSpells: any[] = [];
    
    const spellsInHand = opponentHand.filter(card => card.card.type === 'spell');
    
    if (spellsInHand.length === 0) {
      context.logGameEvent(`No spells in opponent's hand to destroy`);
      return { success: true, additionalData: { spellsDestroyed: 0 } };
    }
    
    spellsInHand.forEach(spell => {
      const index = context.opponentPlayer.hand.indexOf(spell);
      if (index !== -1) {
        context.opponentPlayer.hand.splice(index, 1);
        destroyedSpells.push(spell);
        context.logGameEvent(`${sourceCard.name} destroyed ${spell.card.name} from opponent's hand`);
      }
    });
    
    context.logGameEvent(`Destroyed ${destroyedSpells.length} spell(s) from opponent's hand`);
    
    return { 
      success: true, 
      additionalData: { 
        spellsDestroyed: destroyedSpells.length,
        destroyedSpellNames: destroyedSpells.map(s => s.card.name)
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:destroy_spells:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:destroy_spells: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
