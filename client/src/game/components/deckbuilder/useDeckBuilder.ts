/**
 * useDeckBuilder.ts
 * Custom hook encapsulating all deck builder state and logic.
 * Follows React hook patterns - no JSX, just behavior.
 */

import { useState, useMemo, useCallback } from 'react';
import { CardData } from '../../types';
import { cardRegistry } from '../../data/cardRegistry';
import { useHeroDeckStore, HeroDeck, PieceType } from '../../stores/heroDeckStore';
import { useAudio } from '../../../lib/stores/useAudio';
import {
  DECK_SIZE,
  SortOption,
  FilterType,
  CardFilters,
  filterCardsByClass,
  filterAndSortCards,
  countCards,
  canAddCardToDeck,
  getDeckCardsWithCounts,
  generateAutoFillCards,
  getCardClass,
} from './utils';

export interface UseDeckBuilderProps {
  pieceType: PieceType;
  heroId: string;
  heroClass: string;
  onClose: () => void;
  onSave?: () => void;
}

export interface CardGroup {
  label: string;
  cards: CardData[];
}

export interface UseDeckBuilderReturn {
  // State
  deckCardIds: number[];
  searchTerm: string;
  sortBy: SortOption;
  filterType: FilterType;
  selectedCard: CardData | null;
  minCost: number | null;
  maxCost: number | null;
  saveError: string | null;
  heroId: string;

  // Derived State
  filteredAndSortedCards: CardData[];
  groupedCards: CardGroup[];
  deckCardCounts: Record<number, number>;
  deckCardsWithCounts: { card: CardData; count: number }[];
  isDeckComplete: boolean;
  totalValidCards: number;
  totalFilteredCards: number;
  
  // Setters
  setSearchTerm: (term: string) => void;
  setSortBy: (sort: SortOption) => void;
  setFilterType: (filter: FilterType) => void;
  setSelectedCard: (card: CardData | null) => void;
  setMinCost: (cost: number | null) => void;
  setMaxCost: (cost: number | null) => void;
  
  // Actions
  handleAddCard: (card: CardData) => void;
  handleRemoveCard: (card: CardData) => void;
  handleAutoFill: () => void;
  handleClearDeck: () => void;
  handleSave: () => void;
  handleManaFilter: (cost: number) => void;
  handleClearManaFilter: () => void;
  canAddCard: (cardId: number) => boolean;
}

export function useDeckBuilder({
  pieceType,
  heroId,
  heroClass,
  onClose,
  onSave,
}: UseDeckBuilderProps): UseDeckBuilderReturn {
  const { playSoundEffect } = useAudio();
  const { getDeck, setDeck, validateDeck } = useHeroDeckStore();
  
  const normalizedHeroClass = heroClass.toLowerCase();
  
  // Core state
  const existingDeck = getDeck(pieceType);
  const [deckCardIds, setDeckCardIds] = useState<number[]>(
    existingDeck?.cardIds || []
  );
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('cost');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [minCost, setMinCost] = useState<number | null>(null);
  const [maxCost, setMaxCost] = useState<number | null>(null);
  
  // UI state
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Derived: Valid cards for this hero's class (artifacts filtered by heroId)
  const validCards = useMemo(() => {
    return filterCardsByClass(cardRegistry, normalizedHeroClass, heroId);
  }, [normalizedHeroClass, heroId]);
  
  // Derived: Filtered and sorted cards
  const filteredAndSortedCards = useMemo(() => {
    const filters: CardFilters = {
      searchTerm,
      filterType,
      sortBy,
      minCost,
      maxCost,
    };
    return filterAndSortCards(validCards, filters);
  }, [validCards, searchTerm, filterType, sortBy, minCost, maxCost]);
  
  // Derived: Cards grouped by class (hero class first, then neutral)
  const groupedCards = useMemo(() => {
    const classCards: CardData[] = [];
    const neutralCards: CardData[] = [];
    for (const card of filteredAndSortedCards) {
      if (getCardClass(card) === 'neutral') {
        neutralCards.push(card);
      } else {
        classCards.push(card);
      }
    }
    const groups: CardGroup[] = [];
    const classLabel = normalizedHeroClass.charAt(0).toUpperCase() + normalizedHeroClass.slice(1);
    if (classCards.length > 0) groups.push({ label: `${classLabel} Cards`, cards: classCards });
    if (neutralCards.length > 0) groups.push({ label: 'Neutral Cards', cards: neutralCards });
    return groups;
  }, [filteredAndSortedCards, normalizedHeroClass]);

  // Derived: Card counts in deck
  const deckCardCounts = useMemo(() => {
    return countCards(deckCardIds);
  }, [deckCardIds]);
  
  // Derived: Deck cards with count info
  const deckCardsWithCounts = useMemo(() => {
    return getDeckCardsWithCounts(deckCardIds, cardRegistry);
  }, [deckCardIds]);
  
  // Derived: Is deck complete?
  const isDeckComplete = deckCardIds.length === DECK_SIZE;
  
  // Check if a card can be added
  const canAddCard = useCallback((cardId: number): boolean => {
    const card = cardRegistry.find(c => Number(c.id) === cardId);
    if (!card) return false;
    return canAddCardToDeck(cardId, deckCardIds, card);
  }, [deckCardIds]);
  
  // Add card to deck
  const handleAddCard = useCallback((card: CardData) => {
    const cardId = Number(card.id);
    if (!canAddCard(cardId)) return;
    
    setDeckCardIds(prev => [...prev, cardId]);
    playSoundEffect('card_play');
  }, [canAddCard, playSoundEffect]);
  
  // Remove card from deck
  const handleRemoveCard = useCallback((card: CardData) => {
    const cardId = Number(card.id);
    const index = deckCardIds.indexOf(cardId);
    if (index === -1) return;
    
    setDeckCardIds(prev => {
      const newIds = [...prev];
      newIds.splice(index, 1);
      return newIds;
    });
    playSoundEffect('button_click');
  }, [deckCardIds, playSoundEffect]);
  
  // Auto-fill deck
  const handleAutoFill = useCallback(() => {
    const newCards = generateAutoFillCards(deckCardIds, validCards);
    if (newCards.length > 0) {
      setDeckCardIds(prev => [...prev, ...newCards]);
      playSoundEffect('card_draw');
    }
  }, [deckCardIds, validCards, playSoundEffect]);
  
  // Clear deck
  const handleClearDeck = useCallback(() => {
    setDeckCardIds([]);
    playSoundEffect('button_click');
  }, [playSoundEffect]);
  
  // Save deck
  const handleSave = useCallback(() => {
    setSaveError(null);
    
    const deck: HeroDeck = {
      pieceType,
      heroId,
      heroClass: normalizedHeroClass,
      cardIds: deckCardIds,
    };
    
    setDeck(pieceType, deck);
    
    const validation = validateDeck(pieceType);
    if (!validation.valid) {
      setSaveError(validation.errors.join('\n'));
      playSoundEffect('error' as any);
      return;
    }
    
    playSoundEffect('button_click');
    onSave?.();
    onClose();
  }, [pieceType, heroId, normalizedHeroClass, deckCardIds, setDeck, validateDeck, playSoundEffect, onSave, onClose]);
  
  // Mana cost filter toggle
  const handleManaFilter = useCallback((cost: number) => {
    if (minCost === cost && maxCost === (cost === 7 ? 99 : cost)) {
      setMinCost(null);
      setMaxCost(null);
    } else {
      setMinCost(cost === 7 ? 7 : cost);
      setMaxCost(cost === 7 ? 99 : cost);
    }
  }, [minCost, maxCost]);
  
  // Clear mana filter
  const handleClearManaFilter = useCallback(() => {
    setMinCost(null);
    setMaxCost(null);
  }, []);
  
  return {
    // State
    deckCardIds,
    searchTerm,
    sortBy,
    filterType,
    selectedCard,
    minCost,
    maxCost,
    saveError,
    
    heroId,

    // Derived
    filteredAndSortedCards,
    groupedCards,
    deckCardCounts,
    deckCardsWithCounts,
    isDeckComplete,
    totalValidCards: validCards.length,
    totalFilteredCards: filteredAndSortedCards.length,
    
    // Setters
    setSearchTerm,
    setSortBy,
    setFilterType,
    setSelectedCard,
    setMinCost,
    setMaxCost,
    
    // Actions
    handleAddCard,
    handleRemoveCard,
    handleAutoFill,
    handleClearDeck,
    handleSave,
    handleManaFilter,
    handleClearManaFilter,
    canAddCard,
  };
}
