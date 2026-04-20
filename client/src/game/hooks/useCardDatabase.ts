/**
 * useCardDatabase.ts
 * 
 * A hook that provides easy access to the card database service
 * for any component that needs to fetch card data.
 */

import { useEffect, useState } from 'react';
import { CardData } from '../types';
import CardDatabaseService from '../services/cardDatabase';

export const useCardDatabase = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    // The CardDatabaseService auto-initializes with demo data
    // Just mark as loaded when ready
    if (!CardDatabaseService.isInitialized()) {
      // Wait a moment for auto-initialization to complete
      const timer = setTimeout(() => {
        setIsLoaded(true);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setIsLoaded(true);
      return undefined;
    }
  }, []);
  
  /**
   * Get a card by its ID
   */
  const getCardById = (id: number | string): CardData | undefined => {
    return CardDatabaseService.getCardById(id);
  };
  
  /**
   * Get all cards in the database
   */
  const getAllCards = (): CardData[] => {
    return CardDatabaseService.getAllCards();
  };
  
  /**
   * Get cards by class
   */
  const getCardsByClass = (className: string): CardData[] => {
    return CardDatabaseService.getCardsByClass(className);
  };
  
  /**
   * Get cards by type
   */
  const getCardsByType = (type: string): CardData[] => {
    return CardDatabaseService.getCardsByType(type);
  };
  
  /**
   * Get cards by rarity
   */
  const getCardsByRarity = (rarity: string): CardData[] => {
    return CardDatabaseService.getCardsByRarity(rarity);
  };
  
  /**
   * Get random card from the database
   */
  const getRandomCard = (): CardData => {
    const cards = CardDatabaseService.getAllCards();
    if (cards.length === 0) {
      // Fallback card if database is empty
      return {
        id: 999,
        name: 'Debug Card',
        manaCost: 3,
        attack: 3,
        health: 3,
        type: 'minion',
        class: 'Neutral',
        rarity: 'mythic',
        description: 'This is a test card for debugging purposes.'
      };
    }
    return cards[Math.floor(Math.random() * cards.length)];
  };
  
  /**
   * Get mythic cards only
   */
  const getMythicCards = (): CardData[] => {
    return CardDatabaseService.getCardsByRarity('mythic');
  };
  
  /**
   * Search cards by name, description, or other properties
   */
  const searchCards = (query: string): CardData[] => {
    return CardDatabaseService.filterCards({
      nameContains: query
    });
  };
  
  return {
    isLoaded,
    getCardById,
    getAllCards,
    getCardsByClass,
    getCardsByType,
    getCardsByRarity,
    getRandomCard,
    getMythicCards,
    getLegendaryCards: getMythicCards,
    searchCards
  };
};

export default useCardDatabase;