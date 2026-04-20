/**
 * Discover From Graveyard Battlecry Handler
 * 
 * This handler allows a player to discover a minion from the graveyard.
 * Used by Necromancer cards like Grave Robber.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { getGraveyard, GraveyardMinion } from '../../../data/cardManagement/graveyardTracker';

/**
 * Execute a battlecry that discovers a minion from the graveyard
 * 
 * @param context - The game context
 * @param effect - The effect to execute with optional condition and discoveryCount
 * @param sourceCard - The card that triggered the effect
 * @returns EffectResult with discovery state containing graveyard minions
 */
export default function executeDiscoverFromGraveyard(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:discover_from_graveyard for ${sourceCard.name}`);
    
    const graveyard = getGraveyard();
    
    if (graveyard.length === 0) {
      context.logGameEvent('Cannot discover from empty graveyard');
      return { 
        success: false,
        error: 'The graveyard is empty - no minions have died yet' 
      };
    }
    
    if (effect.condition && typeof effect.condition === 'object') {
      if (effect.condition.check === 'graveyard_size' && 
          effect.condition.minimum && 
          graveyard.length < effect.condition.minimum) {
        context.logGameEvent(`Not enough minions in graveyard (${graveyard.length} < ${effect.condition.minimum})`);
        return { 
          success: false,
          error: `Not enough minions have died yet (${graveyard.length}/${effect.condition.minimum})` 
        };
      }
    }
    
    const discoveryCards = graveyard.map((minion: GraveyardMinion) => ({
      id: minion.id,
      name: minion.name,
      manaCost: minion.manaCost,
      type: minion.type as 'minion',
      attack: minion.attack,
      health: minion.health,
      rarity: minion.rarity,
      heroClass: minion.class,
      race: minion.race,
      description: minion.description || '',
      keywords: minion.keywords || [],
      battlecry: minion.effects?.battlecry,
      deathrattle: minion.effects?.deathrattle
    }));
    
    const discoveryCount = effect.discoveryCount || effect.count || 3;
    
    let discoveryOptions = discoveryCards;
    if (discoveryCards.length > discoveryCount) {
      discoveryOptions = [...discoveryCards]
        .sort(() => Math.random() - 0.5)
        .slice(0, discoveryCount);
    }
    
    context.logGameEvent(`Presenting ${discoveryOptions.length} graveyard discovery options to player`);
    
    return { 
      success: true, 
      additionalData: {
        discoveryState: {
          active: true,
          options: discoveryOptions,
          sourceCardId: String(sourceCard.id),
          sourceCardName: sourceCard.name,
          discoverType: 'graveyard',
          graveyardSize: graveyard.length,
          addToHand: effect.addToHand !== false
        }
      }
    };
  } catch (error) {
    debug.error('Error in discover_from_graveyard effect:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
