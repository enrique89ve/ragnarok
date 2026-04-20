import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUnifiedCombatStore } from '../../stores/unifiedCombatStore';
import { debug } from '../../config/debugConfig';

interface FirstStrikeAnimationProps {
  onComplete: () => void;
}

export const FirstStrikeAnimation: React.FC<FirstStrikeAnimationProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'charge' | 'strike' | 'damage' | 'done'>('charge');
  const firstStrike = useUnifiedCombatStore(state => state.pokerCombatState?.firstStrike);
  const playerName = useUnifiedCombatStore(state => state.pokerCombatState?.player.playerName);
  const opponentName = useUnifiedCombatStore(state => state.pokerCombatState?.opponent.playerName);
  
  const target = firstStrike?.target;
  const damage = firstStrike?.damage ?? 15;
  const attackerName = target === 'player' ? opponentName : playerName;
  const defenderName = target === 'player' ? playerName : opponentName;

  useEffect(() => {
    if (!firstStrike || firstStrike.completed) {
      onComplete();
      return;
    }

    debug.animation('[FirstStrike] Animation starting, target:', target, 'damage:', damage);
    setPhase('charge');
    
    const chargeTimer = setTimeout(() => {
      debug.animation('[FirstStrike] Phase: strike');
      setPhase('strike');
    }, 600);
    const strikeTimer = setTimeout(() => {
      debug.animation('[FirstStrike] Phase: damage');
      setPhase('damage');
    }, 1200);
    const doneTimer = setTimeout(() => {
      debug.animation('[FirstStrike] Animation complete, calling onComplete');
      setPhase('done');
      onComplete();
    }, 2200);

    return () => {
      clearTimeout(chargeTimer);
      clearTimeout(strikeTimer);
      clearTimeout(doneTimer);
    };
  // Include target and damage to restart animation on new combat, but not onComplete
  }, [firstStrike?.completed, firstStrike?.target, firstStrike?.damage]);

  if (!firstStrike || firstStrike.completed) {
    return null;
  }

  return (
    <div className="first-strike-overlay" style={{
      position: 'absolute',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(20,10,10,0.5))'
    }}>
      <AnimatePresence>
        {phase === 'charge' && (
          <motion.div
            key="charge"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.4 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            <motion.div
              animate={{ 
                textShadow: ['0 0 10px #ff4444', '0 0 30px #ff6666', '0 0 10px #ff4444']
              }}
              transition={{ duration: 0.5, repeat: Infinity }}
              style={{
                fontSize: '2.5rem',
                fontWeight: 'bold',
                color: '#ff4444',
                fontFamily: 'var(--font-norse, serif)',
                textTransform: 'uppercase',
                letterSpacing: '4px'
              }}
            >
              ⚔ First Strike!
            </motion.div>
            <div style={{
              fontSize: '1.2rem',
              color: '#ffd700',
              fontFamily: 'var(--font-norse, serif)'
            }}>
              {attackerName} attacks {defenderName}
            </div>
          </motion.div>
        )}

        {phase === 'strike' && (
          <motion.div
            key="strike"
            initial={{ x: target === 'player' ? 200 : -200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              fontSize: '6rem',
              filter: 'drop-shadow(0 0 20px rgba(255, 100, 100, 0.8))'
            }}
          >
            ⚔
          </motion.div>
        )}

        {phase === 'damage' && (
          <motion.div
            key="damage"
            initial={{ opacity: 0, scale: 2 }}
            animate={{ opacity: 1, scale: 1, y: [0, -20, 0] }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'absolute',
              [target === 'player' ? 'left' : 'right']: '25%',
              top: '40%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.3, repeat: 2 }}
              style={{
                fontSize: '4rem',
                fontWeight: 'bold',
                color: '#ff3333',
                textShadow: '0 0 20px rgba(255, 50, 50, 0.8), 2px 2px 0 #000',
                fontFamily: 'var(--font-norse, serif)'
              }}
            >
              -{damage}
            </motion.div>
            <div style={{
              fontSize: '1rem',
              color: '#ff6666',
              textTransform: 'uppercase',
              letterSpacing: '2px'
            }}>
              Surprise Attack!
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FirstStrikeAnimation;
