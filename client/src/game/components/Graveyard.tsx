import React, { useState } from 'react';
import { CardInstance } from '../types';
import SimpleCard, { SimpleCardData } from './SimpleCard';

interface GraveyardProps {
  cards: CardInstance[];
  playerName: string;
}

function toSimpleCard(ci: CardInstance): SimpleCardData {
  const c = ci.card;
  return {
    id: c.id, name: c.name, manaCost: c.manaCost ?? 0,
    attack: (c as unknown as Record<string, unknown>).attack as number | undefined,
    health: (c as unknown as Record<string, unknown>).health as number | undefined,
    description: c.description, type: (c.type ?? 'minion') as SimpleCardData['type'],
    rarity: c.rarity as SimpleCardData['rarity'],
    keywords: c.keywords,
  };
}

export const Graveyard: React.FC<GraveyardProps> = ({ cards, playerName }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (cards.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center space-x-2 px-2 py-1 bg-gray-800/70 rounded text-white text-sm hover:bg-gray-700/90 transition-colors"
      >
        <span className="text-red-400">☠</span>
        <span>{playerName}'s Graveyard ({cards.length})</span>
        <span>{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="absolute z-50 bg-gray-900/95 p-3 rounded-md shadow-lg border border-gray-700 mt-1 flex flex-wrap gap-2 max-w-[600px]">
          <h3 className="w-full text-white text-sm mb-2">{playerName}'s Graveyard ({cards.length} cards)</h3>
          {cards.map((card) => (
            <div key={card.instanceId} className="transform scale-75 origin-top-left">
              <SimpleCard card={toSimpleCard(card)} size="small" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};