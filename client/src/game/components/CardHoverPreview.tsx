/**
 * CardHoverPreview.tsx
 * 
 * DEPRECATED: This component now wraps UnifiedCardTooltip for backwards compatibility.
 * All keyword definitions are now centralized in UnifiedCardTooltip.tsx
 * 
 * Used by: HandFan.tsx, Hand.tsx for hover previews of cards in hand.
 * 
 * TODO: Eventually migrate HandFan and Hand to use UnifiedCardTooltip directly.
 */

import React from 'react';
import { CardData } from '../types';
import { UnifiedCardTooltip, TooltipCardData } from './ui/UnifiedCardTooltip';

interface CardHoverPreviewProps {
  card: CardData | null;
  mousePosition?: { x: number; y: number };
}

/**
 * CardHoverPreview - Wrapper around UnifiedCardTooltip for hand cards
 * Maintains backwards compatibility with existing HandFan and Hand components
 */
export const CardHoverPreview: React.FC<CardHoverPreviewProps> = ({ 
  card,
  mousePosition
}) => {
  // Only render if we have a card AND valid mouse position (not at origin)
  if (!card || !mousePosition || (mousePosition.x === 0 && mousePosition.y === 0)) return null;
  
  const cardAny = card as any;
  
  // Convert CardData to TooltipCardData format
  const tooltipCard: TooltipCardData = {
    id: card.id,
    name: card.name,
    manaCost: card.manaCost || 0,
    attack: cardAny.attack,
    health: cardAny.health,
    description: card.description,
    type: (card.type as string) || 'minion',
    rarity: (card.rarity as string) || 'common',
    tribe: cardAny.tribe,
    cardClass: cardAny.cardClass || cardAny.class,
    keywords: cardAny.keywords || []
  };

  return (
    <UnifiedCardTooltip
      card={tooltipCard}
      position={mousePosition}
      visible={true}
      placement="above"
    />
  );
};

export default CardHoverPreview;
