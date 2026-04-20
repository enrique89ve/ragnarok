/**
 * HeroDeckStore.ts
 * 
 * Manages user-built hero decks for the 4 major chess pieces (queen, rook, bishop, knight).
 * Each deck contains exactly 30 cards with validation for class restrictions and copy limits.
 * Persists to localStorage.
 */

import { create } from 'zustand';
import { cardRegistry } from '../data/cardRegistry';
import { debug } from '../config/debugConfig';
import { getNFTBridge } from '../nft';
import { triggerAutoSave } from './saveStateManager';

export type PieceType = 'queen' | 'rook' | 'bishop' | 'knight';

export interface HeroDeck {
  pieceType: PieceType;
  heroId: string;
  heroClass: string;
  cardIds: number[];
}

interface HeroDeckState {
  decks: Record<PieceType, HeroDeck | null>;
}

interface HeroDeckActions {
  setDeck: (pieceType: string, deck: HeroDeck) => void;
  addCard: (pieceType: string, cardId: number) => boolean;
  removeCard: (pieceType: string, cardId: number) => void;
  getDeck: (pieceType: string) => HeroDeck | null;
  validateDeck: (pieceType: string) => { valid: boolean; errors: string[] };
  isArmyComplete: () => boolean;
  clearDeck: (pieceType: string) => void;
  clearAll: () => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

const STORAGE_KEY = 'ragnarok_hero_decks';
const DECK_SIZE = 30;
const MAX_COPIES = 2;

const VALID_PIECE_TYPES: PieceType[] = ['queen', 'rook', 'bishop', 'knight'];

function isPieceType(value: string): value is PieceType {
  return VALID_PIECE_TYPES.includes(value as PieceType);
}

const createInitialState = (): HeroDeckState => ({
  decks: {
    queen: null,
    rook: null,
    bishop: null,
    knight: null,
  },
});

function getCardById(cardId: number) {
  return cardRegistry.find(card => Number(card.id) === cardId);
}

function normalizeClass(className: string | undefined): string {
  if (!className) return 'neutral';
  return className.toLowerCase();
}

function isCardValidForClass(cardId: number, heroClass: string): boolean {
  const card = getCardById(cardId);
  if (!card) return false;
  
  const cardClass = normalizeClass(card.class || card.heroClass);
  const normalizedHeroClass = normalizeClass(heroClass);
  
  return cardClass === 'neutral' || cardClass === normalizedHeroClass;
}

function countCardCopies(cardIds: number[], cardId: number): number {
  return cardIds.filter(id => id === cardId).length;
}

function getOwnedCopies(cardId: number): number {
  return getNFTBridge().getOwnedCopies(cardId);
}

function isCardMythic(cardId: number): boolean {
  const card = getCardById(cardId);
  if (!card) return false;
  return (card.rarity || '').toLowerCase() === 'mythic';
}

function getMaxCopiesForCard(cardId: number): number {
  return isCardMythic(cardId) ? 1 : MAX_COPIES;
}

export const useHeroDeckStore = create<HeroDeckState & HeroDeckActions>((set, get) => ({
  ...createInitialState(),

  setDeck: (pieceType: string, deck: HeroDeck) => {
    if (!isPieceType(pieceType)) {
      debug.warn(`[HeroDeck] Invalid piece type: ${pieceType}`);
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

  addCard: (pieceType: string, cardId: number): boolean => {
    if (!isPieceType(pieceType)) {
      debug.warn(`[HeroDeck] Invalid piece type: ${pieceType}`);
      return false;
    }
    
    const state = get();
    const deck = state.decks[pieceType];
    
    if (!deck) {
      debug.warn(`[HeroDeck] No deck exists for ${pieceType}. Create deck first.`);
      return false;
    }
    
    if (deck.cardIds.length >= DECK_SIZE) {
      debug.warn(`[HeroDeck] Deck is full (${DECK_SIZE} cards)`);
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

  removeCard: (pieceType: string, cardId: number) => {
    if (!isPieceType(pieceType)) {
      debug.warn(`[HeroDeck] Invalid piece type: ${pieceType}`);
      return;
    }
    
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

  getDeck: (pieceType: string): HeroDeck | null => {
    if (!isPieceType(pieceType)) {
      return null;
    }
    return get().decks[pieceType];
  },

  validateDeck: (pieceType: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!isPieceType(pieceType)) {
      return { valid: false, errors: [`Invalid piece type: ${pieceType}`] };
    }
    
    const deck = get().decks[pieceType];
    
    if (!deck) {
      return { valid: false, errors: ['No deck exists for this piece'] };
    }
    
    if (!deck.heroId) {
      errors.push('No hero selected');
    }
    
    if (!deck.heroClass) {
      errors.push('No hero class specified');
    }
    
    if (deck.cardIds.length !== DECK_SIZE) {
      errors.push(`Deck must contain exactly ${DECK_SIZE} cards (has ${deck.cardIds.length})`);
    }
    
    const cardCounts: Record<number, number> = {};
    for (const cardId of deck.cardIds) {
      cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
    }
    
    for (const [cardIdStr, count] of Object.entries(cardCounts)) {
      const cardId = Number(cardIdStr);
      const maxAllowed = getMaxCopiesForCard(cardId);
      if (count > maxAllowed) {
        const card = getCardById(cardId);
        const rarityNote = isCardMythic(cardId) ? ' (Mythic - max 1)' : '';
        errors.push(`Card "${card?.name || cardId}"${rarityNote} has ${count} copies (max ${maxAllowed})`);
      }
    }
    
    for (const cardId of deck.cardIds) {
      if (!isCardValidForClass(cardId, deck.heroClass)) {
        const card = getCardById(cardId);
        const cardClass = normalizeClass(card?.class || card?.heroClass);
        errors.push(`Card "${card?.name || cardId}" (${cardClass}) is not valid for ${deck.heroClass}`);
      }
    }
    
    for (const cardId of deck.cardIds) {
      const card = getCardById(cardId);
      if (!card) {
        errors.push(`Card with ID ${cardId} not found in registry`);
      }
    }

    if (getNFTBridge().isHiveMode()) {
      for (const [cardIdStr, count] of Object.entries(cardCounts)) {
        const cardId = Number(cardIdStr);
        const owned = getOwnedCopies(cardId);
        if (count > owned) {
          const card = getCardById(cardId);
          errors.push(`You own ${owned} copy(ies) of "${card?.name || cardId}" but deck has ${count}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  isArmyComplete: (): boolean => {
    const state = get();
    
    for (const pieceType of VALID_PIECE_TYPES) {
      const validation = state.validateDeck(pieceType);
      if (!validation.valid) {
        return false;
      }
    }
    
    return true;
  },

  clearDeck: (pieceType: string) => {
    if (!isPieceType(pieceType)) {
      debug.warn(`[HeroDeck] Invalid piece type: ${pieceType}`);
      return;
    }
    
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
      
      for (const pieceType of VALID_PIECE_TYPES) {
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
