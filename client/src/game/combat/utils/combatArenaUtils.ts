/**
 * Combat Arena Utility Functions
 * 
 * Pure utility functions for combat arena operations.
 * These functions have no React dependencies and can be used anywhere.
 */

import { PokerCard } from '../../types/PokerCombatTypes';

/**
 * Check if a poker card is part of a winning hand.
 * Used for visual highlighting during showdown celebrations.
 * 
 * @param card - The card to check
 * @param winningCards - Array of cards that form the winning hand
 * @returns true if the card is in the winning hand
 */
export const isCardInWinningHand = (card: PokerCard, winningCards: PokerCard[]): boolean => {
  return winningCards.some(wc => wc.suit === card.suit && wc.numericValue === card.numericValue);
};

/**
 * Constant placeholder card used for face-down community card slots
 * before they are revealed. The visible suit/value are never shown
 * (the slot renders as a card back), so any valid PokerCard works.
 */
export const FACEDOWN_PLACEHOLDER_CARD: PokerCard = { suit: 'spades', value: 'A', numericValue: 14 };

