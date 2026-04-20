/**
 * DiscoverTriclass Battlecry Handler
 * 
 * Implements the "discover_triclass" battlecry effect.
 * Discovers from cards belonging to 3 different classes (like Kabal Courier).
 * Example card: Kabal Courier (ID: 32004)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import allCards from '../../../data/allCards';

/**
 * Execute a discover_triclass battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect to execute with effect.classes array defining the 3 classes
 * @param sourceCard - The card that triggered the effect
 * @returns EffectResult with discovery state
 */
export default function executeDiscoverTriclass(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:discover_triclass for ${sourceCard.name}`);
    
    const classes: string[] = effect.classes || [];
    const discoveryCount = effect.discoveryCount || effect.count || 3;
    
    if (classes.length === 0) {
      context.logGameEvent(`DiscoverTriclass effect missing classes property, using default Kabal classes`);
      classes.push('mage', 'priest', 'warlock');
    }
    
    context.logGameEvent(`Discovering from classes: ${classes.join(', ')}`);
    
    // Use allCards (1300+ cards) for full card pool access
    const eligibleCards = allCards.filter((card: any) => {
      const cardClass = (card.heroClass || card.class || 'neutral').toLowerCase();
      return classes.some(c => c.toLowerCase() === cardClass) || cardClass === 'neutral';
    });
    
    if (eligibleCards.length === 0) {
      context.logGameEvent(`No cards available for triclass discovery`);
      return { 
        success: false, 
        error: 'No cards available for triclass discovery' 
      };
    }
    
    const shuffled = [...eligibleCards].sort(() => Math.random() - 0.5);
    const discoveryOptions = shuffled.slice(0, discoveryCount);
    
    context.logGameEvent(`Presenting ${discoveryOptions.length} triclass discovery options to player`);
    
    return { 
      success: true,
      additionalData: {
        discoveryState: {
          active: true,
          options: discoveryOptions,
          sourceCardId: String(sourceCard.id),
          sourceCardName: sourceCard.name,
          discoverType: 'triclass',
          classes: classes,
          addToHand: effect.addToHand !== false
        }
      }
    };
  } catch (error) {
    debug.error(`Error executing battlecry:discover_triclass:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:discover_triclass: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
