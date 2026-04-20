/**
 * SummonRandom SpellEffect Handler
 * 
 * Implements the "summon_random" spellEffect effect.
 * Summons a random minion from a pool of options.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';

export default function executeSummonRandom(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:summon_random for ${sourceCard.name}`);
    
    const options = effect.options || [];
    const count = effect.value || 1;
    const summonForOpponent = effect.summonForOpponent === true;
    const costFilter = effect.costFilter;
    const raceFilter = effect.raceFilter;
    
    const targetPlayer = summonForOpponent ? context.opponentPlayer : context.currentPlayer;
    
    if (options.length === 0 && !costFilter && !raceFilter) {
      context.logGameEvent(`No summon options provided`);
      return { success: false, error: 'No summon options available' };
    }
    
    let summonedCount = 0;
    
    for (let i = 0; i < count; i++) {
      if (targetPlayer.board.length >= MAX_BATTLEFIELD_SIZE) {
        context.logGameEvent(`Board is full, cannot summon more minions`);
        break;
      }
      
      let summonCardId: string | number;
      
      if (options.length > 0) {
        const randomIndex = Math.floor(Math.random() * options.length);
        summonCardId = options[randomIndex];
      } else {
        summonCardId = `random_minion_${costFilter || 'any'}_${raceFilter || 'any'}`;
      }
      
      const contextAny = context as any;
      const summonedMinion = contextAny.summonMinion(summonCardId, targetPlayer);
      
      if (summonedMinion) {
        summonedCount++;
        context.logGameEvent(`Summoned random minion: ${summonedMinion.card?.name || summonCardId}`);
      }
    }
    
    return { 
      success: true,
      additionalData: { 
        summonedCount,
        summonedFor: summonForOpponent ? 'opponent' : 'player'
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:summon_random:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:summon_random: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
