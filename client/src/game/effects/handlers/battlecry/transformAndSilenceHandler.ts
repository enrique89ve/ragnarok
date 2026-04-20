/**
 * TransformAndSilence Battlecry Handler
 * 
 * Transforms a minion into a copy of another and silences it.
 * Example card: The Nameless One (ID: 20318)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeTransformAndSilence(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing transform_and_silence battlecry for ${sourceCard.name}`);
    
    const targetType = effect.targetType || 'any_minion';
    
    const sourceCardInstance: CardInstance = {
      instanceId: 'temp-' + Date.now(),
      card: sourceCard,
      canAttack: false,
      isPlayed: true,
      isSummoningSick: false,
      attacksPerformed: 0
    };
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    const validTargets = targets.filter(t => t.card.id !== sourceCard.id);
    
    if (validTargets.length === 0) {
      context.logGameEvent('No valid targets for transform_and_silence');
      return { success: false, error: 'No valid targets' };
    }
    
    const target = validTargets[0];
    
    const sourceOnBoard = context.currentPlayer.board.find(
      m => m.card.id === sourceCard.id
    );
    
    if (!sourceOnBoard) {
      return { success: false, error: 'Source minion not found on board' };
    }
    
    const boardIndex = context.currentPlayer.board.indexOf(sourceOnBoard);
    
    const silencedCopy: CardInstance = {
      instanceId: `silenced-copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      card: {
        ...target.card,
        battlecry: undefined,
        deathrattle: undefined,
        aura: undefined,
        keywords: []
      },
      currentHealth: target.card.health || 1,
      currentAttack: target.card.attack || 1,
      canAttack: false,
      isPlayed: true,
      isSummoningSick: true,
      attacksPerformed: 0,
      hasDivineShield: false,
      isPoisonous: false,
      hasLifesteal: false,
      isSilenced: true
    };
    
    context.currentPlayer.board[boardIndex] = silencedCopy;
    
    context.logGameEvent(`${sourceCard.name} transformed into a silenced copy of ${target.card.name}.`);
    
    return { 
      success: true, 
      additionalData: { 
        originalSource: sourceCard, 
        copiedFrom: target, 
        result: silencedCopy 
      }
    };
  } catch (error) {
    debug.error('Error executing transform_and_silence:', error);
    return { success: false, error: `Failed to execute transform_and_silence: ${error}` };
  }
}
