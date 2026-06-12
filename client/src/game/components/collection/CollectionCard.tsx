import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardData } from '../../types';
import SimpleCardCompat from '../card/SimpleCardCompat';
import { toSimpleCardData } from '../card/cardDataAdapter';
import { UnifiedCard, extractCardData } from '../../utils/cards/cardTypeAdapter';

const GLOW_COLORS = {
  common: 'rgba(255, 255, 255, 0.7)',
  rare: 'rgba(0, 112, 221, 0.7)',
  epic: 'rgba(163, 53, 238, 0.7)',
  mythic: 'rgba(255, 128, 0, 0.7)'
};
const NOOP_ADD = () => { };
const NOOP_DETAILS = () => { };
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
      className="collection-card collection-grid-item relative min-h-[240px] min-w-[180px] h-full block bg-linear-to-b from-gray-800 to-gray-900 rounded-lg shadow-lg"
      style={{ aspectRatio: '5 / 7' }}
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
        <div className="w-full h-full">
          {(() => {
            const simpleData = toSimpleCardData(cardData);
            if (!simpleData) return null;
            return (
              <SimpleCardCompat
                card={simpleData}
                isPlayable={canAdd && count < maxCount}
                size="large"
              />
            );
          })()}
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
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-10">
            <div className="bg-red-600 text-white px-3 py-1 rounded-full font-bold transform -rotate-12 shadow-lg">
              Max Copies
            </div>
          </div>
        )}

        {/* "Can't add due to deck full" indicator */}
        {!canAdd && count < maxCount && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-10">
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
