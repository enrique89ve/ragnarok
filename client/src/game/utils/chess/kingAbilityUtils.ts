/**
 * kingAbilityUtils.ts
 * 
 * Pure utility functions for King Divine Command System.
 * Handles mine shape calculations, placement validation, and trigger detection.
 * 
 * Architecture: This is a pure utils layer - NO React, NO Zustand imports.
 * Imported by: stores/combat/kingAbilitySlice.ts, hooks/useKingChessAbility.ts
 */

import {
  ChessBoardPosition,
  KingChessAbilityType,
  KingChessAbilityConfig,
  MineShape,
  ActiveMine,
  KingRarity,
  BOARD_ROWS,
  BOARD_COLS
} from '../../types/ChessTypes';

/**
 * Direction for line-based mine shapes
 */
export type MineDirection = 'horizontal' | 'vertical' | 'diagonal_up' | 'diagonal_down';

/**
 * King ability configurations - defines behavior for each of the 9 primordial kings
 */
export const KING_ABILITY_CONFIGS: Record<string, KingChessAbilityConfig> = {
  'king-ymir': {
    kingId: 'king-ymir',
    abilityType: 'ymir_giant_reach',
    rarity: 'epic',
    maxUsesPerGame: 5,
    staPenalty: 2,
    turnDuration: 2,
    manaBoost: 1,
    shape: {
      type: 'ymir_giant_reach',
      relativeTiles: [{ row: 0, col: 0 }]
    },
    description: 'Giant Reach: Place a trap on any single tile. Lasts 2 turns. +1 mana next PvP.'
  },
  'king-buri': {
    kingId: 'king-buri',
    abilityType: 'buri_ice_emergence',
    rarity: 'rare',
    maxUsesPerGame: 5,
    staPenalty: 2,
    turnDuration: 1,
    manaBoost: 1,
    shape: {
      type: 'buri_ice_emergence',
      relativeTiles: [
        { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }
      ],
      requiresDirection: true
    },
    description: 'Ice Emergence: 4-tile line trap (choose direction). Lasts 1 turn. +1 mana next PvP.'
  },
  'king-surtr': {
    kingId: 'king-surtr',
    abilityType: 'surtr_flame_burst',
    rarity: 'epic',
    maxUsesPerGame: 5,
    staPenalty: 2,
    turnDuration: 2,
    manaBoost: 1,
    shape: {
      type: 'surtr_flame_burst',
      relativeTiles: [
        { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
        { row: 0, col: -1 },  { row: 0, col: 0 },  { row: 0, col: 1 },
        { row: 1, col: -1 },  { row: 1, col: 0 },  { row: 1, col: 1 }
      ]
    },
    description: 'Flame Burst: 3x3 area trap. -2 STA center, -1 edges. Lasts 2 turns. +1 mana next PvP.'
  },
  'king-borr': {
    kingId: 'king-borr',
    abilityType: 'borr_ancestral_path',
    rarity: 'rare',
    maxUsesPerGame: 5,
    staPenalty: 2,
    turnDuration: 1,
    manaBoost: 1,
    shape: {
      type: 'borr_ancestral_path',
      relativeTiles: [],
      requiresDirection: true
    },
    description: 'Ancestral Path: Full rank or file trap (7 tiles). Lasts 1 turn. +1 mana next PvP.'
  },
  'king-yggdrasil': {
    kingId: 'king-yggdrasil',
    abilityType: 'yggdrasil_root_spread',
    rarity: 'epic',
    maxUsesPerGame: 5,
    staPenalty: 2,
    turnDuration: 2,
    manaBoost: 1,
    shape: {
      type: 'yggdrasil_root_spread',
      relativeTiles: [
        { row: -1, col: 0 },
        { row: 0, col: -1 }, { row: 0, col: 0 }, { row: 0, col: 1 },
        { row: 1, col: 0 }
      ]
    },
    description: 'Root Spread: Cross-shaped trap (5 tiles). Lasts 2 turns. +1 mana next PvP.'
  },
  'king-audumbla': {
    kingId: 'king-audumbla',
    abilityType: 'audumbla_nourish_trap',
    rarity: 'rare',
    maxUsesPerGame: 5,
    staPenalty: 2,
    turnDuration: 1,
    manaBoost: 1,
    shape: {
      type: 'audumbla_nourish_trap',
      relativeTiles: [
        { row: 0, col: 0 }, { row: 0, col: 1 },
        { row: 1, col: 0 }, { row: 1, col: 1 }
      ]
    },
    description: 'Nourish Trap: 2x2 square trap. Lasts 1 turn. +1 mana next PvP.'
  },
  'king-gaia': {
    kingId: 'king-gaia',
    abilityType: 'gaia_earthen_snare',
    rarity: 'rare',
    maxUsesPerGame: 5,
    staPenalty: 2,
    turnDuration: 1,
    manaBoost: 1,
    shape: {
      type: 'gaia_earthen_snare',
      relativeTiles: [
        { row: -2, col: -1 }, { row: -2, col: 1 },
        { row: -1, col: -2 }, { row: -1, col: 2 },
        { row: 1, col: -2 },  { row: 1, col: 2 },
        { row: 2, col: -1 },  { row: 2, col: 1 }
      ]
    },
    description: 'Earthen Snare: Knight-square traps. Lasts 1 turn. +1 mana next PvP.'
  },
  'king-brimir': {
    kingId: 'king-brimir',
    abilityType: 'brimir_tidal_wave',
    rarity: 'mythic',
    maxUsesPerGame: 5,
    staPenalty: 3,
    turnDuration: 2,
    manaBoost: 2,
    shape: {
      type: 'brimir_tidal_wave',
      relativeTiles: [
        { row: -2, col: -2 }, { row: -1, col: -1 }, { row: 0, col: 0 },
        { row: 1, col: 1 }, { row: 2, col: 2 }
      ],
      requiresDirection: true
    },
    description: 'Tidal Wave: Diagonal 5-tile sweep. -3 STA. Lasts 2 turns. +2 mana next PvP.'
  },
  'king-ginnungagap': {
    kingId: 'king-ginnungagap',
    abilityType: 'ginnungagap_void_rift',
    rarity: 'mythic',
    maxUsesPerGame: 5,
    staPenalty: 3,
    turnDuration: 2,
    manaBoost: 2,
    shape: {
      type: 'ginnungagap_void_rift',
      relativeTiles: [],
      isRandom: true
    },
    description: 'Void Rift: 3 random tiles on enemy half. -3 STA each. Lasts 2 turns. +2 mana next PvP.'
  },
  'king-tartarus': {
    kingId: 'king-tartarus',
    abilityType: 'tartarus_abyss_rupture',
    rarity: 'epic',
    maxUsesPerGame: 5,
    staPenalty: 2,
    turnDuration: 2,
    manaBoost: 1,
    shape: {
      type: 'tartarus_abyss_rupture',
      relativeTiles: [
        { row: -1, col: -1 }, { row: -1, col: 1 },
        { row: 0, col: 0 },
        { row: 1, col: -1 },  { row: 1, col: 1 }
      ]
    },
    description: 'Abyss Rupture: X-shaped trap (5 tiles). Lasts 2 turns. +1 mana next PvP.'
  }
};

/**
 * Get king ability configuration by king ID
 */
export function getKingAbilityConfig(kingId: string): KingChessAbilityConfig | null {
  return KING_ABILITY_CONFIGS[kingId] || null;
}

/**
 * Check if a position is within board bounds
 */
export function isWithinBounds(pos: ChessBoardPosition): boolean {
  return pos.row >= 0 && pos.row < BOARD_ROWS && pos.col >= 0 && pos.col < BOARD_COLS;
}

/**
 * Calculate mine shape tiles based on king ability and center position
 * Returns actual board positions (not relative offsets)
 */
export function getMineShapeTiles(
  kingId: string,
  centerPosition: ChessBoardPosition,
  direction?: MineDirection,
  enemySide?: 'player' | 'opponent'
): ChessBoardPosition[] {
  const config = getKingAbilityConfig(kingId);
  if (!config) return [];

  const tiles: ChessBoardPosition[] = [];

  switch (config.abilityType) {
    case 'ymir_giant_reach':
      if (isWithinBounds(centerPosition)) {
        tiles.push(centerPosition);
      }
      break;

    case 'buri_ice_emergence':
      if (direction === 'horizontal') {
        for (let i = 0; i < 4; i++) {
          const pos = { row: centerPosition.row, col: centerPosition.col + i };
          if (isWithinBounds(pos)) tiles.push(pos);
        }
      } else {
        for (let i = 0; i < 4; i++) {
          const pos = { row: centerPosition.row + i, col: centerPosition.col };
          if (isWithinBounds(pos)) tiles.push(pos);
        }
      }
      break;

    case 'surtr_flame_burst':
      for (const offset of config.shape.relativeTiles) {
        const pos = {
          row: centerPosition.row + offset.row,
          col: centerPosition.col + offset.col
        };
        if (isWithinBounds(pos)) tiles.push(pos);
      }
      break;

    case 'borr_ancestral_path':
      if (direction === 'horizontal') {
        for (let col = 0; col < BOARD_COLS; col++) {
          tiles.push({ row: centerPosition.row, col });
        }
      } else {
        for (let row = 0; row < BOARD_ROWS; row++) {
          tiles.push({ row, col: centerPosition.col });
        }
      }
      break;

    case 'yggdrasil_root_spread':
    case 'audumbla_nourish_trap':
    case 'gaia_earthen_snare':
      for (const offset of config.shape.relativeTiles) {
        const pos = {
          row: centerPosition.row + offset.row,
          col: centerPosition.col + offset.col
        };
        if (isWithinBounds(pos)) tiles.push(pos);
      }
      break;

    case 'brimir_tidal_wave':
      const diagonalOffsets = direction === 'diagonal_up'
        ? [{ row: -2, col: 2 }, { row: -1, col: 1 }, { row: 0, col: 0 }, { row: 1, col: -1 }, { row: 2, col: -2 }]
        : [{ row: -2, col: -2 }, { row: -1, col: -1 }, { row: 0, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 2 }];
      
      for (const offset of diagonalOffsets) {
        const pos = {
          row: centerPosition.row + offset.row,
          col: centerPosition.col + offset.col
        };
        if (isWithinBounds(pos)) tiles.push(pos);
      }
      break;

    case 'ginnungagap_void_rift':
      const enemyHalfStart = enemySide === 'player' ? 0 : 4;
      const enemyHalfEnd = enemySide === 'player' ? 3 : 7;
      const availableTiles: ChessBoardPosition[] = [];
      
      for (let row = enemyHalfStart; row < enemyHalfEnd; row++) {
        for (let col = 0; col < BOARD_COLS; col++) {
          availableTiles.push({ row, col });
        }
      }
      
      const shuffled = [...availableTiles].sort(() => Math.random() - 0.5);
      tiles.push(...shuffled.slice(0, 3));
      break;
  }

  return tiles;
}

/**
 * Check if mine placement is valid
 * - Must be on board
 * - Cannot overlap with existing mines from same owner
 * - Cannot place on own pieces
 */
export function isValidMinePlacement(
  position: ChessBoardPosition,
  kingId: string,
  existingMines: ActiveMine[],
  ownPiecePositions: ChessBoardPosition[],
  direction?: MineDirection
): { valid: boolean; reason?: string } {
  if (!isWithinBounds(position)) {
    return { valid: false, reason: 'Position is outside the board' };
  }

  const config = getKingAbilityConfig(kingId);
  if (!config) {
    return { valid: false, reason: 'Invalid king configuration' };
  }

  const tiles = getMineShapeTiles(kingId, position, direction);
  
  if (tiles.length === 0) {
    return { valid: false, reason: 'No valid tiles in shape' };
  }

  const ownMines = existingMines.filter(m => m.owner === 'player' && !m.triggered);
  for (const tile of tiles) {
    for (const mine of ownMines) {
      if (mine.affectedTiles.some(t => t.row === tile.row && t.col === tile.col)) {
        return { valid: false, reason: 'Overlaps with existing mine' };
      }
    }
    
    if (ownPiecePositions.some(p => p.row === tile.row && p.col === tile.col)) {
      return { valid: false, reason: 'Cannot place on own pieces' };
    }
  }

  return { valid: true };
}

/**
 * Hero piece types that can trigger mines.
 * Pawns and Kings are excluded - they resolve via instant-kill mechanics
 * and don't participate in poker combat where STA/mana are relevant.
 */
const HERO_PIECE_TYPES = ['queen', 'rook', 'bishop', 'knight'] as const;
type HeroPieceType = typeof HERO_PIECE_TYPES[number];

/**
 * Check if a piece type is a hero piece (can trigger mines).
 * Hero pieces are major pieces that enter poker combat: Queen, Rook, Bishop, Knight.
 * Non-hero pieces (Pawns, Kings) use instant-kill resolution and bypass mines.
 */
export function isHeroPiece(pieceType: string): pieceType is HeroPieceType {
  return HERO_PIECE_TYPES.includes(pieceType as HeroPieceType);
}

/**
 * Check if a piece landing on a position triggers a mine.
 * Returns the triggered mine or null if no trigger occurred.
 * 
 * IMPORTANT: Mines only trigger on hero pieces (Queen, Rook, Bishop, Knight).
 * Pawns and Kings pass through mines unaffected because:
 * - They resolve via instant-kill, not poker combat
 * - They don't have STA or mana mechanics
 */
export function checkMineTrigger(
  landingPosition: ChessBoardPosition,
  mines: ActiveMine[],
  movingPieceOwner: 'player' | 'opponent',
  movingPieceType: string
): ActiveMine | null {
  // Mines only affect hero pieces (pieces that enter poker combat)
  // Pawns and Kings are instant-kill and bypass the mine system
  if (!isHeroPiece(movingPieceType)) {
    return null;
  }
  
  for (const mine of mines) {
    if (mine.triggered) continue;
    if (mine.owner === movingPieceOwner) continue;
    
    const isOnMine = mine.affectedTiles.some(
      tile => tile.row === landingPosition.row && tile.col === landingPosition.col
    );
    
    if (isOnMine) {
      return mine;
    }
  }
  
  return null;
}

/**
 * Calculate STA penalty for landing on a mine
 * Surtr's center tile deals more damage
 */
export function calculateMinePenalty(
  mine: ActiveMine,
  landingPosition: ChessBoardPosition
): number {
  const config = getKingAbilityConfig(mine.kingId);
  if (!config) return mine.staPenalty;

  if (config.abilityType === 'surtr_flame_burst') {
    const isCenter = 
      landingPosition.row === mine.centerPosition.row &&
      landingPosition.col === mine.centerPosition.col;
    return isCenter ? mine.staPenalty : 1;
  }

  return mine.staPenalty;
}

/**
 * Get mines that should expire on a given turn
 */
export function getExpiredMines(mines: ActiveMine[], currentTurn: number): ActiveMine[] {
  return mines.filter(mine => mine.expiresOnTurn <= currentTurn && !mine.triggered);
}

/**
 * Filter out expired and triggered mines
 */
export function getActiveMines(mines: ActiveMine[], currentTurn: number): ActiveMine[] {
  return mines.filter(mine => !mine.triggered && mine.expiresOnTurn > currentTurn);
}

/**
 * Generate unique mine ID
 */
export function generateMineId(): string {
  return `mine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new active mine
 */
export function createMine(
  kingId: string,
  owner: 'player' | 'opponent',
  centerPosition: ChessBoardPosition,
  currentTurn: number,
  direction?: MineDirection,
  enemySide?: 'player' | 'opponent'
): ActiveMine | null {
  const config = getKingAbilityConfig(kingId);
  if (!config) return null;

  const affectedTiles = getMineShapeTiles(kingId, centerPosition, direction, enemySide);
  if (affectedTiles.length === 0) return null;

  return {
    id: generateMineId(),
    owner,
    kingId,
    centerPosition,
    affectedTiles,
    staPenalty: config.staPenalty,
    manaBoost: config.manaBoost,
    placedOnTurn: currentTurn,
    expiresOnTurn: currentTurn + config.turnDuration,
    triggered: false
  };
}

/**
 * Get ability description for UI display
 */
export function getAbilityDescription(kingId: string): string {
  const config = getKingAbilityConfig(kingId);
  return config?.description || 'Unknown ability';
}

/**
 * Check if a king requires direction selection for mine placement
 */
export function requiresDirectionSelection(kingId: string): boolean {
  const config = getKingAbilityConfig(kingId);
  return config?.shape.requiresDirection || false;
}

/**
 * Get available directions for a directional ability
 */
export function getAvailableDirections(kingId: string): MineDirection[] {
  const config = getKingAbilityConfig(kingId);
  if (!config?.shape.requiresDirection) return [];

  switch (config.abilityType) {
    case 'buri_ice_emergence':
    case 'borr_ancestral_path':
      return ['horizontal', 'vertical'];
    case 'brimir_tidal_wave':
      return ['diagonal_up', 'diagonal_down'];
    default:
      return [];
  }
}
