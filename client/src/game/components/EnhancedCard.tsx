/**
 * EnhancedCard.tsx
 * 
 * A comprehensive card component that renders cards with premium
 * 3D effects using our standardized card rendering approach.
 * 
 * This implementation uses the new CardRenderer component to ensure
 * consistent visual appearance and proper separation of concerns.
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CardData, CardInstance } from '../types';
import NorseFrame from './NorseFrame/NorseFrame';
import './CardEnhancements.simple.css';
import './NorseFrame/NorseFrame.css';
import { formatCardText } from '../utils/textFormatUtils';
import { fixCardRenderingIssues } from '../utils/cardRenderingSystemFix';
import { ACTIVE_CARD_RENDERER } from '../utils/cards/cardRenderingRegistry';
import CardRenderer from './CardRendering/CardRenderer';

interface EnhancedCardProps {
  card: CardData | CardInstance;
  isInHand?: boolean;
  isPlayable?: boolean;
  scale?: number;
  onClick?: () => void;
  isHighlighted?: boolean;
  isDraggable?: boolean;
  dragConstraints?: React.RefObject<HTMLDivElement>;
  registerPosition?: (card: CardInstance, position: {x: number, y: number}) => void;
  className?: string;
}

export const EnhancedCard = React.forwardRef<HTMLDivElement, EnhancedCardProps>(({
  card,
  isInHand = false,
  isPlayable = false,
  scale = 1,
  onClick,
  isHighlighted = false,
  isDraggable = false,
  dragConstraints,
  registerPosition,
  className = ''
}, ref) => {
  // Create an internal ref that we'll use for position tracking
  const internalRef = useRef<HTMLDivElement>(null);
  
  // Extract card data regardless of whether it's a CardInstance or CardData
  const cardData = 'card' in card ? card.card : card;
  
  // State for monitoring current position
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // Apply rendering system fixes
  useEffect(() => {
    fixCardRenderingIssues();
    
    // Mark this component as using the standard renderer
    if (internalRef?.current) {
      internalRef.current.setAttribute('data-using-renderer', ACTIVE_CARD_RENDERER);
    }
  }, []);
  
  // Update position when the card moves (for tracking in hand)
  useEffect(() => {
    if (internalRef.current && registerPosition) {
      const rect = internalRef.current.getBoundingClientRect();
      const newPosition = { 
        x: rect.left + rect.width / 2, 
        y: rect.top + rect.height / 2 
      };
      
      // Only update if the position actually changed
      if (newPosition.x !== position.x || newPosition.y !== position.y) {
        setPosition(newPosition);
        
        // For card instances, register the position with the parent
        if ('card' in card && 'instanceId' in card) {
          registerPosition(card as CardInstance, newPosition);
        }
      }
    }
  }, [card, registerPosition, position]);
  
  // Detect keywords and special abilities
  const hasKeywords = !!(
    cardData.keywords?.length ||
    cardData.description?.match(/(Battlecry|Deathrattle|Taunt|Foresee|Adapt|Frenzy|Inspire|Reborn|Spellburst)/i)
  );
  
  // Get the rarity class for styling
  const getRarityClass = () => {
    if (!cardData.rarity) return 'common';
    return cardData.rarity.toLowerCase();
  };
  
  // Extract card type flags
  const hasTaunt = cardData.keywords?.includes('taunt') || false;
  const isPoisonous = cardData.keywords?.includes('poisonous') || false;
  const hasLifesteal = cardData.keywords?.includes('lifesteal') || false;
  const isRush = cardData.keywords?.includes('rush') || false;
  
  // Responsive card sizing using aspect-ratio (standard card ratio: 230/342)
  
  return (
    <motion.div
      ref={(node) => {
        (internalRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      }}
      className={`enhanced-card relative cursor-pointer ${className} ${cardData.type || 'minion'} ${getRarityClass()} ${hasKeywords ? 'has-keywords' : ''} has-3d-card`}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        if (onClick) onClick();
      }}
      animate={{ scale: isHighlighted ? 1.08 : 1 }}
      whileHover={{ scale: isPlayable ? 1.08 : 1 }}
      drag={isDraggable}
      dragConstraints={dragConstraints}
      style={{
        width: isInHand ? '100px' : '120px',
        aspectRatio: '230 / 342',
        height: 'auto',
        maxHeight: isInHand ? '140px' : '200px',
        transformOrigin: 'center bottom',
        opacity: 1,
        transform: 'translateZ(0)',
        zIndex: isHighlighted ? 10 : 1,
      }}
    >
      {/* Use CardRenderer for pure card rendering */}
      <div className="absolute inset-0 z-50">
        <CardRenderer 
          card={card}
          isInHand={isInHand}
          isPlayable={isPlayable}
          isHighlighted={isHighlighted}
          scale={scale}
          onClick={onClick}
          use3D={true}
          className="premium-card"
          renderQuality="high"
          enableHolographic={true}
          forceHolographic={cardData.rarity === 'mythic' || cardData.rarity === 'epic'}
        />
      </div>
            
      {/* Apply Norse themed frame around the card */}
      <NorseFrame
        rarity={cardData.rarity || 'common'}
        cardType={cardData.type || 'minion'}
        hasKeywords={hasKeywords}
        isGolden={!!(cardData as any).premium}
        heroClass={cardData.class || cardData.heroClass || 'neutral'}
      >
        {/* Card effects go here */}
        {hasTaunt && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="absolute inset-0 border-4 border-yellow-700 rounded-lg shadow-[inset_0_0_8px_rgba(180,140,20,0.5)]">
            </div>
          </div>
        )}
        
        {isPoisonous && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="absolute inset-0 border-2 border-green-500 rounded-lg shadow-[0_0_8px_rgba(0,255,0,0.6)]">
            </div>
          </div>
        )}
        
        {hasLifesteal && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="absolute inset-0 border-2 border-purple-500 rounded-lg shadow-[0_0_8px_rgba(128,0,255,0.6)]">
            </div>
          </div>
        )}
        
        {isRush && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="absolute inset-0 border-2 border-red-500 rounded-lg shadow-[0_0_8px_rgba(255,0,0,0.6)]">
            </div>
          </div>
        )}
      </NorseFrame>
    </motion.div>
  );
});

EnhancedCard.displayName = 'EnhancedCard';

export default EnhancedCard;