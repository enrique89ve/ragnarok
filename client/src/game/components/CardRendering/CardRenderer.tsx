/**
 * CardRenderer.tsx
 * 
 * Clean card rendering component using SimpleCard.
 * No 3D effects, no complex transforms - just clear, readable cards.
 */

import { debug } from '../../config/debugConfig';
import React, { useMemo } from 'react';
import { CardData, CardInstance } from '../../types';
import { SimpleCard, SimpleCardData } from '../SimpleCard';
import { getCardDataSafely } from '../../utils/cards/cardInstanceAdapter';
import { getCardById } from '../../data/allCards';

export type CardRenderQuality = 'high' | 'medium' | 'low';

const EMPTY_STYLE: React.CSSProperties = {};

interface CardRendererProps {
  card: CardData | CardInstance;
  isInHand?: boolean;
  isPlayable?: boolean;
  isHighlighted?: boolean; 
  scale?: number;
  onClick?: () => void;
  onHover?: () => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  use3D?: boolean;
  className?: string;
  style?: React.CSSProperties;
  renderQuality?: CardRenderQuality;
  cardId?: string;
  enableHolographic?: boolean;
  forceHolographic?: boolean;
  size?: 'small' | 'medium' | 'large' | 'preview';
  attackBuff?: number;
  healthBuff?: number;
}

/**
 * CardRenderer - Clean abstraction for rendering cards using SimpleCard
 */
const CardRenderer: React.FC<CardRendererProps> = React.memo(({
  card,
  isInHand = false,
  isPlayable = true,
  isHighlighted = false,
  scale = 1,
  onClick,
  onMouseEnter,
  onMouseLeave,
  className = '',
  style = EMPTY_STYLE,
  size = 'medium',
  attackBuff = 0,
  healthBuff = 0
}) => {
  const processedCard = useMemo(() => getCardDataSafely(card), [card]);

  if (!processedCard) {
    debug.warn('CardRenderer: No card data available');
    return null;
  }

  const evolutionLevel = ('evolutionLevel' in card) ? (card as any).evolutionLevel as (1 | 2 | 3 | undefined) : undefined;

  const simpleCardData: SimpleCardData = useMemo(() => {
    const cardAny = processedCard as any;
    const evolvesFrom = cardAny.evolvesFrom as number | undefined;
    const evolvesFromCard = evolvesFrom ? getCardById(evolvesFrom) : undefined;
    return {
      id: processedCard.id || 0,
      name: processedCard.name || 'Unknown',
      manaCost: processedCard.manaCost || 0,
      attack: processedCard.attack,
      health: processedCard.health,
      description: processedCard.description || '',
      type: (processedCard.type as 'minion' | 'spell' | 'weapon') || 'minion',
      rarity: (processedCard.rarity as 'basic' | 'common' | 'rare' | 'epic' | 'mythic') || 'common',
      tribe: processedCard.tribe,
      cardClass: processedCard.cardClass || processedCard.class,
      keywords: processedCard.keywords || [],
      evolutionLevel,
      element: cardAny.element,
      petStage: cardAny.petStage,
      petFamily: cardAny.petFamily,
      evolvesFrom,
      evolvesFromName: evolvesFromCard?.name,
      evolutionCondition: cardAny.evolutionCondition,
      hasStage3Variants: !!(cardAny.stage3Variants && cardAny.stage3Variants.length > 0),
    };
  }, [processedCard, evolutionLevel]);

  const scaleStyle: React.CSSProperties = useMemo(() => scale !== 1 ? {
    transform: `scale(${scale})`,
    transformOrigin: 'center center',
    ...style
  } : style, [scale, style]);

  return (
    <div className={`card-renderer-wrapper ${className}`} style={scaleStyle}>
      <SimpleCard
        card={simpleCardData}
        isPlayable={isPlayable}
        isHighlighted={isHighlighted}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        size={size}
        showDescription={size === 'large' || size === 'preview'}
        attackBuff={attackBuff}
        healthBuff={healthBuff}
      />
    </div>
  );
});

export default CardRenderer;
