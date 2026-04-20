/**
 * Yggdrasil Golem Battlecry Handler
 *
 * Implements the "summon_yggdrasil_golem" battlecry effect.
 * Summons a Yggdrasil Golem with incrementing stats (1/1, 2/2, 3/3, etc. up to 30/30).
 * Example card: Emerald Talons (ID: 85003)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext, Player } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';
import { v4 as uuidv4 } from 'uuid';

const MAX_YGGDRASIL_GOLEM_SIZE = 30;

/**
 * Execute a summon_yggdrasil_golem battlecry effect
 *
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeSummonJadeGolem(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing summon_yggdrasil_golem battlecry for ${sourceCard.name}`);

    const currentBoardSize = context.currentPlayer.board.length;
    const availableSlots = MAX_BATTLEFIELD_SIZE - currentBoardSize;

    if (availableSlots <= 0) {
      context.logGameEvent(`Board is full, cannot summon Yggdrasil Golem`);
      return { success: true, additionalData: { summonedCount: 0, boardFull: true } };
    }

    const player = context.currentPlayer as Player & { yggdrasilGolemCounter?: number };
    const currentCounter = player.yggdrasilGolemCounter || 0;

    player.yggdrasilGolemCounter = currentCounter + 1;

    const golemSize = Math.min(currentCounter + 1, MAX_YGGDRASIL_GOLEM_SIZE);

    const golemCard: Card = {
      id: 85100 + golemSize,
      name: 'Yggdrasil Golem',
      description: `A ${golemSize}/${golemSize} Yggdrasil Golem.`,
      manaCost: Math.min(golemSize, 10),
      type: 'minion',
      rarity: 'token',
      heroClass: 'neutral',
      attack: golemSize,
      health: golemSize,
      keywords: []
    };

    const golemInstance: CardInstance = {
      instanceId: uuidv4(),
      card: golemCard,
      currentHealth: golemSize,
      currentAttack: golemSize,
      canAttack: false,
      isPlayed: true,
      isSummoningSick: true,
      attacksPerformed: 0
    };

    context.currentPlayer.board.push(golemInstance);

    context.logGameEvent(`Summoned ${golemSize}/${golemSize} Yggdrasil Golem (Golem #${currentCounter + 1})`);

    return {
      success: true,
      additionalData: {
        summonedCount: 1,
        golemSize,
        golemNumber: currentCounter + 1,
        summonedMinion: golemInstance
      }
    };
  } catch (error) {
    debug.error(`Error executing summon_yggdrasil_golem:`, error);
    return {
      success: false,
      error: `Error executing summon_yggdrasil_golem: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
