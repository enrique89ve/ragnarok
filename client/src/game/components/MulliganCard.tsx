import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CardInstance } from '../types';
import { SimpleCard, SimpleCardData } from './SimpleCard';
import { getCardById } from '../data/allCards';
import './mulligan.css';

const ANIMATE_SELECTED = { scale: 0.93, y: 6 };
const ANIMATE_DEFAULT = { scale: 1, y: 0 };
const HOVER_SELECTED = {};
const HOVER_DEFAULT = { scale: 1.06, y: -8 };
const SPRING_TRANSITION = { type: 'spring' as const, stiffness: 360, damping: 26 };
const OVERLAY_INITIAL = { opacity: 0, scale: 0.6 };
const OVERLAY_ANIMATE = { opacity: 1, scale: 1 };
const OVERLAY_EXIT = { opacity: 0, scale: 0.6 };
const OVERLAY_TRANSITION = { type: 'spring' as const, stiffness: 400, damping: 22 };

interface MulliganCardProps {
  card: CardInstance;
  isSelected: boolean;
  onClick: () => void;
}

export const MulliganCard: React.FC<MulliganCardProps> = React.memo(({ card, isSelected, onClick }) => {
  const cardData = card?.card;

  if (!cardData) {
    return (
      <div className="mulligan-card-placeholder">
        <span className="mulligan-card-placeholder-text">Loading…</span>
      </div>
    );
  }

  const simpleCardData: SimpleCardData = useMemo(() => {
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
      rarity: (cardData.rarity as 'basic' | 'common' | 'rare' | 'epic' | 'mythic') || 'common',
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
    };
  }, [cardData]);

  return (
    <motion.div
      className="mulligan-card-wrapper"
      animate={isSelected ? ANIMATE_SELECTED : ANIMATE_DEFAULT}
      whileHover={isSelected ? HOVER_SELECTED : HOVER_DEFAULT}
      transition={SPRING_TRANSITION}
      onClick={onClick}
    >
      <SimpleCard
        card={simpleCardData}
        size="large"
        showDescription={false}
      />

      {isSelected && (
        <motion.div
          className="mulligan-card-selected-overlay"
          initial={OVERLAY_INITIAL}
          animate={OVERLAY_ANIMATE}
          exit={OVERLAY_EXIT}
          transition={OVERLAY_TRANSITION}
        >
          <div className="mulligan-card-x-badge">✕</div>
          <span className="mulligan-card-replace-label">Replace</span>
        </motion.div>
      )}
    </motion.div>
  );
});
