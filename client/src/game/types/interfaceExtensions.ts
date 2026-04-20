/**
 * interfaceExtensions.ts
 * 
 * This file contains interface extensions for the game's type system,
 * allowing us to add properties to existing interfaces without modifying
 * the original type definitions. This is especially useful for adding
 * properties that are only used in specific components or features.
 */

import { CardData, CardInstance } from '../types';

// Extend the CardInstance interface to include the card property
// This reflects the actual runtime structure where a CardInstance
// has a .card property containing the CardData
export interface CardInstanceWithCardData extends CardInstance {
  // Add legacy catch-all for any other properties
  [key: string]: any;
}

// Helper utility to check if an object is a CardInstanceWithCardData
export function isCardInstanceWithCardData(obj: any): obj is CardInstanceWithCardData {
  return obj && typeof obj === 'object' && 'instanceId' in obj && 'card' in obj;
}

// Helper utility to get the CardData from either a CardData or CardInstanceWithCardData
export function getCardData(card: CardData | CardInstanceWithCardData): CardData {
  if (isCardInstanceWithCardData(card)) {
    return card.card;
  }
  return card;
}
