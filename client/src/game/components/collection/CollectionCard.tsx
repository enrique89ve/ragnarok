import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardData } from '../../types';
import { CardRenderer } from '../CardRenderer';
import { UnifiedCard, extractCardData } from '../../utils/cards/cardTypeAdapter';
import { getCardArtPath } from '../../utils/art/artMapping';

const GLOW_COLORS = {
  common: 'rgba(255, 255, 255, 0.7)',
  rare: 'rgba(0, 112, 221, 0.7)',
  epic: 'rgba(163, 53, 238, 0.7)',
  mythic: 'rgba(255, 128, 0, 0.7)'
};
const NOOP_ADD = () => {};
const NOOP_DETAILS = () => {};
const HOVER_ANIMATION = { scale: 1.05, y: -8, transition: { duration: 0.2 } };
const TRANSITION = { duration: 0.2 };

interface CollectionCardProps {
  card: UnifiedCard;
  count?: number;
  maxCount?: number;
  onAdd?: (cardId: number) => void;
  canAdd?: boolean;
  showCardDetails?: (card: CardData) => void;
}

/**
 * CollectionCard - A card component for the collection view with hover effects and count indicator
 * Uses the Premium 3D card rendering system and supports both CardData and CardInstanceWithCardData
 */
const CollectionCard: React.FC<CollectionCardProps> = React.memo(({
  card,
  count = 0,
  maxCount = 2,
  onAdd = NOOP_ADD,
  canAdd = false,
  showCardDetails = NOOP_DETAILS
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (animTimerRef.current) clearTimeout(animTimerRef.current); };
  }, []);

  const cardData = useMemo(() => extractCardData(card), [card]);
  const artPath = useMemo(() => getCardArtPath(cardData.name, cardData.id), [cardData.name, cardData.id]);

  const handleShowCardDetails = useCallback(() => {
    showCardDetails(cardData);
  }, [showCardDetails, cardData]);

  const handleClick = useCallback(() => {
    if (canAdd && count < maxCount) {
      setIsAnimating(true);
      onAdd(typeof cardData.id === 'number' ? cardData.id : parseInt(cardData.id as string, 10));

      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      animTimerRef.current = setTimeout(() => {
        setIsAnimating(false);
        animTimerRef.current = null;
      }, 500);
    } else {
      handleShowCardDetails();
    }
  }, [canAdd, count, maxCount, onAdd, cardData, handleShowCardDetails]);

  const handleRightClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleShowCardDetails();
  }, [handleShowCardDetails]);
  
  return (
    <motion.div
      className="collection-card collection-grid-item relative min-h-[240px] min-w-[180px] h-full block bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      onContextMenu={handleRightClick}
      whileHover={HOVER_ANIMATION}
      animate={{
        filter: isAnimating ? 'brightness(1.5)' : 'brightness(1)'
      }}
      transition={TRANSITION}
    >
      <div className="relative h-full w-full flex items-center justify-center p-3">
        <div className="w-full h-full" onClick={handleClick} onContextMenu={handleRightClick}>
          {artPath ? (
            <div className="relative w-full h-full rounded-lg overflow-hidden border border-gray-600">
              <img
                src={artPath}
                alt={cardData.name}
                className="w-full h-full object-cover"
                loading="lazy"
                draggable={false}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-2 py-1.5">
                <p className="text-white text-xs font-semibold truncate">{cardData.name}</p>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-blue-300 font-bold">{cardData.manaCost ?? '?'} mana</span>
                  {'attack' in cardData && 'health' in cardData && cardData.attack != null && cardData.health != null && (
                    <span className="text-gray-300">{cardData.attack}/{cardData.health}</span>
                  )}
                </div>
              </div>
              {(cardData.rarity === 'mythic' || cardData.rarity === 'epic') && (
                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold"
                  style={{
                    background: cardData.rarity === 'mythic' ? 'rgba(255,128,0,0.8)' : 'rgba(163,53,238,0.8)',
                    color: 'white'
                  }}
                >
                  {cardData.rarity === 'mythic' ? 'MYTHIC' : 'EPIC'}
                </div>
              )}
            </div>
          ) : (
            <CardRenderer
              card={cardData}
              enableHolographic={true}
              forceHolographic={cardData.rarity === 'mythic' || cardData.rarity === 'epic'}
              renderQuality="medium"
              isPlayable={canAdd && count < maxCount}
            />
          )}
        </div>
        
        {/* Card glow effect (CCG style) */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[-1] rounded-lg pointer-events-none"
              style={{
                boxShadow: `0 0 15px 2px ${cardData.rarity && GLOW_COLORS[cardData.rarity as keyof typeof GLOW_COLORS] || GLOW_COLORS.common}`,
                filter: 'blur(4px)'
              }}
            />
          )}
        </AnimatePresence>
        
        {/* Card count indicators (for cards already in deck) */}
        {count > 0 && (
          <div className="absolute top-2 right-2 flex flex-col items-center z-10">
            {[...Array(count)].map((_, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full bg-yellow-400 border-2 border-yellow-700 flex items-center justify-center text-yellow-900 font-bold shadow-lg -mt-2 first:mt-0"
              >
                {i + 1}
              </div>
            ))}
          </div>
        )}
        
        {/* "Can't add more" indicator */}
        {count >= maxCount && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg z-10">
            <div className="bg-red-600 text-white px-3 py-1 rounded-full font-bold transform -rotate-12 shadow-lg">
              Max Copies
            </div>
          </div>
        )}
        
        {/* "Can't add due to deck full" indicator */}
        {!canAdd && count < maxCount && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg z-10">
            <div className="bg-red-600 text-white px-3 py-1 rounded-full font-bold transform -rotate-12 shadow-lg">
              Deck Full
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default CollectionCard;