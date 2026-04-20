/**
 * ExtraTurns Battlecry Handler
 * 
 * Implements the "extra_turns" battlecry effect.
 * Grants extra turns after this one.
 * Example card: Temporus (ID: 20801)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeExtraTurns(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:extra_turns for ${sourceCard.name}`);
    
    const extraTurnsCount = effect.value || effect.turnsCount || 1;
    const targetPlayer = effect.targetOpponent ? 'opponent' : 'self';
    const giveOpponentFirst = effect.giveOpponentFirst || false;
    
    if (!context.activeEffects) {
      context.activeEffects = [];
    }
    
    if (giveOpponentFirst && effect.opponentTurns) {
      context.activeEffects.push({
        type: 'extra_turns',
        player: 'opponent',
        turnsRemaining: effect.opponentTurns,
        source: sourceCard.name,
        triggeredAt: context.turnCount
      });
      context.logGameEvent(`${sourceCard.name} grants opponent ${effect.opponentTurns} extra turn(s) first`);
    }
    
    context.activeEffects.push({
      type: 'extra_turns',
      player: targetPlayer,
      turnsRemaining: extraTurnsCount,
      source: sourceCard.name,
      triggeredAt: context.turnCount,
      activateAfterOpponent: giveOpponentFirst
    });
    
    if (targetPlayer === 'opponent') {
      context.logGameEvent(`${sourceCard.name} grants opponent ${extraTurnsCount} extra turn(s)`);
    } else {
      context.logGameEvent(`${sourceCard.name} grants you ${extraTurnsCount} extra turn(s)`);
    }
    
    return { 
      success: true, 
      additionalData: { 
        extraTurns: extraTurnsCount,
        targetPlayer,
        giveOpponentFirst,
        opponentTurns: effect.opponentTurns
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:extra_turns:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:extra_turns: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
