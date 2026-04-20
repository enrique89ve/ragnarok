import React from 'react';
import { motion } from 'framer-motion';
import { CardType, CardRarity } from '../../types';

interface CollectionFiltersProps {
  filters: {
    manaCost: number | 'all';
    cardType: CardType | 'all';
    rarity: CardRarity | 'all';
    searchText: string;
    hideNeutral?: boolean;
  };
  onUpdateFilters: (filters: Partial<CollectionFiltersProps['filters']>) => void;
  onClearFilters: () => void;
}

/**
 * CollectionFilters - A the game-like filter bar for the card collection
 */
const CollectionFilters: React.FC<CollectionFiltersProps> = ({
  filters,
  onUpdateFilters,
  onClearFilters
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateFilters({ searchText: e.target.value });
  };
  
  const clearSearch = () => {
    onUpdateFilters({ searchText: '' });
  };
  
  return (
    <div className="collection-filters p-4 border-b border-gray-700 bg-gray-800 text-white">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Search input */}
        <div className="search-bar relative flex-grow max-w-md">
          <input
            type="text"
            className="w-full bg-gray-700 border border-gray-600 rounded-full px-4 py-2 pr-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search cards..."
            value={filters.searchText}
            onChange={handleSearchChange}
          />
          {filters.searchText && (
            <button
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              onClick={clearSearch}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
        
        <div className="filters flex flex-wrap gap-2 md:gap-4">
          {/* Mana cost filter */}
          <div className="mana-filter">
            <div className="flex flex-wrap gap-1">
              {([0, 1, 2, 3, 4, 5, 6, 7, 'all'] as const).map((cost) => (
                <button
                  key={cost === 'all' ? 'all-mana' : `mana-${cost}`}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold transition-all transform ${
                    filters.manaCost === cost 
                      ? 'bg-blue-600 scale-110 shadow-lg' 
                      : 'bg-blue-400 hover:bg-blue-500'
                  }`}
                  onClick={() => onUpdateFilters({ manaCost: cost as typeof filters.manaCost })}
                >
                  {cost === 'all' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    cost === 7 ? '7+' : cost
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Card type filter */}
          <div className="card-type-filter">
            <select
              className="bg-gray-700 border border-gray-600 rounded-full px-3 py-2 text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.cardType}
              onChange={(e) => onUpdateFilters({ cardType: e.target.value as CardType | 'all' })}
            >
              <option value="all">All Types</option>
              <option value="minion">Minions</option>
              <option value="spell">Spells</option>
              <option value="weapon">Weapons</option>
            </select>
          </div>
          
          {/* Rarity filter */}
          <div className="rarity-filter">
            <select
              className="bg-gray-700 border border-gray-600 rounded-full px-3 py-2 text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.rarity}
              onChange={(e) => onUpdateFilters({ rarity: e.target.value as CardRarity | 'all' })}
            >
              <option value="all">All Rarities</option>
              <option value="basic">Basic</option>
              <option value="common">Common</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="mythic">Mythic</option>
            </select>
          </div>
          
          {/* Hide Neutral toggle */}
          <div className="hide-neutral-filter flex items-center">
            <label className="flex items-center cursor-pointer">
              <div className={`w-10 h-5 relative transition-colors duration-200 ease-in-out rounded-full ${filters.hideNeutral ? 'bg-green-500' : 'bg-gray-600'}`}>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={filters.hideNeutral || false}
                  onChange={(e) => onUpdateFilters({ hideNeutral: e.target.checked })}
                />
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ease-in-out ${filters.hideNeutral ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
              </div>
              <span className="ml-2 text-sm text-white">Hide Neutral Cards</span>
            </label>
          </div>
          
          {/* Clear filters button */}
          {(filters.manaCost !== 'all' || filters.cardType !== 'all' || filters.rarity !== 'all' || filters.searchText || filters.hideNeutral) && (
            <motion.button
              className="clear-filters px-3 py-2 bg-red-600 hover:bg-red-700 rounded-full text-white text-sm"
              onClick={onClearFilters}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              Clear Filters
            </motion.button>
          )}
        </div>
      </div>
      
      {/* Filter badges - show what's currently being filtered */}
      {(filters.manaCost !== 'all' || filters.cardType !== 'all' || filters.rarity !== 'all' || filters.hideNeutral) && (
        <div className="active-filters flex flex-wrap gap-2 mt-3">
          {filters.manaCost !== 'all' && (
            <div className="filter-badge bg-blue-600 text-white text-xs px-2 py-1 rounded-full flex items-center">
              <span className="mr-1">Mana: {filters.manaCost === 7 ? '7+' : filters.manaCost}</span>
              <button 
                className="text-white hover:text-red-300"
                onClick={() => onUpdateFilters({ manaCost: 'all' })}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
          
          {filters.cardType !== 'all' && (
            <div className="filter-badge bg-purple-600 text-white text-xs px-2 py-1 rounded-full flex items-center">
              <span className="mr-1">Type: {filters.cardType}</span>
              <button 
                className="text-white hover:text-red-300"
                onClick={() => onUpdateFilters({ cardType: 'all' })}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
          
          {filters.rarity !== 'all' && (
            <div className="filter-badge bg-yellow-600 text-white text-xs px-2 py-1 rounded-full flex items-center">
              <span className="mr-1">Rarity: {filters.rarity}</span>
              <button 
                className="text-white hover:text-red-300"
                onClick={() => onUpdateFilters({ rarity: 'all' })}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
          
          {filters.hideNeutral && (
            <div className="filter-badge bg-green-600 text-white text-xs px-2 py-1 rounded-full flex items-center">
              <span className="mr-1">Hiding Neutral Cards</span>
              <button 
                className="text-white hover:text-red-300"
                onClick={() => onUpdateFilters({ hideNeutral: false })}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CollectionFilters;