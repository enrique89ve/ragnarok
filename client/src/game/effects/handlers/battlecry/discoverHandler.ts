/**
 * Discover Effect Handler
 * 
 * This handler implements the battlecry:discover effect.
 * Presents 3 random cards matching criteria for the player to pick and add to hand.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { getRandomCardsFromPool } from '../../../data/discoverPools';
import { getDiscoveryOptions, filterCards } from '../../../utils/discoveryUtils';
import allCards from '../../../data/allCards';

/**
 * Execute a Discover effect
 * @param context - The game context
 * @param effect - The effect data with discoverType, pool, discoveryCount, etc.
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success and containing the discovery state
 */
export default function executeDiscover(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:discover for ${sourceCard.name}`);
    
    const discoveryCount = effect.discoveryCount || effect.count || 3;
    const discoverType = effect.discoverType || effect.discoveryType || 'any';
    const pool = effect.pool || effect.discoverPool;
    const discoverClass = effect.discoveryClass || effect.class || sourceCard.heroClass || 'any';
    const discoverRarity = effect.discoveryRarity || 'any';
    const manaDiscount = effect.manaDiscount || effect.manaReduction || 0;
    
    let discoveryOptions: any[] = [];
    
    if (pool) {
      discoveryOptions = getRandomCardsFromPool(pool, discoveryCount);
      context.logGameEvent(`Discovering from pool: ${pool}`);
    } else if (discoverType && discoverType !== 'any') {
      discoveryOptions = getRandomCardsFromPool(discoverType, discoveryCount);
      context.logGameEvent(`Discovering ${discoverType} cards`);
    } else {
      discoveryOptions = getDiscoveryOptions(
        discoveryCount,
        discoverType as any,
        discoverClass as string,
        discoverRarity as any
      );
      context.logGameEvent(`Discovering from general pool`);
    }
    
    if (discoveryOptions.length === 0) {
      // Use allCards (1300+ cards) as fallback instead of smaller fullCardDatabase
      const filteredCards = filterCards(allCards as any[], {
        type: discoverType !== 'any' ? discoverType as any : undefined,
        heroClass: discoverClass !== 'any' ? discoverClass as any : undefined,
        rarity: discoverRarity !== 'any' ? discoverRarity as any : undefined
      });
      
      if (filteredCards.length > 0) {
        const shuffled = [...filteredCards].sort(() => Math.random() - 0.5);
        discoveryOptions = shuffled.slice(0, discoveryCount);
      }
    }
    
    if (discoveryOptions.length === 0) {
      context.logGameEvent(`No cards available for discovery`);
      return { 
        success: false, 
        error: 'No cards available for discovery' 
      };
    }
    
    if (manaDiscount > 0) {
      discoveryOptions = discoveryOptions.map(card => ({
        ...card,
        manaCost: Math.max(0, (card.manaCost || 0) - manaDiscount)
      }));
      context.logGameEvent(`Applied mana discount of ${manaDiscount} to discovered cards`);
    }
    
    context.logGameEvent(`Presenting ${discoveryOptions.length} discovery options to player`);
    
    return { 
      success: true,
      additionalData: {
        discoveryState: {
          active: true,
          options: discoveryOptions,
          sourceCardId: String(sourceCard.id),
          sourceCardName: sourceCard.name,
          discoverType: discoverType,
          pool: pool,
          manaDiscount: manaDiscount,
          addToHand: effect.addToHand !== false
        }
      }
    };
  } catch (error) {
    debug.error(`Error executing battlecry:discover:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:discover: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
