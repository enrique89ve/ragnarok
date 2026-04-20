/**
 * ArtGallery Component
 * Browse and filter artwork by character, faction, element
 * Integrates with deck builder for artwork selection
 */

import React from 'react';
import { ArtCard } from './ArtCard';
import { useArtManager } from '../../hooks/useArtManager';
import type { ArtFilters } from '../../utils/art';

interface ArtGalleryProps {
  onSelectCard?: (cardId: string) => void;
  selectedCardId?: string;
  compact?: boolean;
}

export const ArtGallery: React.FC<ArtGalleryProps> = ({
  onSelectCard,
  selectedCardId,
  compact = false,
}) => {
  const {
    filteredCards,
    characterGroups,
    isLoading,
    error,
    filters,
    setFilters,
    filterOptions,
    getImageUrl,
  } = useArtManager();

  const handleFilterChange = (key: keyof ArtFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full" />
        <span className="ml-3 text-gray-400">Loading artwork...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className={`flex-shrink-0 p-3 border-b border-gray-700 ${compact ? 'space-y-2' : 'space-y-3'}`}>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search by name..."
            value={filters.search}
            onChange={e => handleFilterChange('search', e.target.value)}
            className="flex-1 min-w-32 px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
          />
          
          <select
            value={filters.faction}
            onChange={e => handleFilterChange('faction', e.target.value)}
            className="px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-yellow-500"
          >
            <option value="all">All Factions</option>
            {filterOptions.factions.map(f => (
              <option key={f} value={f} className="capitalize">{f}</option>
            ))}
          </select>

          <select
            value={filters.element}
            onChange={e => handleFilterChange('element', e.target.value)}
            className="px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-yellow-500"
          >
            <option value="all">All Elements</option>
            {filterOptions.elements.map(e => (
              <option key={e} value={e} className="capitalize">{e}</option>
            ))}
          </select>

          <select
            value={filters.piece}
            onChange={e => handleFilterChange('piece', e.target.value)}
            className="px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-yellow-500"
          >
            <option value="all">All Pieces</option>
            {filterOptions.pieces.map(p => (
              <option key={p} value={p} className="capitalize">{p}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>{filteredCards.length} artworks • {characterGroups.length} characters</span>
          {filters.search || filters.faction !== 'all' || filters.element !== 'all' || filters.piece !== 'all' ? (
            <button
              onClick={() => setFilters({
                search: '',
                faction: 'all',
                element: 'all',
                piece: 'all',
                category: 'all',
              })}
              className="text-yellow-400 hover:text-yellow-300"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className={`grid gap-3 ${compact ? 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-8' : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6'}`}>
          {filteredCards.map(card => (
            <ArtCard
              key={card.id}
              card={card}
              imageUrl={getImageUrl(card)}
              size={compact ? 'small' : 'medium'}
              onClick={onSelectCard ? () => onSelectCard(card.id) : undefined}
              selected={card.id === selectedCardId}
            />
          ))}
        </div>
        
        {filteredCards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <span className="text-4xl mb-2">🎨</span>
            <p>No artwork matches your filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtGallery;
