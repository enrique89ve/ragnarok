import { CardData, SecretTriggerType, ActiveSecret } from '../types';
import { isMinion, getAttack, getHealth } from './cards/typeGuards';
import { debug } from '../config/debugConfig';

/**
 * Helper functions for handling game secrets
 */

/**
 * Check if a secret has a specific trigger type
 */
export function hasSecretTrigger(secretCard: CardData, triggerType: SecretTriggerType): boolean {
  // Real implementation would check card's mechanics or metadata
  // This is a simplified implementation
  
  // Mage secrets
  if (secretCard.class === 'mage') {
    if (secretCard.name === 'Mirror Entity' && triggerType === 'on_minion_summon') return true;
    if (secretCard.name === 'Counterspell' && triggerType === 'on_spell_cast') return true;
    if (secretCard.name === 'Ice Barrier' && triggerType === 'on_hero_attack') return true;
  }
  
  // Hunter secrets
  if (secretCard.class === 'hunter') {
    if (secretCard.name === 'Explosive Trap' && triggerType === 'on_hero_attack') return true;
    if (secretCard.name === 'Snake Trap' && triggerType === 'on_minion_attack') return true;
    if (secretCard.name === 'Freezing Trap' && triggerType === 'on_minion_attack') return true;
  }
  
  // Paladin secrets
  if (secretCard.class === 'paladin') {
    if (secretCard.name === 'Noble Sacrifice' && triggerType === 'on_minion_attack') return true;
    if (secretCard.name === 'Redemption' && triggerType === 'on_minion_death') return true;
    if (secretCard.name === 'Repentance' && triggerType === 'on_minion_summon') return true;
  }
  
  // Rogue secrets
  if (secretCard.class === 'rogue') {
    if (secretCard.name === 'Ambush' && triggerType === 'on_spell_cast') return true;
    if (secretCard.name === 'Evasion' && triggerType === 'on_damage_taken') return true;
  }
  
  return false;
}

/**
 * Play secret reveal animation and sound
 * @param secret Active secret to reveal
 * @param position Position for animation
 */
export function revealSecret(secret: ActiveSecret, position: {x: number, y: number}) {
  // Mark the secret as revealed
  const revealedSecret = {
    ...secret,
    isRevealed: true
  };
  
  // Animation and sound effects would be triggered here
  // We avoid direct imports of animation/audio stores that require JSX config
  // These would be called from the game loop or event handlers instead
  
  return revealedSecret;
}

/**
 * Get description for secret trigger
 */
export function getSecretTriggerDescription(triggerType: SecretTriggerType): string {
  switch (triggerType) {
    case 'on_minion_attack':
      return 'When a minion attacks';
    case 'on_hero_attack':
      return 'When your hero is attacked';
    case 'on_minion_death':
      return 'When a minion dies';
    case 'on_spell_cast':
      return 'When a spell is cast';
    case 'on_minion_summon':
      return 'When a minion is summoned';
    case 'on_damage_taken':
      return 'When damage is taken';
    case 'on_turn_start':
      return 'At the start of your turn';
    case 'on_turn_end':
      return 'At the end of your turn';
    default:
      return 'Rune triggered';
  }
}

/**
 * Play a secret card from hand
 * @param gameState Current game state
 * @param cardInstanceId ID of the secret card to play
 * @returns Updated game state with secret played
 */
export function playSecret(gameState: any, cardInstanceId: string, isBloodPayment = false): any {
  // Deep clone the game state using JSON parser to avoid reference issues
  const newState = JSON.parse(JSON.stringify(gameState));
  
  // Find the current player
  const currentPlayer = newState.currentTurn;
  const player = newState.players[currentPlayer];
  
  
  // Find the card in player's hand
  const cardIndex = player.hand.findIndex((card: any) => 
    card.instanceId === cardInstanceId
  );
  
  if (cardIndex === -1) {
    debug.error(`[SECRET-ERROR] Card with ID ${cardInstanceId} not found in player's hand`);
    return gameState;
  }
  
  // Get the card data
  const secretCard = player.hand[cardIndex];
  
  
  // Remove the card from hand
  player.hand.splice(cardIndex, 1);
  
  // Add secret to player's secrets array
  const newSecret = {
    instanceId: secretCard.instanceId,
    card: secretCard.card,
    isRevealed: false
  };
  
  // Initialize secrets array if it doesn't exist
  if (!player.secrets) {
    player.secrets = [];
  }
  
  // Add the new secret to the player's secrets
  player.secrets.push(newSecret);
  
  // Reduce mana - properly handling mana structure (skip if blood price was paid)
  if (!isBloodPayment && player.mana && typeof player.mana === 'object' && 'current' in player.mana) {
    player.mana.current -= secretCard.card.manaCost || 0;
  }
  
  // Log event
  if (!newState.gameLog) {
    newState.gameLog = [];
  }
  
  newState.gameLog.push({
    id: `log-${Date.now()}`,
    type: 'secret_play',
    text: `${player.name || 'Player'} inscribed a Rune.`,
    timestamp: Date.now(),
    turn: newState.turnNumber,
    source: player.id,
    cardId: secretCard.card.id
  });
  
  
  return newState;
}

/**
 * Get minion stats safely using type guards
 * @param card Card to get stats from
 * @returns Object with attack and health values, or null if not a minion
 */
export function getMinionStats(card: CardData) {
  if (isMinion(card)) {
    return {
      attack: getAttack(card),
      health: getHealth(card)
    };
  }
  return null;
}

export default {
  hasSecretTrigger,
  revealSecret,
  getSecretTriggerDescription,
  playSecret,
  getMinionStats
};
