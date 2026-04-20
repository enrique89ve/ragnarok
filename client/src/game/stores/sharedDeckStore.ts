/**
 * SharedDeckStore.ts
 * 
 * Manages the shared deck state across PvP combat in Ragnarok Poker.
 * Handles card ownership tracking, permanent removal on play, and burning on hero death.
 */

import { create } from 'zustand';
import { ArmySelection, ChessPieceType } from '../types/ChessTypes';
import { useHeroDeckStore, PieceType } from './heroDeckStore';
import { debug } from '../config/debugConfig';

export interface CardInstance {
  instanceId: string;
  cardId: number;
  owner: string; // heroKey (e.g., 'mage-jaina') or 'neutral'
  location: 'deck' | 'hand' | 'played' | 'burned';
  nft_id?: string; // Hive L1 NFT identifier; absent for demo/dev cards
}

export interface SharedDeckState {
  matchId: string | null;
  initialized: boolean;
  
  allCards: CardInstance[];
  drawPile: string[]; // instanceIds
  playedCards: string[]; // instanceIds  
  burnedCards: string[]; // instanceIds
  
  playerHand: string[]; // instanceIds for player's current hand
  opponentHand: string[]; // instanceIds for AI opponent hand
  
  heroCardOwners: Record<string, string>; // instanceId -> heroKey
  aliveHeroes: Set<string>; // heroKeys of still-alive heroes
  
  // Stats
  totalCardsRemaining: number;
  totalCardsBurned: number;
  totalCardsPlayed: number;
}

interface SharedDeckActions {
  initialize: (
    playerArmy: ArmySelection,
    neutralCardIds: number[],
    matchId?: string
  ) => void;
  
  drawCards: (count: number, forPlayer: boolean) => CardInstance[];
  
  playCard: (instanceId: string) => void;
  
  burnHeroCards: (heroKey: string) => number;
  
  markHeroDead: (heroKey: string) => void;
  
  getCardInstance: (instanceId: string) => CardInstance | undefined;
  
  getDrawPileSize: () => number;
  
  reset: () => void;
}

const createInitialState = (): SharedDeckState => ({
  matchId: null,
  initialized: false,
  allCards: [],
  drawPile: [],
  playedCards: [],
  burnedCards: [],
  playerHand: [],
  opponentHand: [],
  heroCardOwners: {},
  aliveHeroes: new Set(),
  totalCardsRemaining: 0,
  totalCardsBurned: 0,
  totalCardsPlayed: 0,
});

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateInstanceId(): string {
  return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const useSharedDeckStore = create<SharedDeckState & SharedDeckActions>((set, get) => ({
  ...createInitialState(),

  initialize: (playerArmy, neutralCardIds, matchId) => {
    debug.log('[SharedDeck] Initializing deck for match:', matchId);
    
    const allCards: CardInstance[] = [];
    const heroCardOwners: Record<string, string> = {};
    const aliveHeroes = new Set<string>();
    
    const heroTypes = ['queen', 'rook', 'bishop', 'knight'] as const;
    
    const heroDeckStore = useHeroDeckStore.getState();
    
    const missingDecks: string[] = [];
    const invalidDecks: string[] = [];
    
    for (const pieceType of heroTypes) {
      const heroDeck = heroDeckStore.getDeck(pieceType as PieceType);
      if (!heroDeck) {
        missingDecks.push(pieceType);
      } else {
        const validation = heroDeckStore.validateDeck(pieceType);
        if (!validation.valid) {
          invalidDecks.push(`${pieceType}: ${validation.errors.join(', ')}`);
        }
      }
    }
    
    if (missingDecks.length > 0) {
      debug.warn(`[SharedDeck] Missing decks for pieces: ${missingDecks.join(', ')}`);
    }
    
    if (invalidDecks.length > 0) {
      debug.warn(`[SharedDeck] Invalid decks: ${invalidDecks.join('; ')}`);
    }
    
    if (missingDecks.length === 4) {
      debug.error('[SharedDeck] No valid decks found! Cannot initialize shared deck.');
      throw new Error('Cannot initialize shared deck: All 4 hero decks are missing. Please build your army first.');
    }
    
    heroTypes.forEach(pieceType => {
      const hero = playerArmy[pieceType as keyof ArmySelection];
      if (!hero) return;
      
      const heroKey = hero.id;
      aliveHeroes.add(heroKey);
      
      const heroDeck = heroDeckStore.getDeck(pieceType as PieceType);
      const deckCardIds = heroDeck?.cardIds || [];
      
      if (deckCardIds.length === 0) {
        debug.warn(`[SharedDeck] Hero ${heroKey} (${pieceType}) has no cards in deck!`);
      }
      
      deckCardIds.forEach((cardId: number) => {
        const instanceId = generateInstanceId();
        allCards.push({
          instanceId,
          cardId,
          owner: heroKey,
          location: 'deck'
        });
        heroCardOwners[instanceId] = heroKey;
      });
      
      debug.log(`[SharedDeck] Added ${deckCardIds.length} cards for ${heroKey} (${pieceType})`);
    });
    
    neutralCardIds.forEach(cardId => {
      const instanceId = generateInstanceId();
      allCards.push({
        instanceId,
        cardId,
        owner: 'neutral',
        location: 'deck'
      });
    });
    
    debug.log(`[SharedDeck] Added ${neutralCardIds.length} neutral cards`);
    
    const drawPile = shuffleArray(allCards.map(c => c.instanceId));
    
    debug.log(`[SharedDeck] Total deck size: ${drawPile.length} cards`);
    
    set({
      matchId: matchId || `match_${Date.now()}`,
      initialized: true,
      allCards,
      drawPile,
      playedCards: [],
      burnedCards: [],
      playerHand: [],
      opponentHand: [],
      heroCardOwners,
      aliveHeroes,
      totalCardsRemaining: drawPile.length,
      totalCardsBurned: 0,
      totalCardsPlayed: 0,
    });
  },

  drawCards: (count, forPlayer) => {
    const state = get();
    const drawnCards: CardInstance[] = [];
    const newDrawPile = [...state.drawPile];
    const newHand = forPlayer ? [...state.playerHand] : [...state.opponentHand];
    const updatedAllCards = [...state.allCards];
    
    for (let i = 0; i < count && newDrawPile.length > 0; i++) {
      const instanceId = newDrawPile.shift()!;
      const cardIndex = updatedAllCards.findIndex(c => c.instanceId === instanceId);
      
      if (cardIndex !== -1) {
        updatedAllCards[cardIndex] = {
          ...updatedAllCards[cardIndex],
          location: 'hand'
        };
        drawnCards.push(updatedAllCards[cardIndex]);
        newHand.push(instanceId);
      }
    }
    
    set({
      allCards: updatedAllCards,
      drawPile: newDrawPile,
      playerHand: forPlayer ? newHand : state.playerHand,
      opponentHand: forPlayer ? state.opponentHand : newHand,
      totalCardsRemaining: newDrawPile.length,
    });
    
    debug.log(`[SharedDeck] Drew ${drawnCards.length} cards for ${forPlayer ? 'player' : 'opponent'}. Deck: ${newDrawPile.length} remaining`);
    
    return drawnCards;
  },

  playCard: (instanceId) => {
    const state = get();
    const updatedAllCards = [...state.allCards];
    const cardIndex = updatedAllCards.findIndex(c => c.instanceId === instanceId);
    
    if (cardIndex === -1) {
      debug.warn(`[SharedDeck] Card instance ${instanceId} not found`);
      return;
    }
    
    updatedAllCards[cardIndex] = {
      ...updatedAllCards[cardIndex],
      location: 'played'
    };
    
    const newPlayedCards = [...state.playedCards, instanceId];
    const newPlayerHand = state.playerHand.filter(id => id !== instanceId);
    const newOpponentHand = state.opponentHand.filter(id => id !== instanceId);
    
    debug.log(`[SharedDeck] Card played and removed permanently. Total played: ${newPlayedCards.length}`);
    
    set({
      allCards: updatedAllCards,
      playedCards: newPlayedCards,
      playerHand: newPlayerHand,
      opponentHand: newOpponentHand,
      totalCardsPlayed: newPlayedCards.length,
    });
  },

  burnHeroCards: (heroKey) => {
    const state = get();
    let burnedCount = 0;
    
    const updatedAllCards = state.allCards.map(card => {
      if (card.owner === heroKey && (card.location === 'deck' || card.location === 'hand')) {
        burnedCount++;
        return { ...card, location: 'burned' as const };
      }
      return card;
    });
    
    const cardsToBurn = state.allCards
      .filter(c => c.owner === heroKey && (c.location === 'deck' || c.location === 'hand'))
      .map(c => c.instanceId);
    
    const newDrawPile = state.drawPile.filter(id => !cardsToBurn.includes(id));
    const newPlayerHand = state.playerHand.filter(id => !cardsToBurn.includes(id));
    const newOpponentHand = state.opponentHand.filter(id => !cardsToBurn.includes(id));
    const newBurnedCards = [...state.burnedCards, ...cardsToBurn];
    
    debug.log(`[SharedDeck] Burned ${burnedCount} cards from ${heroKey}. Deck: ${newDrawPile.length} remaining`);
    
    set({
      allCards: updatedAllCards,
      drawPile: newDrawPile,
      playerHand: newPlayerHand,
      opponentHand: newOpponentHand,
      burnedCards: newBurnedCards,
      totalCardsRemaining: newDrawPile.length,
      totalCardsBurned: newBurnedCards.length,
    });
    
    return burnedCount;
  },

  markHeroDead: (heroKey) => {
    const state = get();
    const newAliveHeroes = new Set(state.aliveHeroes);
    newAliveHeroes.delete(heroKey);
    
    set({ aliveHeroes: newAliveHeroes });
    
    get().burnHeroCards(heroKey);
  },

  getCardInstance: (instanceId) => {
    return get().allCards.find(c => c.instanceId === instanceId);
  },

  getDrawPileSize: () => {
    return get().drawPile.length;
  },

  reset: () => {
    debug.log('[SharedDeck] Resetting deck state');
    set(createInitialState());
  },
}));
