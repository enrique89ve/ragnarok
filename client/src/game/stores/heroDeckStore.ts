/**
 * HeroDeckStore.ts
 * 
 * Manages user-built hero decks for the 4 major chess pieces (queen, rook, bishop, knight).
 * Each deck contains exactly 30 cards with validation for class restrictions and copy limits.
 * Persists to localStorage.
 */

import { create } from 'zustand';
import type { CardData } from '../types';
import { cardRegistry } from '../data/cardRegistry';
import { debug } from '../config/debugConfig';
import { createRuntimeStorageKey } from '../config/networkConfig';
import { getNFTBridge } from '../nft';
import { triggerAutoSave } from './saveStateManager';
import {
  HERO_DECK_PIECE_TYPES,
  HERO_DECK_SIZE,
  isCardMythic as isHeroCardMythic,
  getMaxCopies,
  isCardValidForHeroClass,
  countCardIds,
  validateHeroDeck as validateHeroDeckRules,
  type DeckValidationResult,
  type HeroDeck,
  type PieceType,
} from '../deck/heroDeckRules';

export type { DeckValidationResult, HeroDeck, PieceType };

type HeroDeckState = {
  readonly decks: Record<PieceType, HeroDeck | null>;
};

type LegacyValidationResult = { readonly valid: boolean; readonly errors: string[] };

type HeroDeckActions = {
  readonly setDeck: (pieceType: PieceType, deck: HeroDeck) => void;
  readonly addCard: (pieceType: PieceType, cardId: number) => boolean;
  readonly removeCard: (pieceType: PieceType, cardId: number) => void;
  readonly getDeck: (pieceType: PieceType) => HeroDeck | null;
  readonly validateDeck: (pieceType: PieceType) => LegacyValidationResult;
  readonly validateDeckDetailed: (pieceType: PieceType) => DeckValidationResult;
  readonly isArmyComplete: () => boolean;
  readonly clearDeck: (pieceType: PieceType) => void;
  readonly clearAll: () => void;
  readonly loadFromStorage: () => void;
  readonly saveToStorage: () => void;
};

const STORAGE_KEY = createRuntimeStorageKey('ragnarok-hero-decks');

const createInitialState = (): HeroDeckState => ({
  decks: {
    queen: null,
    rook: null,
    bishop: null,
    knight: null,
  },
});

function getCardById(cardId: number): CardData | undefined {
  return cardRegistry.find(card => Number(card.id) === cardId);
}

function isCardValidForClass(cardId: number, heroClass: string): boolean {
  const card = getCardById(cardId);
  if (!card) return false;
  return isCardValidForHeroClass(card, heroClass);
}

function countCardCopies(cardIds: readonly number[], cardId: number): number {
  return countCardIds(cardIds)[cardId] ?? 0;
}

function getOwnedCopies(cardId: number): number {
  return getNFTBridge().getOwnedCopies(cardId);
}

function isCardMythic(cardId: number): boolean {
  const card = getCardById(cardId);
  if (!card) return false;
  return isHeroCardMythic(card);
}

function getMaxCopiesForCard(cardId: number): number {
  const card = getCardById(cardId);
  return card ? getMaxCopies(card) : 0;
}

export function validateHeroDeck(deck: HeroDeck | null, pieceType: PieceType): LegacyValidationResult {
  const result = validateHeroDeckDetailed(deck, pieceType);
  return {
    valid: result.valid,
    errors: [...result.errors],
  };
}

export function validateHeroDeckDetailed(deck: HeroDeck | null, pieceType: PieceType): DeckValidationResult {
  return validateHeroDeckRules(deck, {
    pieceType,
    heroId: deck?.heroId,
    heroClass: deck?.heroClass,
    getCardById,
    getOwnedCopies,
    enforceOwnership: getNFTBridge().isHiveMode(),
  });
}

export const useHeroDeckStore = create<HeroDeckState & HeroDeckActions>((set, get) => ({
  ...createInitialState(),

  setDeck: (pieceType: PieceType, deck: HeroDeck) => {
    const validation = validateHeroDeckDetailed(deck, pieceType);
    if (!validation.valid) {
      debug.warn(`[HeroDeck] Refused invalid deck for ${pieceType}: ${validation.errors.join('; ')}`);
      return;
    }

    set(state => ({
      decks: {
        ...state.decks,
        [pieceType]: deck,
      },
    }));
    
    get().saveToStorage();
    triggerAutoSave();
    debug.log(`[HeroDeck] Set deck for ${pieceType}: ${deck.heroId} with ${deck.cardIds.length} cards`);
  },

  addCard: (pieceType: PieceType, cardId: number): boolean => {
    const state = get();
    const deck = state.decks[pieceType];

    if (!deck) {
      debug.warn(`[HeroDeck] No deck exists for ${pieceType}. Create deck first.`);
      return false;
    }
    
    if (deck.cardIds.length >= HERO_DECK_SIZE) {
      debug.warn(`[HeroDeck] Deck is full (${HERO_DECK_SIZE} cards)`);
      return false;
    }
    
    const currentCopies = countCardCopies(deck.cardIds, cardId);
    const maxAllowed = getMaxCopiesForCard(cardId);
    if (currentCopies >= maxAllowed) {
      const card = getCardById(cardId);
      const rarityNote = isCardMythic(cardId) ? ' (Mythic)' : '';
      debug.warn(`[HeroDeck] Max copies (${maxAllowed}) of card ${card?.name || cardId}${rarityNote} already in deck`);
      return false;
    }
    
    if (!isCardValidForClass(cardId, deck.heroClass)) {
      const card = getCardById(cardId);
      debug.warn(`[HeroDeck] Card ${card?.name || cardId} is not valid for class ${deck.heroClass}`);
      return false;
    }

    const ownedCopies = getOwnedCopies(cardId);
    if (currentCopies >= ownedCopies) {
      const card = getCardById(cardId);
      debug.warn(`[HeroDeck] You only own ${ownedCopies} copy(ies) of ${card?.name || cardId}`);
      return false;
    }
    
    const updatedDeck: HeroDeck = {
      ...deck,
      cardIds: [...deck.cardIds, cardId],
    };
    
    set(state => ({
      decks: {
        ...state.decks,
        [pieceType]: updatedDeck,
      },
    }));
    
    get().saveToStorage();
    debug.log(`[HeroDeck] Added card ${cardId} to ${pieceType}. Deck size: ${updatedDeck.cardIds.length}`);
    return true;
  },

  removeCard: (pieceType: PieceType, cardId: number) => {
    const state = get();
    const deck = state.decks[pieceType];
    
    if (!deck) {
      debug.warn(`[HeroDeck] No deck exists for ${pieceType}`);
      return;
    }
    
    const cardIndex = deck.cardIds.indexOf(cardId);
    if (cardIndex === -1) {
      debug.warn(`[HeroDeck] Card ${cardId} not found in deck`);
      return;
    }
    
    const updatedCardIds = [...deck.cardIds];
    updatedCardIds.splice(cardIndex, 1);
    
    const updatedDeck: HeroDeck = {
      ...deck,
      cardIds: updatedCardIds,
    };
    
    set(state => ({
      decks: {
        ...state.decks,
        [pieceType]: updatedDeck,
      },
    }));
    
    get().saveToStorage();
    debug.log(`[HeroDeck] Removed card ${cardId} from ${pieceType}. Deck size: ${updatedCardIds.length}`);
  },

  getDeck: (pieceType: PieceType): HeroDeck | null => {
    return get().decks[pieceType];
  },

  validateDeck: (pieceType: PieceType): LegacyValidationResult => {
    return validateHeroDeck(get().decks[pieceType], pieceType);
  },

  validateDeckDetailed: (pieceType: PieceType): DeckValidationResult => {
    return validateHeroDeckDetailed(get().decks[pieceType], pieceType);
  },

  isArmyComplete: (): boolean => {
    const state = get();

    for (const pieceType of HERO_DECK_PIECE_TYPES) {
      const validation = state.validateDeck(pieceType);
      if (!validation.valid) {
        return false;
      }
    }
    
    return true;
  },

  clearDeck: (pieceType: PieceType) => {
    set(state => ({
      decks: {
        ...state.decks,
        [pieceType]: null,
      },
    }));
    
    get().saveToStorage();
    debug.log(`[HeroDeck] Cleared deck for ${pieceType}`);
  },

  clearAll: () => {
    set(createInitialState());
    get().saveToStorage();
    debug.log('[HeroDeck] Cleared all decks');
  },

  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        debug.log('[HeroDeck] No saved decks found in storage');
        return;
      }
      
      const parsed = JSON.parse(stored);
      
      const validatedDecks: Record<PieceType, HeroDeck | null> = {
        queen: null,
        rook: null,
        bishop: null,
        knight: null,
      };
      
      for (const pieceType of HERO_DECK_PIECE_TYPES) {
        const deck = parsed.decks?.[pieceType];
        if (deck && deck.heroId && deck.heroClass && Array.isArray(deck.cardIds)) {
          validatedDecks[pieceType] = {
            pieceType,
            heroId: deck.heroId,
            heroClass: deck.heroClass,
            cardIds: deck.cardIds.filter((id: unknown) => typeof id === 'number'),
          };
        }
      }
      
      set({ decks: validatedDecks });
      debug.log('[HeroDeck] Loaded decks from storage');
    } catch (error) {
      debug.error('[HeroDeck] Failed to load from storage:', error);
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      const toStore = {
        decks: state.decks,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      debug.error('[HeroDeck] Failed to save to storage:', error);
    }
  },
}));
