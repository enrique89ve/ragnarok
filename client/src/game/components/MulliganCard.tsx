import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CardInstance } from '../types';
import { SimpleCard, SimpleCardData } from './card/SimpleCardCompat';
import CardCardBack from './card/slots/CardCardBack';
import { getCardById } from '../data/allCards';
import './mulligan.css';
import './card/pokerFaceDown.css';
import { GameIcon } from '../utils/ui/GameIcon';

const ANIMATE_SELECTED = { scale: 0.93, y: 6 };
const ANIMATE_DEFAULT = { scale: 1, y: 0 };
const SPRING_TRANSITION = { type: 'spring' as const, stiffness: 360, damping: 26 };
const OVERLAY_INITIAL = { opacity: 0, scale: 0.6 };
const OVERLAY_ANIMATE = { opacity: 1, scale: 1 };
const OVERLAY_EXIT = { opacity: 0, scale: 0.6 };
const OVERLAY_TRANSITION = { type: 'spring' as const, stiffness: 400, damping: 22 };

interface MulliganCardProps {
  card: CardInstance;
  isSelected: boolean;
  onClick: () => void;
  onHoverChange?: (card: CardInstance | null, anchor?: HTMLElement) => void;
  disableMotion: boolean;
  disableCardFx: boolean;
  entranceRevealDelay?: number;
}

export const toMulliganSimpleCardData = (cardData: CardInstance['card']): SimpleCardData => {
  const cardDataTyped = cardData as any;
  const evolvesFrom = cardDataTyped.evolvesFrom as number | undefined;
  const evolvesFromCard = evolvesFrom ? getCardById(evolvesFrom) : undefined;

  return {
    id: cardData.id || 0,
    name: cardData.name || 'Unknown',
    manaCost: cardData.manaCost || 0,
    attack: cardDataTyped.attack,
    health: cardDataTyped.health,
    description: cardData.description || '',
    type: (cardData.type as 'minion' | 'spell' | 'weapon') || 'minion',
    rarity: (cardData.rarity as 'common' | 'rare' | 'epic' | 'mythic') || 'common',
    tribe: cardDataTyped.tribe || cardDataTyped.race,
    cardClass: (cardDataTyped.cardClass || cardDataTyped.class),
    keywords: cardData.keywords || [],
    element: cardDataTyped.element,
    petStage: cardDataTyped.petStage,
    petFamily: cardDataTyped.petFamily,
    evolvesFrom,
    evolvesFromName: evolvesFromCard?.name,
    evolutionCondition: cardDataTyped.evolutionCondition,
    hasStage3Variants: !!(cardDataTyped.stage3Variants && cardDataTyped.stage3Variants.length > 0),
    bloodPrice: cardDataTyped.bloodPrice,
  };
};

export const MulliganCard: React.FC<MulliganCardProps> = React.memo(({ card, isSelected, onClick, onHoverChange, disableMotion, disableCardFx, entranceRevealDelay = 0 }) => {
  const cardData = card?.card;

  const simpleCardData: SimpleCardData | null = useMemo(() => {
    if (!cardData) return null;
    return toMulliganSimpleCardData(cardData);
  }, [cardData]);

  if (!simpleCardData) {
    return (
      <div className="mulligan-card-placeholder">
        <span className="mulligan-card-placeholder-text">Loading…</span>
      </div>
    );
  }

  const wrapperClassName = [
    'mulligan-card-wrapper',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400/90',
    disableCardFx ? 'mulligan-card-no-fx' : '',
  ].filter(Boolean).join(' ');

  const motionProps = {
    animate: isSelected ? ANIMATE_SELECTED : ANIMATE_DEFAULT,
    transition: SPRING_TRANSITION,
  };

  const overlay = isSelected ? (
    disableMotion ? (
      <div className="mulligan-card-selected-overlay">
        <div className="mulligan-card-x-badge"><GameIcon name="x" size={12} /></div>
        <span className="mulligan-card-replace-label">Replace</span>
      </div>
    ) : (
      <motion.div
        className="mulligan-card-selected-overlay"
        initial={OVERLAY_INITIAL}
        animate={OVERLAY_ANIMATE}
        exit={OVERLAY_EXIT}
        transition={OVERLAY_TRANSITION}
      >
        <div className="mulligan-card-x-badge"><GameIcon name="x" size={12} /></div>
        <span className="mulligan-card-replace-label">Replace</span>
      </motion.div>
    )
  ) : null;

  const flipStageClassName = [
    'mulligan-card-flip-stage',
    !disableMotion ? 'mulligan-card-flip-stage--cinematic' : 'mulligan-card-flip-stage--static',
  ].filter(Boolean).join(' ');
  const flipStageStyle = !disableMotion
    ? ({ '--mulligan-card-reveal-delay': `${entranceRevealDelay}s` } as React.CSSProperties)
    : undefined;

  const root = (
    <div className={flipStageClassName} style={flipStageStyle}>
      <div className="mulligan-card-flip-face mulligan-card-flip-face--back" aria-hidden="true">
        <CardCardBack />
      </div>
      <div className="mulligan-card-flip-face mulligan-card-flip-face--front">
        <SimpleCard
          card={simpleCardData}
          size="large"
          surface="mulligan"
          showDescription={false}
          disableTooltips
          semanticMode="presentation"
        />

        {overlay}
      </div>
    </div>
  );

  return disableMotion ? (
    <div
      className={wrapperClassName}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`Inspect ${simpleCardData.name}. Click to ${isSelected ? 'keep' : 'replace'} this card.`}
      onClick={onClick}
      onMouseEnter={(event) => onHoverChange?.(card, event.currentTarget)}
      onMouseLeave={() => onHoverChange?.(null)}
      onFocus={(event) => onHoverChange?.(card, event.currentTarget)}
      onBlur={() => onHoverChange?.(null)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onClick();
      }}
    >
      {root}
    </div>
  ) : (
    <motion.div
      className={wrapperClassName}
      {...motionProps}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`Inspect ${simpleCardData.name}. Click to ${isSelected ? 'keep' : 'replace'} this card.`}
      onClick={onClick}
      onMouseEnter={(event) => onHoverChange?.(card, event.currentTarget)}
      onMouseLeave={() => onHoverChange?.(null)}
      onFocus={(event) => onHoverChange?.(card, event.currentTarget)}
      onBlur={() => onHoverChange?.(null)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onClick();
      }}
    >
      {root}
    </motion.div>
  );
});
