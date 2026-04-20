/**
 * King Ability Display Utilities
 * 
 * Pure functions for displaying king Divine Command ability information in UI.
 * Used by HeroDetailPopup and other components that need to show king ability info.
 * 
 * Architecture: Utils layer - no React dependencies, pure functions only.
 */

import { KING_ABILITY_CONFIGS, getKingAbilityConfig } from './kingAbilityUtils';
import { KingRarity, KingChessAbilityConfig } from '../../types/ChessTypes';
import { getHeroRarity, RARITY_COLORS, type HeroRarity } from '../heroRarity';

/**
 * Display-friendly info about a king's Divine Command ability
 */
export interface KingAbilityDisplayInfo {
  kingId: string;
  abilityName: string;
  description: string;
  rarity: KingRarity;
  rarityLabel: string;
  rarityColor: string;
  staPenalty: number;
  turnDuration: number;
  manaBoost: number;
  shapeName: string;
  isConfigured: boolean;
}

/**
 * Get rarity display color
 */
export function getRarityColor(rarity: KingRarity): string {
  switch (rarity) {
    case 'mythic':
      return '#f59e0b';
    case 'epic':
      return '#a855f7';
    case 'rare':
      return '#10b981';
    default:
      return '#3b82f6';
  }
}

/**
 * Get rarity display label
 */
export function getRarityLabel(rarity: KingRarity): string {
  switch (rarity) {
    case 'mythic':
      return 'Mythic';
    case 'epic':
      return 'Epic';
    case 'rare':
      return 'Rare';
    default:
      return 'Common';
  }
}

/**
 * Derive human-readable shape name from config
 * Uses tile count and shape properties to determine display name
 */
export function deriveShapeNameFromConfig(config: KingChessAbilityConfig): string {
  const { shape, abilityType } = config;
  const tileCount = shape.relativeTiles.length;
  
  if (shape.isRandom) {
    return 'Random Scatter';
  }
  
  if (shape.requiresDirection) {
    if (abilityType.includes('ancestral_path')) {
      return 'Full Rank/File';
    }
    if (tileCount === 4) {
      return '4-Tile Line';
    }
    if (tileCount === 5) {
      return 'Diagonal Sweep';
    }
    return `${tileCount}-Tile Line`;
  }
  
  if (tileCount === 1) {
    return 'Single Tile';
  }
  if (tileCount === 4) {
    return '2x2 Square';
  }
  if (tileCount === 5) {
    return 'Cross Shape';
  }
  if (tileCount === 8) {
    return 'Knight Squares';
  }
  if (tileCount === 9) {
    return '3x3 Area';
  }
  
  return `${tileCount}-Tile Pattern`;
}

/**
 * Format ability type into display name
 */
export function formatAbilityName(abilityType: string): string {
  return abilityType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get complete display info for a king's Divine Command ability
 */
export function getKingAbilityDisplayInfo(kingId: string): KingAbilityDisplayInfo | null {
  const config = getKingAbilityConfig(kingId);
  
  if (!config) {
    return null;
  }
  
  const pieceRarity = getHeroRarity(kingId);
  return {
    kingId,
    abilityName: formatAbilityName(config.abilityType),
    description: config.description,
    rarity: pieceRarity as KingRarity,
    rarityLabel: getRarityLabel(pieceRarity as KingRarity),
    rarityColor: getRarityColor(pieceRarity as KingRarity),
    staPenalty: config.staPenalty,
    turnDuration: config.turnDuration,
    manaBoost: config.manaBoost,
    shapeName: deriveShapeNameFromConfig(config),
    isConfigured: true
  };
}

/**
 * Check if a hero ID corresponds to a primordial king with Divine Command ability
 */
export function isKingWithDivineCommand(heroId: string): boolean {
  return heroId.startsWith('king-') && !!KING_ABILITY_CONFIGS[heroId];
}

/**
 * Get all configured king IDs
 */
export function getAllConfiguredKingIds(): string[] {
  return Object.keys(KING_ABILITY_CONFIGS);
}
