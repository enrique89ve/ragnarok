/**
 * AnimationOverlay.tsx
 * 
 * A unified portal-based animation overlay that renders all position-sensitive
 * effects outside of transformed containers. This ensures correct fixed positioning
 * relative to the viewport regardless of parent transforms.
 * 
 * This component consolidates rendering for:
 * - Summon effects
 * - Damage indicators
 * - Heal effects
 * - Attack trails
 * - Buff/debuff indicators
 */

import React, { useMemo, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnimationOrchestrator, AnimationEffect, AnimationCategory } from '../animations/UnifiedAnimationOrchestrator';

interface ParticleConfig {
  angle: number;
  distance: number;
  delay: number;
  size: number;
}

const rarityColors: Record<string, { primary: string; secondary: string; glow: string }> = {
  common: { primary: '#9d9d9d', secondary: '#c4c4c4', glow: 'rgba(157, 157, 157, 0.6)' },
  rare: { primary: '#0070dd', secondary: '#4da6ff', glow: 'rgba(0, 112, 221, 0.6)' },
  epic: { primary: '#a335ee', secondary: '#c77dff', glow: 'rgba(163, 53, 238, 0.6)' },
  legendary: { primary: '#ff8000', secondary: '#ffb347', glow: 'rgba(255, 128, 0, 0.8)' },
};

const generateParticleConfigs = (count: number, isLegendary: boolean): ParticleConfig[] => {
  const configs: ParticleConfig[] = [];
  for (let i = 0; i < count; i++) {
    configs.push({
      angle: (i / count) * 360,
      distance: isLegendary ? 150 : 100,
      delay: i * 0.02,
      size: isLegendary ? 12 : 8,
    });
  }
  return configs;
};

const MemoizedParticleConfigs = {
  common: generateParticleConfigs(8, false),
  rare: generateParticleConfigs(8, false),
  epic: generateParticleConfigs(12, false),
  legendary: generateParticleConfigs(16, true),
};

const SummonEffectRenderer: React.FC<{ effect: AnimationEffect }> = React.memo(({ effect }) => {
  const { position, data } = effect;
  const rarity = data.rarity || 'common';
  const colors = rarityColors[rarity] || rarityColors.common;
  const isLegendary = rarity === 'mythic';
  const isEpic = rarity === 'epic';
  
  const particleConfigs = useMemo(() => 
    MemoizedParticleConfigs[rarity as keyof typeof MemoizedParticleConfigs] || MemoizedParticleConfigs.common,
    [rarity]
  );

  if (!position) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9500, /* --z-cinematic */
      }}
    >
      <motion.div
        initial={{ scale: 0.2, opacity: 1 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          width: 100,
          height: 100,
          left: -50,
          top: -50,
          borderRadius: '50%',
          border: `4px solid ${colors.primary}`,
          boxShadow: `0 0 30px ${colors.glow}, inset 0 0 20px ${colors.glow}`,
        }}
      />

      {(isLegendary || isEpic) && (
        <motion.div
          initial={{ scale: 0.3, opacity: 0.8 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
          style={{
            position: 'absolute',
            width: 80,
            height: 80,
            left: -40,
            top: -40,
            borderRadius: '50%',
            border: `2px solid ${colors.secondary}`,
            boxShadow: `0 0 20px ${colors.glow}`,
          }}
        />
      )}

      {particleConfigs.map((config, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{
            x: Math.cos(config.angle * Math.PI / 180) * config.distance,
            y: Math.sin(config.angle * Math.PI / 180) * config.distance,
            scale: 0,
            opacity: 0,
          }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: config.delay }}
          style={{
            position: 'absolute',
            width: config.size,
            height: config.size,
            left: -config.size / 2,
            top: -config.size / 2,
            borderRadius: '50%',
            background: colors.primary,
            boxShadow: `0 0 8px ${colors.glow}`,
          }}
        />
      ))}

      <motion.div
        initial={{ scale: 0.5, opacity: 0.8 }}
        animate={{ scale: [0.5, 1.5, 0.8], opacity: [0.8, 0.4, 0] }}
        transition={{ duration: 0.6, times: [0, 0.5, 1] }}
        style={{
          position: 'absolute',
          width: 60,
          height: 60,
          left: -30,
          top: -30,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.primary}80 0%, transparent 70%)`,
        }}
      />
    </motion.div>
  );
});

SummonEffectRenderer.displayName = 'SummonEffectRenderer';

const DamageEffectRenderer: React.FC<{ effect: AnimationEffect }> = React.memo(({ effect }) => {
  const { position, data } = effect;
  const damage = data.damage || 0;

  if (!position) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 1.5 }}
      animate={{ opacity: 1, y: -30, scale: 1 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.8 }}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9998,
      }}
    >
      <div
        style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#ff4444',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(255,0,0,0.5)',
        }}
      >
        -{damage}
      </div>
    </motion.div>
  );
});

DamageEffectRenderer.displayName = 'DamageEffectRenderer';

const HealEffectRenderer: React.FC<{ effect: AnimationEffect }> = React.memo(({ effect }) => {
  const { position, data } = effect;
  const amount = data.amount || 0;

  if (!position) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 1.5 }}
      animate={{ opacity: 1, y: -30, scale: 1 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.8 }}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9998,
      }}
    >
      <div
        style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#44ff44',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,255,0,0.5)',
        }}
      >
        +{amount}
      </div>
    </motion.div>
  );
});

HealEffectRenderer.displayName = 'HealEffectRenderer';

const AttackEffectRenderer: React.FC<{ effect: AnimationEffect }> = React.memo(({ effect }) => {
  const { sourcePosition, targetPosition } = effect;

  if (!sourcePosition || !targetPosition) return null;

  const dx = targetPosition.x - sourcePosition.x;
  const dy = targetPosition.y - sourcePosition.y;

  return (
    <motion.div
      initial={{ x: 0, y: 0, opacity: 1 }}
      animate={{ x: dx, y: dy, opacity: [1, 1, 0] }}
      transition={{ duration: 0.4, ease: 'easeInOut', times: [0, 0.8, 1] }}
      style={{
        position: 'fixed',
        left: sourcePosition.x,
        top: sourcePosition.y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9997,
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ff6b6b, #ee5a5a)',
          boxShadow: '0 0 15px rgba(255, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: 'white', fontSize: '14px' }}>⚔</span>
      </div>
    </motion.div>
  );
});

AttackEffectRenderer.displayName = 'AttackEffectRenderer';

const SpellEffectRenderer: React.FC<{ effect: AnimationEffect }> = React.memo(({ effect }) => {
  const { data } = effect;
  const spellName = data.spellName || 'Spell';
  const description = data.description || '';
  const spellType = data.spellType || 'damage';
  
  const spellColors: Record<string, { bg: string; border: string; glow: string; icon: string }> = {
    damage: { bg: 'rgba(255, 68, 68, 0.95)', border: '#ff6b6b', glow: 'rgba(255, 0, 0, 0.6)', icon: '🔥' },
    heal: { bg: 'rgba(68, 255, 68, 0.95)', border: '#6bff6b', glow: 'rgba(0, 255, 0, 0.6)', icon: '💚' },
    buff: { bg: 'rgba(255, 215, 0, 0.95)', border: '#ffd700', glow: 'rgba(255, 215, 0, 0.6)', icon: '⬆️' },
    debuff: { bg: 'rgba(128, 0, 128, 0.95)', border: '#9932cc', glow: 'rgba(128, 0, 128, 0.6)', icon: '⬇️' },
    summon: { bg: 'rgba(0, 191, 255, 0.95)', border: '#00bfff', glow: 'rgba(0, 191, 255, 0.6)', icon: '✨' },
    aoe: { bg: 'rgba(255, 140, 0, 0.95)', border: '#ff8c00', glow: 'rgba(255, 140, 0, 0.6)', icon: '💥' },
    draw: { bg: 'rgba(100, 149, 237, 0.95)', border: '#6495ed', glow: 'rgba(100, 149, 237, 0.6)', icon: '📜' },
    quest: { bg: 'rgba(218, 165, 32, 0.95)', border: '#daa520', glow: 'rgba(218, 165, 32, 0.6)', icon: '🏆' },
    transform: { bg: 'rgba(147, 112, 219, 0.95)', border: '#9370db', glow: 'rgba(147, 112, 219, 0.6)', icon: '🔄' },
    default: { bg: 'rgba(70, 130, 180, 0.95)', border: '#4682b4', glow: 'rgba(70, 130, 180, 0.6)', icon: '✨' },
  };
  
  const colors = spellColors[spellType] || spellColors.default;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -30 }}
      transition={{ 
        duration: 0.4, 
        ease: [0.25, 0.1, 0.25, 1],
        scale: { type: 'spring', stiffness: 300, damping: 20 }
      }}
      style={{
        position: 'fixed',
        left: '50%',
        top: '35%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 10001,
      }}
    >
      <motion.div
        initial={{ boxShadow: `0 0 30px ${colors.glow}` }}
        animate={{ 
          boxShadow: [
            `0 0 30px ${colors.glow}`,
            `0 0 60px ${colors.glow}`,
            `0 0 30px ${colors.glow}`
          ]
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{
          background: `linear-gradient(135deg, ${colors.bg}, rgba(20, 20, 40, 0.95))`,
          border: `3px solid ${colors.border}`,
          borderRadius: '16px',
          padding: '20px 40px',
          minWidth: '300px',
          maxWidth: '450px',
          textAlign: 'center',
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 0.5, times: [0, 0.6, 1] }}
          style={{
            fontSize: '48px',
            marginBottom: '8px',
          }}
        >
          {colors.icon}
        </motion.div>
        
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            color: '#ffffff',
            fontSize: '28px',
            fontWeight: 'bold',
            margin: '0 0 8px 0',
            textShadow: `2px 2px 4px rgba(0,0,0,0.8), 0 0 20px ${colors.glow}`,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {spellName}
        </motion.h2>
        
        {description && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            style={{
              color: '#e0e0e0',
              fontSize: '16px',
              margin: 0,
              textShadow: '1px 1px 2px rgba(0,0,0,0.6)',
              lineHeight: 1.4,
            }}
          >
            {description}
          </motion.p>
        )}
      </motion.div>
      
      <motion.div
        initial={{ scale: 0, opacity: 0.8 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 100,
          height: 100,
          marginLeft: -50,
          marginTop: -50,
          borderRadius: '50%',
          border: `3px solid ${colors.border}`,
          pointerEvents: 'none',
        }}
      />
    </motion.div>
  );
});

SpellEffectRenderer.displayName = 'SpellEffectRenderer';

const ShuffleEffectRenderer: React.FC<{ effect: AnimationEffect }> = React.memo(({ effect }) => {
  const { data } = effect;
  const cardCount = data.cardCount || 10;
  const heroName = data.heroName || 'Hero';
  const targetPosition = data.targetPosition || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const sourcePosition = data.sourcePosition || { x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 };

  const cardConfigs = useMemo(() => {
    const configs = [];
    for (let i = 0; i < cardCount; i++) {
      configs.push({
        delay: i * 0.08,
        rotation: (Math.random() - 0.5) * 30,
        offsetX: (Math.random() - 0.5) * 40,
        offsetY: (Math.random() - 0.5) * 20,
      });
    }
    return configs;
  }, [cardCount]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9998,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute',
          left: '50%',
          top: '30%',
          transform: 'translateX(-50%)',
          color: '#ffd700',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          textShadow: '0 0 10px rgba(255, 215, 0, 0.8), 0 2px 4px rgba(0,0,0,0.5)',
          textAlign: 'center',
        }}
      >
        {heroName}'s cards joining the deck!
      </motion.div>

      {cardConfigs.map((config, i) => (
        <motion.div
          key={i}
          initial={{ 
            x: sourcePosition.x + config.offsetX, 
            y: sourcePosition.y + config.offsetY,
            rotate: config.rotation,
            scale: 1,
            opacity: 1 
          }}
          animate={{ 
            x: targetPosition.x,
            y: targetPosition.y,
            rotate: 360 + config.rotation,
            scale: 0.3,
            opacity: 0
          }}
          transition={{ 
            duration: 0.6, 
            delay: config.delay,
            ease: 'easeInOut'
          }}
          style={{
            position: 'absolute',
            width: 60,
            height: 84,
            background: 'linear-gradient(135deg, #2a1a4a 0%, #1a0a2e 50%, #3d2066 100%)',
            borderRadius: 6,
            border: '2px solid #8b5cf6',
            boxShadow: '0 0 15px rgba(139, 92, 246, 0.6), inset 0 0 10px rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #8b5cf6 0%, #6d28d9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
          }}>
            ⚔️
          </div>
        </motion.div>
      ))}

      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0] }}
        transition={{ duration: 0.8, delay: cardCount * 0.08 + 0.3, times: [0, 0.5, 1] }}
        style={{
          position: 'absolute',
          left: targetPosition.x,
          top: targetPosition.y,
          transform: 'translate(-50%, -50%)',
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.6) 0%, transparent 70%)',
          boxShadow: '0 0 40px rgba(139, 92, 246, 0.8)',
        }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.5, delay: cardCount * 0.08 + 0.5 }}
        style={{
          position: 'absolute',
          left: targetPosition.x,
          top: targetPosition.y + 80,
          transform: 'translateX(-50%)',
          color: '#a78bfa',
          fontSize: '1rem',
          fontWeight: 'bold',
          textShadow: '0 0 8px rgba(167, 139, 250, 0.8)',
        }}
      >
        +{cardCount} cards shuffled!
      </motion.div>
    </motion.div>
  );
});

ShuffleEffectRenderer.displayName = 'ShuffleEffectRenderer';

const EffectRenderer: React.FC<{ effect: AnimationEffect }> = ({ effect }) => {
  switch (effect.category) {
    case 'summon':
      return <SummonEffectRenderer effect={effect} />;
    case 'damage':
      return <DamageEffectRenderer effect={effect} />;
    case 'heal':
      return <HealEffectRenderer effect={effect} />;
    case 'attack':
      return <AttackEffectRenderer effect={effect} />;
    case 'spell':
      return <SpellEffectRenderer effect={effect} />;
    case 'shuffle':
      return <ShuffleEffectRenderer effect={effect} />;
    default:
      return null;
  }
};

const RENDERED_CATEGORIES: AnimationCategory[] = ['summon', 'damage', 'heal', 'attack', 'spell', 'shuffle'];

export const AnimationOverlay: React.FC = () => {
  const [activeEffects, setActiveEffects] = useState<AnimationEffect[]>([]);
  
  useEffect(() => {
    const getFilteredEffects = (state: { activeEffects: Map<string, AnimationEffect> }): AnimationEffect[] => {
      const effects: AnimationEffect[] = [];
      state.activeEffects.forEach(e => {
        if (RENDERED_CATEGORIES.includes(e.category)) {
          effects.push(e);
        }
      });
      return effects;
    };
    
    setActiveEffects(getFilteredEffects(useAnimationOrchestrator.getState()));
    
    const unsubscribe = useAnimationOrchestrator.subscribe(state => {
      const newEffects = getFilteredEffects(state);
      setActiveEffects(prev => {
        if (prev.length !== newEffects.length) return newEffects;
        for (let i = 0; i < prev.length; i++) {
          if (prev[i].id !== newEffects[i].id) return newEffects;
        }
        return prev;
      });
    });
    
    return unsubscribe;
  }, []);

  const overlayContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9990,
        overflow: 'hidden',
      }}
    >
      <AnimatePresence mode="sync">
        {activeEffects.map(effect => (
          <EffectRenderer key={effect.id} effect={effect} />
        ))}
      </AnimatePresence>
    </div>
  );

  return ReactDOM.createPortal(overlayContent, document.body);
};

export default AnimationOverlay;
