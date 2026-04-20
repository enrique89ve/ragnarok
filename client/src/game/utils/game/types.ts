/**
 * Game Utils Module Types
 * 
 * Provides type adapters and interfaces for bridging the legacy type system
 * (types.ts with CardData.id: string | number) with the newer effect system
 * (types/CardTypes.ts with Card.id: number).
 */

import { GameState, CardInstance as LegacyCardInstance, CardData, Player as LegacyPlayer } from '../../types';
import { Card, CardInstance as EffectCardInstance, BattlecryEffect, DeathrattleEffect, SpellEffect } from '../../types/CardTypes';
import { GameContext, Player as ContextPlayer } from '../../GameContext';
import { debug } from '../../config/debugConfig';

/**
 * Type guard to check if a card ID is a number
 */
export function isNumericCardId(id: string | number): id is number {
  return typeof id === 'number';
}

/**
 * Convert a string/number card ID to a number
 * Returns 0 for invalid IDs (logs warning)
 */
export function toNumericCardId(id: string | number): number {
  if (typeof id === 'number') {
    return id;
  }
  const parsed = parseInt(id, 10);
  if (isNaN(parsed)) {
    debug.warn(`Invalid card ID: ${id}, defaulting to 0`);
    return 0;
  }
  return parsed;
}

/**
 * Adapt a legacy CardInstance to the effect system CardInstance format
 * This is used when calling EffectRegistry handlers
 */
export function adaptCardInstanceForEffects(card: LegacyCardInstance): EffectCardInstance {
  return {
    ...card,
    card: adaptCardDataToCard(card.card)
  } as EffectCardInstance;
}

/**
 * Adapt CardData to Card type (ensures id is number)
 */
export function adaptCardDataToCard(cardData: CardData): Card {
  return {
    ...cardData,
    id: toNumericCardId(cardData.id)
  } as Card;
}

/**
 * Adapt an effect system CardInstance back to legacy format
 */
export function adaptEffectCardInstanceToLegacy(card: EffectCardInstance): LegacyCardInstance {
  return card as unknown as LegacyCardInstance;
}

/**
 * Create a GameContext from legacy GameState
 * Adapts the legacy Player structure to the GameContext Player structure
 */
export function createGameContextFromState(state: GameState): GameContext {
  const currentPlayerId = state.currentTurn;
  const opponentId = currentPlayerId === 'player' ? 'opponent' : 'player';
  
  const currentLegacyPlayer = state.players[currentPlayerId];
  const opponentLegacyPlayer = state.players[opponentId];
  
  const currentPlayer = adaptLegacyPlayerToContextPlayer(currentLegacyPlayer, currentPlayerId);
  const opponentPlayer = adaptLegacyPlayerToContextPlayer(opponentLegacyPlayer, opponentId);
  
  return new GameContext(currentPlayer, opponentPlayer);
}

/**
 * Adapt a legacy Player to GameContext Player format
 *
 * Maps legacy Player fields (heroPower, hero, heroClass) into
 * synthetic CardInstance objects for the effect system.
 *
 * @param player - Legacy Player from GameState
 * @param playerId - The player ID ('player' or 'opponent')
 * @returns ContextPlayer for use with EffectRegistry
 */
export function adaptLegacyPlayerToContextPlayer(player: LegacyPlayer, playerId: string): ContextPlayer {
  const manaPool = player.mana;

  return {
    id: playerId,
    health: player.health,
    maxHealth: player.maxHealth ?? 100,
    armor: player.armor || player.heroArmor || 0,
    mana: {
      current: manaPool.current,
      max: manaPool.max,
      overloaded: manaPool.overloaded || 0,
      pendingOverload: manaPool.pendingOverload || 0
    },
    hand: player.hand.map(c => adaptCardInstanceForEffects(c)),
    deck: player.deck.map(c => createMockCardInstance(c)),
    board: player.battlefield.map(c => adaptCardInstanceForEffects(c)),
    graveyard: player.graveyard?.map(c => adaptCardInstanceForEffects(c)) || [],
    hero: createHeroCardInstance(player),
    heroPower: createHeroPowerCardInstance(player),
    cardsPlayedThisTurn: player.cardsPlayedThisTurn || 0,
    cardsDrawnThisTurn: 0,
    minionsPlayedThisTurn: 0,
    damageDealtThisTurn: 0,
    healingDoneThisTurn: 0
  };
}

/**
 * Create a synthetic hero CardInstance from legacy Player state
 */
function createHeroCardInstance(player: LegacyPlayer): EffectCardInstance {
  const heroId = player.heroId || player.hero?.id || `hero-${player.heroClass}`;
  return {
    instanceId: `hero-${heroId}`,
    card: {
      id: 0,
      name: heroId,
      manaCost: 0,
      type: 'hero' as const,
      class: player.heroClass,
      rarity: 'basic' as const,
      description: '',
      health: player.health,
      maxHealth: player.maxHealth ?? 100,
    }
  } as unknown as EffectCardInstance;
}

/**
 * Create a synthetic heroPower CardInstance from legacy Player state
 */
function createHeroPowerCardInstance(player: LegacyPlayer): EffectCardInstance {
  const hp = player.heroPower;
  return {
    instanceId: `heropower-${player.heroId || player.heroClass}`,
    card: {
      id: 0,
      name: hp?.name || 'Hero Power',
      manaCost: hp?.cost ?? 2,
      type: 'spell' as const,
      class: player.heroClass,
      rarity: 'basic' as const,
      description: hp?.description || '',
    }
  } as unknown as EffectCardInstance;
}

/**
 * Create a mock CardInstance from CardData (for deck cards which are just CardData)
 */
function createMockCardInstance(cardData: CardData): EffectCardInstance {
  return {
    instanceId: `deck-${cardData.id}-${Math.random().toString(36).substr(2, 9)}`,
    card: adaptCardDataToCard(cardData)
  } as EffectCardInstance;
}

/**
 * Player ID type for turn management
 */
export type PlayerId = 'player' | 'opponent';

/**
 * Type guard for PlayerId
 */
export function isPlayerId(value: string): value is PlayerId {
  return value === 'player' || value === 'opponent';
}

/**
 * Ensure a player ID string is a valid PlayerId
 */
export function toPlayerId(value: string): PlayerId {
  if (isPlayerId(value)) {
    return value;
  }
  debug.warn(`Invalid player ID: ${value}, defaulting to 'player'`);
  return 'player';
}

/**
 * Categories for gameUtils functions (for future modular extraction)
 */
export enum GameUtilsCategory {
  INITIALIZATION = 'initialization',
  CARD_PLAY = 'card_play',
  CARD_DRAW = 'card_draw',
  TURN_MANAGEMENT = 'turn_management',
  COMBAT = 'combat',
  AI_TARGETING = 'ai_targeting',
  DAMAGE = 'damage'
}

/**
 * Function metadata for migration tracking
 */
export interface FunctionMigrationInfo {
  name: string;
  category: GameUtilsCategory;
  lineCount: number;
  dependencies: string[];
  migrated: boolean;
}
