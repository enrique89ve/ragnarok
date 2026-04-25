/**
 * useArtManager Hook
 * Manages art metadata loading, filtering, and grouping by character
 * 
 * Architecture: Hook layer - uses utils for pure logic and ArtRegistry as Source of Truth
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { assetPath } from '../utils/assetPath';
import type { ArtCard, ArtMetadata, CharacterGroup, ArtFilters } from '../utils/art';
import { 
  groupByCharacter, 
  filterArtCards, 
  getUniqueValues,
  findCardById,
  getCharacterCards,
  getArtImageUrl,
  parseMetadata,
  loadArtRegistry
} from '../utils/art';

interface UseArtManagerReturn {
  cards: ArtCard[];
  isLoading: boolean;
  error: string | null;
  filters: ArtFilters;
  setFilters: React.Dispatch<React.SetStateAction<ArtFilters>>;
  filteredCards: ArtCard[];
  characterGroups: CharacterGroup[];
  filterOptions: {
    factions: string[];
    elements: string[];
    pieces: string[];
    categories: string[];
  };
  getImageUrl: (card: ArtCard) => string;
  findCard: (id: string) => ArtCard | undefined;
  getCharacterArt: (character: string) => ArtCard[];
  metadata: ArtMetadata | null;
}

const defaultFilters: ArtFilters = {
  search: '',
  faction: 'all',
  element: 'all',
  piece: 'all',
  category: 'all',
};

export function useArtManager(): UseArtManagerReturn {
  const [metadata, setMetadata] = useState<ArtMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ArtFilters>(defaultFilters);

  useEffect(() => {
    let mounted = true;

    async function loadMetadata() {
      try {
        setIsLoading(true);
        setError(null);

        // Uses the ArtRegistry logic which is the DNA Source of Truth
        const registry = await loadArtRegistry();
        
        if (!mounted) return;
        setMetadata(registry);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load art registry');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadMetadata();

    return () => { mounted = false; };
  }, []);

  const cards = useMemo(() => metadata?.cards ?? [], [metadata]);

  const filteredCards = useMemo(() => {
    return filterArtCards(cards, filters);
  }, [cards, filters]);

  const characterGroups = useMemo(() => {
    return groupByCharacter(filteredCards);
  }, [filteredCards]);

  const filterOptions = useMemo(() => {
    return getUniqueValues(cards);
  }, [cards]);

  const getImageUrl = useCallback((card: ArtCard) => {
    return getArtImageUrl(card);
  }, []);

  const findCard = useCallback((id: string) => {
    return findCardById(cards, id);
  }, [cards]);

  const getCharacterArt = useCallback((character: string) => {
    return getCharacterCards(cards, character);
  }, [cards]);

  return {
    cards,
    isLoading,
    error,
    filters,
    setFilters,
    filteredCards,
    characterGroups,
    filterOptions,
    getImageUrl,
    findCard,
    getCharacterArt,
    metadata,
  };
}
