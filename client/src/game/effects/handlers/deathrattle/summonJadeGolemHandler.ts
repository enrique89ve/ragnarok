/**
 * Yggdrasil Golem Deathrattle Handler
 *
 * Implements the "summon_yggdrasil_golem" deathrattle effect.
 * Summons a Yggdrasil Golem with stats based on golem counter.
 * Example: Yggdrasil Swarmer (deathrattle: summon a Yggdrasil Golem)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, CardInstance } from '../../../types/CardTypes';
import { DeathrattleEffect } from '../../../types';
import { EffectResult } from '../../../types/EffectTypes';
import { v4 as uuidv4 } from 'uuid';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';

let yggdrasilGolemCounter = 1;

export function resetYggdrasilGolemCounter(): void {
  yggdrasilGolemCounter = 1;
}

export function getYggdrasilGolemCounter(): number {
  return yggdrasilGolemCounter;
}

/**
 * Execute a summon_yggdrasil_golem deathrattle effect
 */
export default function executeSummonYggdrasilGolem(
  context: GameContext,
  effect: DeathrattleEffect,
  sourceCard: Card | CardInstance
): EffectResult {
  try {
    const cardName = 'card' in sourceCard ? sourceCard.card.name : sourceCard.name;
    context.logGameEvent(`Executing deathrattle:summon_yggdrasil_golem for ${cardName}`);

    if (context.currentPlayer.board.length >= MAX_BATTLEFIELD_SIZE) {
      context.logGameEvent(`Board is full, cannot summon Yggdrasil Golem`);
      return { success: false, error: 'Board is full' };
    }

    const currentStats = Math.min(yggdrasilGolemCounter, 30);

    const golemCard: Card = {
      id: 85000 + yggdrasilGolemCounter,
      name: 'Yggdrasil Golem',
      type: 'minion',
      manaCost: currentStats,
      attack: currentStats,
      health: currentStats,
      rarity: 'common',
      heroClass: 'neutral',
      keywords: [],
      description: '',
      collectible: false,
      race: 'elemental'
    };

    const golemInstance: CardInstance = {
      instanceId: uuidv4(),
      card: golemCard,
      currentHealth: currentStats,
      canAttack: false,
      isPlayed: true,
      isSummoningSick: true,
      attacksPerformed: 0
    };

    context.currentPlayer.board.push(golemInstance);
    context.logGameEvent(`Summoned a ${currentStats}/${currentStats} Yggdrasil Golem from ${cardName}'s deathrattle`);

    yggdrasilGolemCounter++;

    return {
      success: true,
      additionalData: {
        golemStats: currentStats,
        nextGolemStats: Math.min(yggdrasilGolemCounter, 30),
        summonedMinion: golemInstance
      }
    };
  } catch (error) {
    debug.error(`Error executing deathrattle:summon_yggdrasil_golem:`, error);
    return {
      success: false,
      error: `Error executing deathrattle:summon_yggdrasil_golem: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
