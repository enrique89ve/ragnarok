/**
 * Art Utilities
 * Pure functions for art management - no React dependencies
 */

import type { ArtCard, ArtMetadata, CharacterGroup, ArtFilters } from './types';

/**
 * Get the image URL for an art card
 * All art is bundled locally — no external CDN dependency
 */
export function getArtImageUrl(card: ArtCard): string {
  return card._localPath || card._cdnUrl;
}

/**
 * Group cards by character name
 */
export function groupByCharacter(cards: ArtCard[]): CharacterGroup[] {
  const groups = new Map<string, ArtCard[]>();
  
  for (const card of cards) {
    const existing = groups.get(card.character) || [];
    existing.push(card);
    groups.set(card.character, existing);
  }
  
  return Array.from(groups.entries()).map(([character, cards]) => {
    const mainArt = cards.find(c => c.mainArt) || null;
    const variants = cards.filter(c => !c.mainArt);
    
    return {
      character,
      cards,
      mainArt,
      variants,
    };
  }).sort((a, b) => a.character.localeCompare(b.character));
}

/**
 * Filter cards by search and filters
 */
export function filterArtCards(cards: ArtCard[], filters: ArtFilters): ArtCard[] {
  return cards.filter(card => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const matchesSearch = 
        card.name.toLowerCase().includes(search) ||
        card.character.toLowerCase().includes(search) ||
        (card.description?.toLowerCase().includes(search) ?? false) ||
        (card.lore?.toLowerCase().includes(search) ?? false);
      if (!matchesSearch) return false;
    }
    
    if (filters.faction !== 'all' && card.faction !== filters.faction) {
      return false;
    }
    
    if (filters.element !== 'all' && card.element !== filters.element) {
      return false;
    }
    
    if (filters.piece !== 'all' && card.piece !== filters.piece) {
      return false;
    }
    
    if (filters.category !== 'all' && card.category !== filters.category) {
      return false;
    }
    
    return true;
  });
}

/**
 * Get unique values for filter dropdowns
 */
export function getUniqueValues(cards: ArtCard[]): {
  factions: string[];
  elements: string[];
  pieces: string[];
  categories: string[];
} {
  const factions = new Set<string>();
  const elements = new Set<string>();
  const pieces = new Set<string>();
  const categories = new Set<string>();
  
  for (const card of cards) {
    if (card.faction) factions.add(card.faction);
    if (card.element) elements.add(card.element);
    if (card.piece) pieces.add(card.piece);
    if (card.category) categories.add(card.category);
  }
  
  return {
    factions: Array.from(factions).sort(),
    elements: Array.from(elements).sort(),
    pieces: Array.from(pieces).sort(),
    categories: Array.from(categories).sort(),
  };
}

/**
 * Find card by ID
 */
export function findCardById(cards: ArtCard[], id: string): ArtCard | undefined {
  return cards.find(card => card.id === id);
}

/**
 * Get all cards for a character
 */
export function getCharacterCards(cards: ArtCard[], character: string): ArtCard[] {
  return cards.filter(card => card.character === character);
}

/**
 * Parse metadata from JSON
 */
export function parseMetadata(json: unknown): ArtMetadata | null {
  if (!json || typeof json !== 'object') return null;
  
  const data = json as Record<string, unknown>;
  if (!Array.isArray(data.cards)) return null;
  
  return {
    version: String(data.version ?? '1.0.0'),
    source: String(data.source ?? 'unknown'),
    totalCards: Number(data.totalCards ?? data.cards.length),
    totalCharacters: Number(data.totalCharacters ?? 0),
    cards: data.cards as ArtCard[],
  };
}
