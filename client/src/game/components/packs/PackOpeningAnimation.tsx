import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { routes } from '../../../lib/routes';
import { getRarityColor, getRarityBorder, getRarityGlow, getRarityBackground, getTypeIcon } from '../../utils/rarityUtils';
import { getCardArtPath } from '../../utils/art/artMapping';
import TreasureChestSVG from './TreasureChestSVG';

interface RevealedCard {
  id: number;
  name: string;
  rarity: string;
  type: string;
  heroClass: string;
  imageUrl?: string;
}

interface PackOpeningAnimationProps {
  packName: string;
  cards: RevealedCard[];
  onClose: () => void;
  onOpenAnother: () => void;
}

export default function PackOpeningAnimation({
  packName,
  cards,
  onClose,
  onOpenAnother
}: PackOpeningAnimationProps) {
  const [phase, setPhase] = useState<'intro' | 'opening' | 'reveal' | 'complete'>('intro');
  const [currentCardIndex, setCurrentCardIndex] = useState(-1);
  const [showAllCards, setShowAllCards] = useState(false);

  useEffect(() => {
    const introTimer = setTimeout(() => setPhase('opening'), 1000);
    const openingTimer = setTimeout(() => {
      setPhase('reveal');
      setCurrentCardIndex(0);
    }, 2500);

    return () => {
      clearTimeout(introTimer);
      clearTimeout(openingTimer);
    };
  }, []);

  useEffect(() => {
    if (phase === 'reveal' && currentCardIndex >= 0 && currentCardIndex < cards.length && !showAllCards) {
      const timer = setTimeout(() => {
        if (currentCardIndex < cards.length - 1) {
          setCurrentCardIndex(currentCardIndex + 1);
        } else {
          setPhase('complete');
          setShowAllCards(true);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [phase, currentCardIndex, cards.length, showAllCards]);

  const handleSkipToResults = () => {
    setShowAllCards(true);
    setPhase('complete');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl z-50"
      >
        ✕
      </button>

      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            className="text-center"
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="mb-4 flex justify-center"
            >
              <TreasureChestSVG state="closed" size={240} />
            </motion.div>
            <h2 className="text-3xl font-bold text-white">{packName}</h2>
          </motion.div>
        )}

        {phase === 'opening' && (
          <motion.div
            key="opening"
            className="relative flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 1 }}
              animate={{
                scale: [1, 1.05, 1.1, 1.15, 0],
              }}
              transition={{ duration: 1.5 }}
              className="relative"
            >
              <TreasureChestSVG state="open" size={280} />
            </motion.div>

            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 3], opacity: [1, 0] }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="absolute inset-0 bg-amber-500/30 rounded-full"
            />

            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{
                  x: Math.cos(i * 18 * Math.PI / 180) * 200,
                  y: Math.sin(i * 18 * Math.PI / 180) * 200,
                  opacity: 0,
                  scale: 0
                }}
                transition={{ delay: 1.3, duration: 0.6 }}
                className="absolute left-1/2 top-1/2 w-4 h-4 bg-amber-400 rounded-full"
                style={{ boxShadow: '0 0 20px rgba(251,191,36,0.8)' }}
              />
            ))}
          </motion.div>
        )}

        {(phase === 'reveal' || phase === 'complete') && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-6xl px-8"
          >
            <motion.h2
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-3xl font-bold text-center text-amber-400 mb-8"
            >
              {phase === 'complete' ? 'Your Cards!' : 'Revealing...'}
            </motion.h2>

            {phase === 'reveal' && !showAllCards && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center mb-6"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSkipToResults}
                  className="px-6 py-2 bg-gray-700/80 hover:bg-gray-600 text-white rounded-lg border border-gray-500 transition-all"
                >
                  Skip to Results →
                </motion.button>
              </motion.div>
            )}

            <div className="flex flex-wrap justify-center gap-4">
              {cards.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ rotateY: 180, scale: 0.5, opacity: 0 }}
                  animate={
                    (showAllCards || index <= currentCardIndex)
                      ? { rotateY: 0, scale: 1, opacity: 1 }
                      : { rotateY: 180, scale: 0.5, opacity: 0 }
                  }
                  transition={{
                    duration: 0.6,
                    delay: showAllCards ? index * 0.1 : 0,
                    type: 'spring',
                    stiffness: 100
                  }}
                  className={`relative w-40 h-56 rounded-xl border-2 ${getRarityBorder(card.rarity)} ${getRarityGlow(card.rarity)} ${getRarityBackground(card.rarity)} overflow-hidden`}
                  style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
                >
                  <div className="absolute inset-0 p-3 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-2xl">{getTypeIcon(card.type)}</span>
                      <span className={`text-xs font-bold uppercase ${getRarityColor(card.rarity)}`}>
                        {card.rarity}
                      </span>
                    </div>

                    <div className="flex-1 flex items-center justify-center">
                      <div className="w-28 h-28 rounded-lg bg-black/30 border border-white/20 overflow-hidden">
                        {(() => {
                          const artPath = getCardArtPath(card.name, card.id);
                          return artPath ? (
                            <img src={artPath} alt={card.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-4xl">{getTypeIcon(card.type)}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="mt-auto text-center">
                      <h3 className="text-sm font-bold text-white truncate">{card.name}</h3>
                      <p className="text-xs text-gray-400 capitalize">{card.heroClass}</p>
                    </div>
                  </div>

                  {card.rarity === 'mythic' && (
                    <motion.div
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-transparent pointer-events-none"
                    />
                  )}

                  {card.rarity === 'mythic' && (
                    <motion.div
                      animate={{
                        background: [
                          'linear-gradient(45deg, rgba(236,72,153,0.2), transparent)',
                          'linear-gradient(180deg, rgba(139,92,246,0.2), transparent)',
                          'linear-gradient(315deg, rgba(34,211,238,0.2), transparent)',
                          'linear-gradient(45deg, rgba(236,72,153,0.2), transparent)',
                        ]
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute inset-0 pointer-events-none"
                    />
                  )}
                </motion.div>
              ))}
            </div>

            {phase === 'complete' && (
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex justify-center gap-4 mt-8"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onOpenAnother}
                  className="px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-900/30"
                >
                  Open Another Pack
                </motion.button>
                
                <Link to={routes.collection}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/30"
                  >
                    View Collection
                  </motion.button>
                </Link>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-all"
                >
                  Close
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
