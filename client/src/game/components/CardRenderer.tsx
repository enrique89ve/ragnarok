/**
 * CardRenderer Component
 *
 * Compatibility facade for legacy imports. The card anatomy and rarity styling
 * live in SimpleCard; callers can still pass the older renderer props while we
 * keep one base visual contract.
 */

import React, { useMemo } from 'react';
import { CardData, CardInstance } from '../types';
import { CardInstanceWithCardData } from '../types/interfaceExtensions';
import { getCardDataSafely } from '../utils/cards/cardInstanceAdapter';
import {
  normalizeSimpleCardRarity,
  normalizeSimpleCardType,
  SimpleCard,
} from './SimpleCard';
import type { SimpleCardData, SimpleCardStatsMode, SimpleCardStatView } from './SimpleCard';

type SimpleCardSize = 'small' | 'medium' | 'large' | 'preview';

interface CardRendererProps {
  // Card data - can be in any format the game uses
  card: CardInstance | CardInstanceWithCardData | CardData;

  // Legacy visual configuration options kept for call-site compatibility.
  renderQuality?: 'high' | 'medium' | 'low';
  use3D?: boolean;
  enableHolographic?: boolean;
  forceHolographic?: boolean;

  // Visual state flags
  isPlayable?: boolean;
  isHighlighted?: boolean;
  isInHand?: boolean;

  // Container configuration
  className?: string;
  style?: React.CSSProperties;
  size?: SimpleCardSize;

  // Stat decoration adapter
  attackBuff?: number;
  healthBuff?: number;
  statView?: SimpleCardStatView;
  statsMode?: SimpleCardStatsMode;

  // Ref forwarding for parent components to access the DOM element
  cardRef?: React.RefObject<HTMLDivElement>;

  // Optional ID for card tracking
  cardId?: string;
}

const EMPTY_STYLE: React.CSSProperties = {};
const SIMPLE_CARD_FILL_STYLE: React.CSSProperties = { width: '100%', height: '100%' };

function readNumberProperty(source: object, key: string): number | undefined {
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'number' ? value : undefined;
}

function readStringProperty(source: object, key: string): string | undefined {
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

function readStringArrayProperty(source: object, key: string): string[] | undefined {
  const value = (source as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return undefined;
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function readEvolutionLevel(source: object): SimpleCardData['evolutionLevel'] {
  const value = readNumberProperty(source, 'evolutionLevel');
  return value === 1 || value === 2 || value === 3 ? value : undefined;
}

function readEvolutionCondition(source: object): SimpleCardData['evolutionCondition'] {
  const value = (source as Record<string, unknown>).evolutionCondition;
  if (!value || typeof value !== 'object') return undefined;

  const record = value as Record<string, unknown>;
  if (typeof record.trigger !== 'string' || typeof record.description !== 'string') return undefined;
  return { trigger: record.trigger, description: record.description };
}

function hasStage3Variants(source: object): boolean {
  return Array.isArray((source as Record<string, unknown>).stage3Variants);
}

/**
 * Pure rendering component for cards with no transformation logic.
 */
export const CardRenderer: React.FC<CardRendererProps> = React.memo(({
  card,
  isPlayable = false,
  isHighlighted = false,
  className = '',
  style = EMPTY_STYLE,
  size = 'medium',
  attackBuff = 0,
  healthBuff = 0,
  statView,
  statsMode = 'frame',
  cardRef,
  cardId,
}) => {
  const processedCard = useMemo(() => getCardDataSafely(card), [card]);

  const simpleCardData = useMemo<SimpleCardData>(() => ({
    id: processedCard.id || 0,
    name: processedCard.name || 'Card',
    manaCost: processedCard.manaCost || 0,
    attack: readNumberProperty(processedCard, 'attack'),
    health: readNumberProperty(processedCard, 'health'),
    description: processedCard.description || '',
    type: normalizeSimpleCardType(processedCard.type),
    rarity: normalizeSimpleCardRarity(processedCard.rarity),
    tribe: processedCard.race,
    cardClass: processedCard.class || processedCard.heroClass,
    keywords: readStringArrayProperty(processedCard, 'keywords') || [],
    evolutionLevel: readEvolutionLevel(processedCard),
    element: readStringProperty(processedCard, 'element'),
    petStage: readStringProperty(processedCard, 'petStage'),
    petFamily: readStringProperty(processedCard, 'petFamily'),
    evolvesFrom: readNumberProperty(processedCard, 'evolvesFrom'),
    evolvesFromName: readStringProperty(processedCard, 'evolvesFromName'),
    evolutionCondition: readEvolutionCondition(processedCard),
    hasStage3Variants: hasStage3Variants(processedCard),
    bloodPrice: processedCard.bloodPrice,
    chainPartner: readNumberProperty(processedCard, 'chainPartner'),
    einpieces: readNumberProperty(processedCard, 'einpieces'),
  }), [processedCard]);

  const containerStyle: React.CSSProperties = useMemo(() => ({
    width: '100%',
    height: '100%',
    position: 'relative',
    borderRadius: '8px',
    overflow: 'visible',
    ...style,
  }), [style]);

  return (
    <div
      ref={cardRef}
      className={`card-renderer ${className}`}
      style={containerStyle}
      data-card-id={cardId || processedCard.id}
      data-card-name={processedCard.name}
      data-card-type={processedCard.type}
      data-rendering-mode="simple-card"
    >
      <SimpleCard
        card={simpleCardData}
        isPlayable={isPlayable}
        isHighlighted={isHighlighted}
        size={size}
        style={SIMPLE_CARD_FILL_STYLE}
        attackBuff={attackBuff}
        healthBuff={healthBuff}
        statView={statView}
        statsMode={statsMode}
      />
    </div>
  );
});

export default CardRenderer;
