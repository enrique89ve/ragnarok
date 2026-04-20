/**
 * ChangeHeroPower Battlecry Handler
 * 
 * Implements the "change_hero_power" battlecry effect.
 * Replaces the hero power with effect.newHeroPower.
 * Example card: Sulfuras (ID: 15002)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeChangeHeroPower(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:change_hero_power for ${sourceCard.name}`);
    
    if (!effect.newHeroPower) {
      context.logGameEvent(`ChangeHeroPower effect missing newHeroPower property`);
      return { success: false, error: 'No new hero power specified' };
    }
    
    const newHeroPower: CardInstance = {
      instanceId: 'hero-power-' + Date.now(),
      card: {
        id: effect.newHeroPower.id || 99999,
        name: effect.newHeroPower.name || effect.name || 'New Hero Power',
        description: effect.newHeroPower.description || effect.description || '',
        manaCost: effect.newHeroPower.cost !== undefined ? effect.newHeroPower.cost : (effect.cost !== undefined ? effect.cost : 2),
        type: 'hero_power',
        rarity: 'basic',
        heroClass: effect.newHeroPower.class || effect.class || 'neutral',
        spellEffect: effect.newHeroPower.effect || effect.newHeroPower
      },
      canAttack: false,
      isPlayed: false,
      isSummoningSick: false,
      attacksPerformed: 0
    };
    
    const oldHeroPower = context.currentPlayer.heroPower;
    const oldHeroPowerName = oldHeroPower?.card?.name || 'unknown';
    
    context.currentPlayer.heroPower = newHeroPower;
    
    context.logGameEvent(`${sourceCard.name} changed hero power from ${oldHeroPowerName} to ${newHeroPower.card.name}`);
    
    return { 
      success: true, 
      additionalData: { 
        oldHeroPower: oldHeroPowerName,
        newHeroPower: newHeroPower.card.name
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:change_hero_power:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:change_hero_power: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
