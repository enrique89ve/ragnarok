/**
 * Art Manager Types
 * Types for artwork metadata and management
 * NFT card art is rendered from /art/nfts/{id}.webp
 */

export interface ArtCardStats {
  health: number | null;
  stamina: number | null;
  attack: number | null;
  speed: number | null;
  mana: number | null;
  weight: number | null;
}

export interface ArtCard {
  readonly id: string;
  character: string;
  name: string;
  category: string | null;
  description: string | null;
  lore: string | null;
  element: string | null;
  piece: string | null;
  faction: string | null;
  rarity: string | null;
  collection?: string; // e.g. "Genesis Alpha", "Greek Expansion"
  mainArt: boolean;
  styleDNA?: {
    palette?: string[]; // primary hex colors
    composition?: 'hero' | 'creature' | 'artifact' | 'landscape';
    scale?: number; // default zoom/scale factor
  };
  stats: ArtCardStats;
  wiki: string | null;
  _localPath: string;
  _cdnUrl: string;
}

export interface ArtMetadata {
  version: string;
  source: string;
  totalCards: number;
  totalCharacters: number;
  cards: ArtCard[];
}

export interface CharacterGroup {
  character: string;
  cards: ArtCard[];
  mainArt: ArtCard | null;
  variants: ArtCard[];
}

export type ArtFaction = 'aesir' | 'vanir' | 'jotnar' | 'mystical beings' | 'pets';
export type ArtElement = 'fire' | 'water' | 'wind' | 'earth';
export type ArtPiece = 'king' | 'queen' | 'bishop' | 'knight' | 'rook' | 'pawn';

export interface ArtFilters {
  search: string;
  faction: ArtFaction | 'all';
  element: ArtElement | 'all';
  piece: ArtPiece | 'all';
  category: string | 'all';
}
