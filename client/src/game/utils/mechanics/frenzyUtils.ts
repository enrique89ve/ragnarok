import { GameState, CardInstance } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { findCardInstance, findCardById } from '../cards/cardUtils';
import { dealDamageToMinion } from '../effects/damageUtils';
import { isMinion, getAttack, getHealth } from '../cards/typeGuards';
import { debug } from '../../config/debugConfig';
import { MAX_HAND_SIZE } from '../../constants/gameConstants';

/**
 * Initializes a card's frenzy effect
 * Sets the initial state of the frenzy effect when a card is created
 */
export function initializeFrenzyEffect(card: CardInstance): CardInstance {
  const frenzyEffect = (card.card as any).frenzyEffect;
  const keywords = (card.card as any).keywords || [];
  
  if (frenzyEffect && keywords.includes('frenzy')) {
    return {
      ...card,
      ...(card as any),
      hasFrenzy: true,
      frenzyEffect: {
        ...frenzyEffect,
        triggered: false
      },
      frenzyTriggered: false
    };
  }
  return card;
}

/**
 * Checks if a card's frenzy effect should activate
 * Returns true if the card has an untriggered frenzy effect and has just survived damage
 */
export function shouldActivateFrenzy(card: CardInstance, wasJustDamaged: boolean): boolean {
  const cardAny = card as any;
  return (
    wasJustDamaged &&
    cardAny.hasFrenzy === true &&
    (cardAny.frenzyTriggered === false) &&
    cardAny.frenzyEffect?.triggered === false &&
    (card.currentHealth !== undefined && card.currentHealth > 0)
  );
}

/**
 * Execute the frenzy effect for a card
 * @param state The current game state
 * @param cardId The ID of the card with the frenzy effect
 * @param playerId The ID of the player who controls the card
 * @returns Updated game state after applying the frenzy effect
 */
export function executeFrenzyEffect(
  state: GameState,
  cardId: string,
  playerId: 'player' | 'opponent'
): GameState {
  // Find the card instance
  const cardInfo = findCardInstance(state.players[playerId].battlefield, cardId);
  if (!cardInfo) {
    debug.error('Frenzy card not found on battlefield');
    return state;
  }

  const cardInstance = cardInfo.card;
  const card = cardInstance.card;
  const index = cardInfo.index;
  
  // Ensure card has a frenzy effect to execute
  const cardAny = card as any;
  if (!cardAny.frenzyEffect) {
    debug.error('Card has no frenzy effect to execute');
    return state;
  }
  
  // Mark frenzy as triggered
  const updatedState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId]
      }
    }
  };
  
  const battlefieldCard = updatedState.players[playerId].battlefield[index] as any;
  battlefieldCard.frenzyTriggered = true;
  if (battlefieldCard.frenzyEffect) {
    battlefieldCard.frenzyEffect.triggered = true;
  }
  
  // Add to the game log
  updatedState.gameLog = [
    ...(updatedState.gameLog || []),
    {
      id: uuidv4(),
      type: 'effect' as const,
      cardId: cardId,
      player: playerId,
      turn: updatedState.turnNumber,
      timestamp: Date.now(),
      text: `${card.name}'s Frenzy effect activated!`
    }
  ];
  
  const effect = cardAny.frenzyEffect;
  const effectType = effect.type;
  
  // Execute effect based on its type
  switch (effectType) {
    case 'damage':
      // Deal damage to specified targets
      if (effect.targetType === 'all_enemy_minions') {
        const damageAmount = effect.useAttackValue ? getAttack(card) : (effect.value || 1);
        // Deal damage to all enemy minions
        const enemyPlayerId = playerId === 'player' ? 'opponent' : 'player';
        const enemyMinions = updatedState.players[enemyPlayerId].battlefield;
        
        // Apply damage to each enemy minion
        let newState = { ...updatedState };
        for (const minion of enemyMinions) {
          newState = dealDamageToMinion(newState, enemyPlayerId, minion.instanceId, damageAmount);
        }
        return newState;
      }
      return updatedState;
      
    case 'heal':
      // Heal the specified target
      if (effect.targetType === 'friendly_hero') {
        const healAmount = effect.value || 1;
        const maxHp = updatedState.players[playerId].maxHealth;
        updatedState.players[playerId].heroHealth = Math.min(
          maxHp,
          (updatedState.players[playerId].heroHealth ?? updatedState.players[playerId].health) + healAmount
        );
      }
      return updatedState;
      
    case 'buff':
      // Buff the minion's stats
      if (effect.buffAttack || effect.buffHealth) {
        const buffedCardInstance = updatedState.players[playerId].battlefield[index];
        // Apply attack buff
        if (effect.buffAttack && isMinion(buffedCardInstance.card)) {
          const currentAttack = getAttack(buffedCardInstance.card);
          (buffedCardInstance.card as any) = {
            ...buffedCardInstance.card,
            attack: currentAttack + effect.buffAttack
          };
        }
        // Apply health buff
        if (effect.buffHealth && buffedCardInstance.currentHealth !== undefined && isMinion(buffedCardInstance.card)) {
          buffedCardInstance.currentHealth += effect.buffHealth;
          const currentHealth = getHealth(buffedCardInstance.card);
          (buffedCardInstance.card as any) = {
            ...buffedCardInstance.card,
            health: currentHealth + effect.buffHealth
          };
        }
      }
      return updatedState;
      
    case 'draw':
      // Draw cards
      return updatedState;
      
    case 'transform':
      // Transform the minion into another minion
      if (effect.transformId) {
        const transformCard = findCardById(effect.transformId);
        if (!transformCard) {
          debug.error(`Transform target card (ID: ${effect.transformId}) not found`);
          return updatedState;
        }
        
        // Create a new instance of the transformed card
        const originalCard = updatedState.players[playerId].battlefield[index];
        const transformedCard: CardInstance = {
          instanceId: uuidv4(),
          card: transformCard,
          isPlayed: true,
          currentHealth: getHealth(transformCard),
          isSummoningSick: false, // Already on the battlefield, so not summoning sick
          canAttack: originalCard.canAttack, // Preserve attack status
          attacksPerformed: originalCard.attacksPerformed || 0
        };
        
        // Replace the original card with the transformed one
        updatedState.players[playerId].battlefield[index] = transformedCard;
      }
      return updatedState;
      
    case 'add_to_hand':
      // Add cards to hand
      if (effect.cardType === 'spell' && effect.isRandom && updatedState.players[playerId].hand.length < MAX_HAND_SIZE) {
        const spell = findCardById(1001);
        if (spell) {
          updatedState.players[playerId].hand.push({
            instanceId: uuidv4(),
            card: spell,
            isPlayed: false
          } as CardInstance);
        }
      }
      return updatedState;
      
    case 'attack_random':
      return updatedState;
      
    default:
      debug.error(`Unknown frenzy effect type: ${effectType}`);
      return updatedState;
  }
}

/**
 * Processes frenzy effects when a minion takes damage
 * This should be called whenever a minion takes damage and survives
 */
export function processFrenzyEffect(
  state: GameState,
  cardId: string,
  playerId: 'player' | 'opponent'
): GameState {
  // Find the card instance
  const cardInfo = findCardInstance(state.players[playerId].battlefield, cardId);
  if (!cardInfo) {
    return state; // Card not found
  }

  const card = cardInfo.card;
  
  // Check if the frenzy should activate
  if (shouldActivateFrenzy(card, true)) {
    return executeFrenzyEffect(state, cardId, playerId);
  }
  
  return state;
}

/**
 * Process frenzy effects for multiple minions
 * This is a convenience function to process frenzy effects for multiple damaged minions
 */
export function processFrenzyEffects(
  state: GameState,
  damagedMinionIds: { id: string; playerId: 'player' | 'opponent' }[]
): GameState {
  let updatedState = { ...state };
  
  // Process each damaged minion for frenzy effects
  for (const { id, playerId } of damagedMinionIds) {
    updatedState = processFrenzyEffect(updatedState, id, playerId);
  }
  
  return updatedState;
}
