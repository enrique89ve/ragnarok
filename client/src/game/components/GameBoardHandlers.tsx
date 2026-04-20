/**
 * GameBoardHandlers.tsx
 * 
 * This file contains the handler functions for the GameBoard component
 * related to the attack system implementation.
 */
import { CardInstance } from '../types';
import { CardInstanceWithCardData } from '../types/interfaceExtensions';
import { canCardAttack } from '../combat/attackUtils';
import { debug } from '../config/debugConfig';

/**
 * Handle player card click for attack system
 */
export const createHandlePlayerCardClick = (
  isPlayerTurn: boolean,
  attackingCard: CardInstance | null,
  selectAttacker: (card: CardInstance | null) => void,
  handleCardSelect: (card: CardInstance | CardInstanceWithCardData) => void
) => {
  return (card: CardInstance) => {
    debug.log('[GameBoard] Player card clicked:', card);
    
    // If the player is allowed to select this card for attack
    if (isPlayerTurn && canCardAttack(card, isPlayerTurn)) {
      // Toggle attack mode for this card
      if (attackingCard && attackingCard.instanceId === card.instanceId) {
        // Cancel attack if clicking the same card
        debug.log('[GameBoard] Canceling attack with card:', card.card.name);
        selectAttacker(null);
      } else {
        // Start attack with this card
        debug.log('[GameBoard] Starting attack with card:', card.card.name);
        selectAttacker(card);
      }
    } else {
      // Otherwise handle normal card selection
      debug.log('[GameBoard] Card cannot attack, handling as normal selection');
      handleCardSelect(card);
    }
  };
};

/**
 * Handle opponent card click for attack system
 */
export const createHandleOpponentCardClick = (
  attackingCard: CardInstance | null,
  attackWithCard: (attackerId: string, defenderId?: string) => void
) => {
  return (card: CardInstance) => {
    debug.log('[GameBoard] Opponent card clicked:', card);
    
    if (attackingCard) {
      // Execute attack
      debug.log('[GameBoard] Attacking opponent card:', card.card.name);
      attackWithCard(attackingCard.instanceId, card.instanceId);
    }
  };
};

/**
 * Handle opponent hero click for attack system
 */
export const createHandleOpponentHeroClick = (
  attackingCard: CardInstance | null,
  attackWithCard: (attackerId: string, defenderId?: string) => void
) => {
  return () => {
    debug.log('[GameBoard] Opponent hero clicked');
    
    if (attackingCard) {
      // Execute attack on opponent's hero
      debug.log('[GameBoard] Attacking opponent hero');
      attackWithCard(attackingCard.instanceId, 'opponent-hero');
    }
  };
};