/**
 * Resurrect Deathrattle Handler
 * 
 * Implements the "resurrect" deathrattle effect.
 * Resurrects dead minions from the graveyard when this minion dies.
 * Example: Hadronox (resummons Taunt minions that died this game)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { CardData, CardInstance, DeathrattleEffect } from '../../../types';
import { EffectResult } from '../../../types/EffectTypes';
import { getGraveyard, getGraveyardByRace } from '../../../data/cardManagement/graveyardTracker';
import { getCardById } from '../../../data/cardManagement/cardRegistry';
import { v4 as uuidv4 } from 'uuid';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';

/**
 * Execute a resurrect deathrattle effect
 */
export default function executeResurrectResurrect(
  context: GameContext,
  effect: DeathrattleEffect,
  sourceCard: CardData | CardInstance
): EffectResult {
  try {
    const cardName = 'card' in sourceCard ? sourceCard.card.name : sourceCard.name;
    context.logGameEvent(`Executing deathrattle:resurrect for ${cardName}`);
    
    const count = effect.value || effect.count || 1;
    const keyword = effect.keyword || effect.condition;
    const race = effect.specificRace;
    
    let graveyard = getGraveyard();
    
    if (race) {
      graveyard = getGraveyardByRace(race);
    }
    
    if (keyword) {
      graveyard = graveyard.filter(minion => 
        minion.keywords && minion.keywords.includes(keyword)
      );
    }
    
    if (graveyard.length === 0) {
      context.logGameEvent(`No valid minions in graveyard to resurrect`);
      return { success: true, additionalData: { resurrectedCount: 0 } };
    }
    
    const summonedMinions: CardInstance[] = [];
    const toResurrect = graveyard.slice(0, count);
    
    for (const graveyardMinion of toResurrect) {
      if (context.currentPlayer.board.length >= MAX_BATTLEFIELD_SIZE) {
        context.logGameEvent(`Board is full, cannot resurrect more minions`);
        break;
      }
      
      const cardData = getCardById(graveyardMinion.id);
      if (!cardData) {
        context.logGameEvent(`Could not find card data for ${graveyardMinion.name}`);
        continue;
      }
      
      const newMinion: CardInstance = {
        instanceId: uuidv4(),
        card: cardData,
        currentHealth: 'health' in cardData ? (cardData.health ?? 0) : 0,
        canAttack: false,
        isPlayed: true,
        isSummoningSick: true,
        attacksPerformed: 0
      };
      
      context.currentPlayer.board.push(newMinion as any);
      summonedMinions.push(newMinion);
      context.logGameEvent(`Resurrected ${graveyardMinion.name} from ${cardName}'s deathrattle`);
    }
    
    return {
      success: true,
      additionalData: { 
        resurrectedCount: summonedMinions.length,
        resurrectedMinions: summonedMinions
      }
    };
  } catch (error) {
    debug.error(`Error executing deathrattle:resurrect:`, error);
    return {
      success: false,
      error: `Error executing deathrattle:resurrect: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
