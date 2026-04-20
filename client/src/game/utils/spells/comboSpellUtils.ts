/**
 * Utility functions for handling combo effects specific to spells
 */
import { GameState, CardInstance, CardData } from '../../types';
import { ComboEffect } from '../../types/CardTypes';
import { v4 as uuidv4 } from 'uuid';
import { createGameLogEvent } from '../gameLogUtils';
import { dealDamage, getValidTargets } from '../effects/damageUtils';
import { isMinion, getAttack, getHealth } from '../cards/typeGuards';
import { debug } from '../../config/debugConfig';

/**
 * Execute a combo effect for a spell card
 * @param state Current game state
 * @param cardInstanceId The ID of the card with the combo effect
 * @param targetId Optional target ID for the combo effect
 * @param targetType Optional target type (hero or minion)
 * @returns Updated game state after the combo effect
 */
export function executeComboSpellEffect(
  state: GameState,
  cardInstanceId: string,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  // Create a deep copy of the state to avoid mutation
  let newState = JSON.parse(JSON.stringify(state));
  
  // Get the current player
  const currentPlayer = newState.currentTurn;
  
  // Find the card in the player's hand
  const playerHand = newState.players[currentPlayer].hand;
  const cardIndex = playerHand.findIndex((card: CardInstance) => card.instanceId === cardInstanceId);
  
  if (cardIndex === -1) {
    debug.error(`Card ${cardInstanceId} not found in player's hand`);
    return newState;
  }
  
  const comboCard = playerHand[cardIndex];
  
  // Check if the card has a combo effect
  if (!(comboCard.card as any).comboEffect) {
    debug.error(`Card ${cardInstanceId} has no combo effect`);
    return newState;
  }

  const comboEffect = (comboCard.card as any).comboEffect;
  
  // Check if combo should be active (player played at least one other card this turn)
  const isComboActive = newState.players[currentPlayer].cardsPlayedThisTurn > 0;
  
  if (!isComboActive) {
    // Log the failed combo
    newState.gameLog.push(
      createGameLogEvent(
        newState,
        'combo_failed' as any,
        currentPlayer,
        `${comboCard.card.name}'s Combo does not activate (no other card played this turn).`,
        { cardId: comboCard.card.id.toString() }
      )
    );
    return newState;
  }
  
  // Log that the combo is active
  newState.gameLog.push(
    createGameLogEvent(
      newState,
      'combo_activated' as any,
      currentPlayer,
      `${comboCard.card.name}'s Combo activates!`,
      { cardId: comboCard.card.id.toString() }
    )
  );
  
  // Handle different combo effect types
  switch (comboEffect.type) {
    case 'damage':
      // If the combo effect requires a target but none was provided
      if (comboEffect.requiresTarget && !targetId) {
        return newState; // Return without applying the effect
      }
      
      // Apply damage combo effect
      if (targetId) {
        const targetPlayerType = targetType === 'hero' && targetId === 'hero' 
          ? currentPlayer 
          : (currentPlayer === 'player' ? 'opponent' : 'player');
        
        const damageAmount = comboEffect.value || 0;
        
        // Log the damage
        newState.gameLog.push(
          createGameLogEvent(
            newState,
            'combo_damage' as any,
            currentPlayer,
            `${comboCard.card.name}'s Combo deals ${damageAmount} damage.`,
            { 
              cardId: comboCard.card.id.toString(),
              targetId: targetId,
              value: damageAmount
            }
          )
        );
        
        // Apply the damage
        const finalTargetType = targetType || 'minion';
        newState = dealDamage(
          newState,
          targetPlayerType as 'player' | 'opponent',
          finalTargetType,
          damageAmount,
          finalTargetType === 'minion' ? targetId : undefined
        );
      }
      break;
      
    case 'heal':
      // Handle heal combo effect
      if (targetId) {
        const targetPlayerType = targetType === 'hero' && targetId === 'hero' 
          ? currentPlayer 
          : (currentPlayer === 'player' ? 'opponent' : 'player');
        
        const healAmount = comboEffect.value || 0;
        
        // Log the heal
        newState.gameLog.push(
          createGameLogEvent(
            newState,
            'combo_heal' as any,
            currentPlayer,
            `${comboCard.card.name}'s Combo heals for ${healAmount}.`,
            { 
              cardId: comboCard.card.id.toString(),
              targetId: targetId,
              value: healAmount
            }
          )
        );
        
        // Apply the heal (this would need a proper heal function)
        // newState = healTarget(newState, targetPlayerType, targetId, healAmount);
      }
      break;
      
    case 'draw':
      // Handle card draw combo effect
      const drawAmount = comboEffect.value || 1;
      
      // Log the draw
      newState.gameLog.push(
        createGameLogEvent(
          newState,
          'combo_draw' as any,
          currentPlayer,
          `${comboCard.card.name}'s Combo draws ${drawAmount} card${drawAmount > 1 ? 's' : ''}.`,
          { 
            cardId: comboCard.card.id.toString(),
            value: drawAmount
          }
        )
      );
      
      // Draw the cards (this would need a proper draw function)
      // for (let i = 0; i < drawAmount; i++) {
      //   newState = drawCard(newState, currentPlayer);
      // }
      break;
      
    default:
      // Unknown combo effect type
      debug.error(`Unknown combo effect type: ${comboEffect.type}`);
      break;
  }
  
  return newState;
}