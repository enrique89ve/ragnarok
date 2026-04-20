/**
 * Card Type Definitions
 * 
 * This file contains type definitions for card-related entities in the game.
 */

export interface Card {
  // Unique identifier for the card
  id: string;
  // Card name
  name: string;
  // Card description/text
  text?: string;
  // Card attack value (for minions and weapons)
  attack?: number;
  // Card health/durability value (for minions and weapons)
  health?: number;
  // Card mana cost
  manaCost: number;
  // Card type (e.g., 'Minion', 'Spell', 'Weapon')
  type: 'Minion' | 'Spell' | 'Weapon' | 'Hero';
  // Card class (e.g., 'Warrior', 'Mage', 'Neutral')
  class: string;
  // Card rarity (e.g., 'Common', 'Rare', 'Epic', 'Legendary')
  rarity: 'Common' | 'Rare' | 'Epic' | 'Mythic';
  // Whether the card is collectible
  collectible?: boolean;
  // Card set
  set?: string;
  // Keywords the card has (e.g., 'Battlecry', 'Deathrattle')
  keywords?: string[];
  // Cards referenced by this card (for cards that generate other cards)
  referencedCards?: string[];
  // Effects this card has
  effects?: CardEffect[];
  // Mechanics this card uses
  mechanics?: string[];
}

export interface CardEffect {
  // Effect type
  type: string;
  // Effect description
  description: string;
  // Effect trigger (e.g., 'Battlecry', 'Deathrattle')
  trigger?: string;
  // Effect target (e.g., 'ALL_MINIONS', 'ENEMY_HERO')
  target?: string;
  // Effect values
  value?: number | string;
}

export interface CardCollection {
  [cardId: string]: Card;
}

export interface CardFilterOptions {
  class?: string;
  type?: string;
  rarity?: string;
  manaCost?: number;
  keywords?: string[];
  collectible?: boolean;
  searchText?: string;
}

export interface Deck {
  id: string;
  name: string;
  heroClass: string;
  cards: string[]; // Array of card IDs
  format?: string;
  created: number; // timestamp
  updated?: number; // timestamp
  description?: string;
  owner?: string;
}

export interface DeckCard extends Card {
  count: number; // Number of copies in the deck
}

export const CardRarities = ['Common', 'Rare', 'Epic', 'Mythic'] as const;
export const CardTypes = ['Minion', 'Spell', 'Weapon', 'Hero'] as const;
export const HeroClasses = [
  'Warrior',
  'Mage',
  'Hunter',
  'Druid',
  'Priest',
  'Paladin',
  'Rogue',
  'Shaman',
  'Warlock',
  'Berserker',
  'DeathKnight',
  'Necromancer',
  'Neutral'
] as const;

// Default card values
export const DEFAULT_CARD: Card = {
  id: '',
  name: 'New Card',
  text: '',
  manaCost: 0,
  type: 'Minion',
  class: 'Neutral',
  rarity: 'Common',
  collectible: true
};