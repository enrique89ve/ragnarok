/**
 * AnimationLayer.tsx
 * 
 * A specialized component for rendering all game animations including:
 * - Attack animations with class-specific elemental trails
 * - Damage/healing effects
 * - Buff/debuff indicators
 * - Spells with environmental effects
 * - Card draw animations
 * - Death sequences
 * - Battlecry effects
 * - Turn transitions
 * - Mythic card entrances
 * 
 * This component sits above the game board and provides high-quality
 * visual feedback for all game actions.
 */

import React, { useEffect } from 'react';
import { Animation, useAnimationStore } from '../animations/AnimationManager';
import { motion, AnimatePresence } from 'framer-motion';
import './animation-layer.css';
import EnhancedDeathAnimation from '../animations/EnhancedDeathAnimation';
import ElementalAttackTrail from '../animations/ElementalAttackTrail';
import { spawnParticleBurst, spawnImpactRing, spawnEmbers, ELEMENT_PALETTES } from '../animations/PixiParticleCanvas';
import { playBattlecryVFX, playDeathrattleVFX, playBuffVFX, playSummonVFX, killAllVFX } from '../animations/BattlecryVFX';

// Animation components for different animation types
const AttackAnimation: React.FC<{ animation: Animation }> = ({ animation }) => {
  if (!animation.position) return null;
  
  const sourcePosition = animation.position;
  const targetPosition = animation.targetPosition || { x: 0, y: 0 };
  
  // Calculate the angle of attack for proper sword orientation
  const dx = targetPosition.x - sourcePosition.x;
  const dy = targetPosition.y - sourcePosition.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  
  // Get card class type for elemental trail (if available)
  const classType = animation.card?.class || 'Neutral';
  
  return (
    <>
      {/* Elemental attack trail based on card class */}
      <ElementalAttackTrail 
        sourcePosition={sourcePosition}
        targetPosition={targetPosition}
        classType={classType}
        duration={0.8}
      />
    
      {/* Main attack swoosh */}
      <motion.div
        style={{
          position: 'absolute',
          width: 70,
          height: 20,
          left: sourcePosition.x - 10,
          top: sourcePosition.y - 10,
          background: 'linear-gradient(90deg, rgba(255,0,0,0) 0%, rgba(255,215,0,0.8) 50%, rgba(255,255,255,1) 100%)',
          boxShadow: '0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 215, 0, 0.6)',
          borderRadius: '50%',
          transformOrigin: 'left center',
          transform: `rotate(${angle}deg)`,
          zIndex: 110
        }}
        animate={{
          x: [0, dx * 0.6],
          y: [0, dy * 0.6],
          opacity: [0, 1, 0],
          scale: [0.5, 1.2, 0.8]
        }}
        transition={{
          duration: animation.duration ? animation.duration / 1000 : 0.5,
          ease: "easeInOut",
          times: [0, 0.5, 1]
        }}
      />
      
      {/* Impact effect at target */}
      <motion.div
        style={{
          position: 'absolute',
          width: 50,
          height: 50,
          left: targetPosition.x - 25,
          top: targetPosition.y - 25,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,215,0,0.6) 50%, rgba(255,0,0,0.3) 100%)',
          zIndex: 105
        }}
        initial={{ opacity: 0, scale: 0.2 }}
        animate={{
          opacity: [0, 1, 0],
          scale: [0.2, 1.2, 0]
        }}
        transition={{
          duration: 0.4,
          ease: "easeOut",
          delay: animation.duration ? (animation.duration / 1000) * 0.5 : 0.3
        }}
      />
      
      {/* Sharp impact lines */}
      <motion.div
        style={{
          position: 'absolute',
          width: 60,
          height: 60,
          left: targetPosition.x - 30,
          top: targetPosition.y - 30,
          zIndex: 105
        }}
        initial={{ opacity: 0, scale: 0.2, rotate: 0 }}
        animate={{
          opacity: [0, 1, 0],
          scale: [0.2, 1, 0.8],
          rotate: 15
        }}
        transition={{
          duration: 0.3,
          ease: "easeOut",
          delay: animation.duration ? (animation.duration / 1000) * 0.6 : 0.35
        }}
      >
        {/* Create 4 impact lines in different directions */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 4,
              height: 25,
              backgroundColor: '#ffffff',
              marginLeft: -2,
              marginTop: -12.5,
              borderRadius: '2px',
              boxShadow: '0 0 5px rgba(255, 255, 255, 0.8)',
              transform: `rotate(${i * 45}deg) translateY(-15px)`
            }}
            animate={{
              scaleY: [0, 1, 0],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 0.3,
              delay: animation.duration ? (animation.duration / 1000) * 0.6 + (i * 0.03) : 0.35 + (i * 0.03),
              ease: "easeOut"
            }}
          />
        ))}
      </motion.div>
    </>
  );
};

const DamageAnimation: React.FC<{ animation: Animation }> = ({ animation }) => {
  if (!animation.position) return null;

  const damageValue = animation.damage !== undefined && animation.damage !== 0 ? animation.damage : 0;
  const showValue = damageValue > 0;
  const isCritical = damageValue >= 10;
  const intensity = animation.intensity;
  const isCritHit = isCritical || intensity === 'critical';

  useEffect(() => {
    if (animation.position) {
      const palette = isCritHit
        ? { primary: '#ff0000', secondary: '#ffd700', glow: 'rgba(255,0,0,0.8)' }
        : ELEMENT_PALETTES.fire;
      spawnParticleBurst(animation.position.x, animation.position.y, isCritHit ? 50 : 20, palette);
      if (isCritHit) {
        spawnImpactRing(animation.position.x, animation.position.y, palette);
      }
    }
  }, []);

  return (
    <>
      {/* Screen flash for critical hits */}
      {isCritHit && (
        <motion.div
          style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.25)', zIndex: 97, pointerEvents: 'none' }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Blood splatter background - larger for crits */}
      <motion.div
        style={{
          position: 'absolute',
          width: isCritHit ? 90 : 60,
          height: isCritHit ? 90 : 60,
          left: animation.position.x - (isCritHit ? 45 : 30),
          top: animation.position.y - (isCritHit ? 45 : 30),
          backgroundImage: isCritHit
            ? 'radial-gradient(circle, rgba(255,0,0,0.8) 0%, rgba(200,0,0,0.6) 30%, rgba(120,0,0,0) 70%)'
            : 'radial-gradient(circle, rgba(200,0,0,0.7) 0%, rgba(180,0,0,0.5) 40%, rgba(120,0,0,0) 70%)',
          borderRadius: '50%',
          boxShadow: isCritHit ? '0 0 40px rgba(255,0,0,0.5)' : 'none',
          zIndex: 99
        }}
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{
          scale: [0.2, isCritHit ? 1.8 : 1.4, 1],
          opacity: [0, 0.9, 0]
        }}
        transition={{
          duration: animation.duration ? animation.duration / 1000 : 0.8,
          ease: "anticipate"
        }}
      />

      {/* Damage value text - oversized for crits */}
      {showValue && (
        <motion.div
          style={{
            position: 'absolute',
            width: isCritHit ? 80 : 50,
            height: isCritHit ? 80 : 50,
            left: animation.position.x - (isCritHit ? 40 : 25),
            top: animation.position.y - (isCritHit ? 40 : 25),
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontWeight: 900,
            fontSize: isCritHit ? (damageValue > 9 ? '48px' : '56px') : (damageValue > 9 ? '28px' : '32px'),
            fontFamily: '"Helvetica Neue", Arial, sans-serif',
            color: isCritHit ? '#FFD700' : '#FFFFFF',
            textShadow: isCritHit
              ? '0 0 20px #FF0000, 0 0 40px #FF4400, 3px 3px 4px rgba(0,0,0,0.9)'
              : '0 0 8px #FF0000, 2px 2px 2px rgba(0,0,0,0.7)',
            zIndex: 101
          }}
          initial={{ scale: isCritHit ? 0.1 : 0.3, opacity: 0 }}
          animate={{
            scale: isCritHit ? [0.1, 1.6, 1.2] : [0.3, 1.3, 1],
            opacity: [0, 1, 0],
            y: isCritHit ? [10, -25, -45] : [5, -15, -30]
          }}
          transition={{
            duration: isCritHit ? 1.5 : (animation.duration ? animation.duration / 1000 : 1.2),
            ease: "easeOut"
          }}
        >
          -{damageValue}
        </motion.div>
      )}
      
      {/* Impact lines */}
      <motion.div
        style={{
          position: 'absolute',
          width: 70,
          height: 70,
          left: animation.position.x - 35,
          top: animation.position.y - 35,
          zIndex: 100
        }}
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{
          scale: [0.3, 1, 0.8],
          opacity: [0, 1, 0],
          rotate: [0, -10, 0]
        }}
        transition={{
          duration: animation.duration ? animation.duration / 1000 * 0.6 : 0.7,
          ease: "easeOut"
        }}
      >
        {/* Create 6 impact lines in red with varying angles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 3,
              height: 20 + Math.random() * 10,
              backgroundColor: '#FF0000',
              marginLeft: -1.5,
              marginTop: -15,
              borderRadius: '2px',
              boxShadow: '0 0 4px rgba(255, 0, 0, 0.7)',
              transform: `rotate(${i * 60 + (Math.random() * 10 - 5)}deg) translateY(-20px)`
            }}
            animate={{
              scaleY: [0, 1, 0.8, 0],
              opacity: [0, 1, 0.8, 0]
            }}
            transition={{
              duration: 0.5,
              delay: i * 0.03,
              ease: "easeOut"
            }}
          />
        ))}
      </motion.div>
      
      {/* Small blood droplets */}
      {showValue && damageValue > 2 && animation.position && [...Array(Math.min(damageValue, 8))].map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 30;
        return (
          <motion.div
            key={`drop-${i}`}
            style={{
              position: 'absolute',
              width: 4 + Math.random() * 4,
              height: 4 + Math.random() * 4,
              borderRadius: '50%',
              backgroundColor: '#FF0000',
              left: animation.position!.x,
              top: animation.position!.y,
              zIndex: 98
            }}
            animate={{
              x: [0, Math.cos(angle) * distance],
              y: [0, Math.sin(angle) * distance + 15],
              opacity: [0.9, 0],
              scale: [1, 0.5]
            }}
            transition={{
              duration: 0.6 + Math.random() * 0.3,
              ease: "easeOut"
            }}
          />
        );
      })}
    </>
  );
};

// Main AnimationLayer component
export const AnimationLayer: React.FC = () => {
  const { animations: legacyAnimations, removeAnimation } = useAnimationStore();
  
  // Clean up animations when component unmounts
  useEffect(() => {
    // Cleanup function to remove stale animations
    const cleanupStaleAnimations = () => {
      legacyAnimations.forEach(animation => {
        if (animation.endTime) return;
        
        const duration = animation.duration || 1000;
        const endTime = animation.startTime + duration;
        
        if (Date.now() > endTime) {
          removeAnimation(animation.id);
        }
      });
    };
    
    // Run immediately to clean up any existing stale animations
    cleanupStaleAnimations();
    
    // Then set interval for ongoing cleanup
    const intervalId = setInterval(cleanupStaleAnimations, 2000);
    
    // Clear all animations when component unmounts to prevent memory leaks
    return () => {
      clearInterval(intervalId);
      // Force cleanup of all animations on unmount
      useAnimationStore.getState().clearAnimations();
      // Kill all GSAP VFX timelines and remove orphaned DOM nodes
      killAllVFX();
    };
  }, []);
  
  return (
    <div className="animation-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <AnimatePresence>
        {/* Render legacy animations */}
        {legacyAnimations.map(animation => (
          <React.Fragment key={animation.id}>
            {animation.type === 'attack' && (
              <AttackAnimation animation={animation} />
            )}
            {animation.type === 'damage' && (
              <DamageAnimation animation={animation} />
            )}
            {(animation.type === 'death' || animation.type === 'enhanced_death') && (
              <DeathAnimation animation={animation} />
            )}
            {animation.type === 'spell_damage_popup' && (
              <SpellDamagePopup animation={animation} />
            )}
            {animation.type === 'card_burn' && (
              <CardBurnPopup animation={animation} />
            )}
            {animation.type === 'card_draw_notification' && (
              <CardDrawNotification animation={animation} />
            )}
            {animation.type === 'play' && animation.position && (
              <CardPlayEffect animation={animation} />
            )}
            {animation.type === 'battlecry' && animation.position && (
              <BattlecryEffect animation={animation} />
            )}
            {animation.type === 'deathrattle' && animation.position && (
              <DeathrattleEffect animation={animation} />
            )}
            {animation.type === 'summon' && animation.position && (
              <SummonEffect animation={animation} />
            )}
            {animation.type === 'buff' && animation.position && (
              <BuffEffect animation={animation} />
            )}
            {animation.type === 'pet_ascension' && animation.position && (
              <PetAscensionEffect animation={animation} />
            )}
            {animation.type === 'pet_apotheosis' && animation.position && (
              <PetApotheosisEffect animation={animation} />
            )}
            {animation.type === 'card_draw' && (
              <CardDrawEffect animation={animation} />
            )}
            {animation.type === 'mythic_entrance' && (
              <MythicEntranceEffect animation={animation} />
            )}
            {animation.type === 'spell_cast' && (
              <SpellCastEffect animation={animation} />
            )}
            {animation.type === 'game_start' && (
              <GameStartEffect animation={animation} />
            )}
            {animation.type === 'turn_start' && (
              <TurnStartEffect animation={animation} />
            )}
            {animation.type === 'victory' && (
              <VictoryEffect animation={animation} />
            )}
            {animation.type === 'defeat' && (
              <DefeatEffect animation={animation} />
            )}
          </React.Fragment>
        ))}
      </AnimatePresence>
    </div>
  );
};

// All necessary imports are now at the top of the file

// Spell Damage Popup - prominent notification with projectile
const SpellDamagePopup: React.FC<{ animation: Animation }> = ({ animation }) => {
  const damage = animation.damage || animation.value || 0;
  const spellName = animation.spellName || animation.card?.name || 'Spell';
  const targetName = animation.targetName || 'target';
  const sourcePos = animation.position;
  const targetPos = animation.targetPosition;
  const spellType = animation.spellType || animation.effect || '';

  const getSpellColor = () => {
    const t = (spellType || spellName || '').toLowerCase();
    if (t.includes('fire') || t.includes('flame')) return { main: '#ff5500', glow: 'rgba(255,85,0,0.7)' };
    if (t.includes('frost') || t.includes('ice')) return { main: '#00ccff', glow: 'rgba(0,204,255,0.7)' };
    if (t.includes('shadow') || t.includes('void')) return { main: '#7b1fa2', glow: 'rgba(123,31,162,0.7)' };
    if (t.includes('nature') || t.includes('earth')) return { main: '#4caf50', glow: 'rgba(76,175,80,0.7)' };
    if (t.includes('holy') || t.includes('light')) return { main: '#ffd700', glow: 'rgba(255,215,0,0.7)' };
    return { main: '#3b82f6', glow: 'rgba(59,130,246,0.7)' };
  };

  const color = getSpellColor();

  useEffect(() => {
    if (targetPos) {
      setTimeout(() => {
        const palette = { primary: color.main, secondary: '#ffffff', glow: color.glow };
        spawnParticleBurst(targetPos.x, targetPos.y, 35, palette);
        spawnImpactRing(targetPos.x, targetPos.y, palette);
      }, sourcePos ? 400 : 0);
    }
  }, []);

  return (
    <>
      {/* Spell projectile traveling from source to target */}
      {sourcePos && targetPos && (
        <motion.div
          style={{
            position: 'fixed',
            width: 20, height: 20,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color.main}, transparent)`,
            boxShadow: `0 0 20px ${color.glow}, 0 0 40px ${color.glow}`,
            zIndex: 200,
            pointerEvents: 'none'
          }}
          initial={{ left: sourcePos.x - 10, top: sourcePos.y - 10, scale: 0.5, opacity: 0 }}
          animate={{
            left: [sourcePos.x - 10, targetPos.x - 10],
            top: [sourcePos.y - 10, targetPos.y - 10],
            scale: [0.5, 1.2, 0.8],
            opacity: [0, 1, 0]
          }}
          transition={{ duration: 0.4, ease: 'easeIn' }}
        />
      )}
    <motion.div
      style={{
        position: 'fixed',
        top: '35%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9500 /* --z-cinematic */,
        pointerEvents: 'none'
      }}
      initial={{ opacity: 0, scale: 0.5, y: 20 }}
      animate={{ 
        opacity: [0, 1, 1, 1, 0],
        scale: [0.5, 1.1, 1, 1, 0.9],
        y: [20, 0, 0, 0, -20]
      }}
      transition={{ 
        duration: 3,
        times: [0, 0.1, 0.2, 0.85, 1],
        ease: "easeOut"
      }}
    >
      <div style={{
        background: 'linear-gradient(180deg, rgba(180, 40, 40, 0.95) 0%, rgba(120, 20, 20, 0.95) 100%)',
        border: '3px solid #fbbf24',
        borderRadius: '12px',
        padding: '16px 32px',
        boxShadow: '0 0 30px rgba(255, 100, 100, 0.6), 0 8px 32px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        minWidth: '280px'
      }}>
        {/* Damage value */}
        <div style={{
          fontSize: '48px',
          fontWeight: 800,
          color: '#ffffff',
          textShadow: '0 0 20px rgba(255, 50, 50, 0.8), 2px 2px 4px rgba(0, 0, 0, 0.8)',
          lineHeight: 1
        }}>
          {damage}
        </div>
        
        {/* Damage label */}
        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#fbbf24',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          marginTop: '4px'
        }}>
          DAMAGE
        </div>
        
        {/* Spell name */}
        <div style={{
          fontSize: '18px',
          fontWeight: 700,
          color: '#ffffff',
          marginTop: '8px',
          textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
        }}>
          from {spellName}
        </div>
        
        {/* Target */}
        {targetName && targetName !== 'target' && (
          <div style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.7)',
            marginTop: '4px'
          }}>
            → {targetName}
          </div>
        )}
      </div>
    </motion.div>
    </>
  );
};

const CardBurnPopup: React.FC<{ animation: Animation }> = ({ animation }) => {
  const cardName = animation.cardName || 'Card';

  return (
    <motion.div
      style={{
        position: 'fixed',
        top: '40%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9500 /* --z-cinematic */,
        pointerEvents: 'none'
      }}
      initial={{ opacity: 0, scale: 0.5, y: 30 }}
      animate={{ 
        opacity: [0, 1, 1, 1, 0],
        scale: [0.5, 1.1, 1, 1, 0.9],
        y: [30, 0, 0, 0, -30]
      }}
      transition={{ 
        duration: 2.5,
        times: [0, 0.1, 0.2, 0.8, 1],
        ease: "easeOut"
      }}
    >
      <div className="anim-burn-card">
        <div className="anim-burn-icon">♨</div>
        <div className="anim-burn-label">HAND FULL</div>
        <div className="anim-burn-name">{cardName}</div>
        <div className="anim-burn-status">BURNED!</div>
      </div>
    </motion.div>
  );
};

const CardDrawNotification: React.FC<{ animation: Animation }> = ({ animation }) => {
  const count = animation.value || 1;
  const playerId = animation.playerId || 'player';
  const isPlayer = playerId === 'player';
  const cardLabel = animation.cardName || (count === 1 ? 'card' : 'cards');
  
  return (
    <motion.div
      style={{
        position: 'fixed',
        top: isPlayer ? '65%' : '15%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9500 /* --z-cinematic */,
        pointerEvents: 'none'
      }}
      initial={{ opacity: 0, scale: 0.3, y: isPlayer ? 40 : -40 }}
      animate={{ 
        opacity: [0, 1, 1, 1, 0],
        scale: [0.3, 1.15, 1, 1, 0.9],
        y: [isPlayer ? 40 : -40, 0, 0, 0, isPlayer ? -20 : 20]
      }}
      transition={{ 
        duration: 2.5,
        times: [0, 0.12, 0.2, 0.8, 1],
        ease: "easeOut"
      }}
    >
      <div style={{
        background: isPlayer 
          ? 'linear-gradient(180deg, rgba(30, 80, 160, 0.95) 0%, rgba(20, 50, 120, 0.95) 100%)'
          : 'linear-gradient(180deg, rgba(120, 40, 40, 0.95) 0%, rgba(80, 25, 25, 0.95) 100%)',
        border: `3px solid ${isPlayer ? '#60a5fa' : '#f87171'}`,
        borderRadius: '16px',
        padding: '14px 36px',
        boxShadow: isPlayer 
          ? '0 0 40px rgba(96, 165, 250, 0.6), 0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)' 
          : '0 0 40px rgba(248, 113, 113, 0.6), 0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
        textAlign: 'center',
        minWidth: '240px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
            <motion.div
              key={i}
              style={{
                width: '36px',
                height: '50px',
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                borderRadius: '4px',
                border: '2px solid #fef3c7',
                boxShadow: '0 0 12px rgba(251, 191, 36, 0.6), 0 2px 8px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              initial={{ opacity: 0, y: 30, rotateZ: -15 + i * 8 }}
              animate={{ 
                opacity: 1, 
                y: 0, 
                rotateZ: -10 + i * 5
              }}
              transition={{ 
                delay: 0.15 + i * 0.12, 
                duration: 0.4,
                type: 'spring',
                stiffness: 200
              }}
            >
              <span style={{ fontSize: '18px', color: '#78350f', fontWeight: 800 }}>
                {isPlayer ? '?' : '?'}
              </span>
            </motion.div>
          ))}
        </div>
        
        <div style={{
          fontSize: '14px',
          fontWeight: 700,
          color: isPlayer ? '#93c5fd' : '#fca5a5',
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          {isPlayer ? 'You Drew' : 'Opponent Drew'}
        </div>
        
        <div style={{
          fontSize: '28px',
          fontWeight: 800,
          color: '#ffffff',
          textShadow: `0 0 15px ${isPlayer ? 'rgba(96, 165, 250, 0.8)' : 'rgba(248, 113, 113, 0.8)'}, 2px 2px 4px rgba(0,0,0,0.8)`,
          lineHeight: 1
        }}>
          {count} {cardLabel}
        </div>
        
        <motion.div
          style={{
            width: '100%',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${isPlayer ? '#60a5fa' : '#f87171'}, transparent)`,
            marginTop: '2px'
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        />
      </div>
    </motion.div>
  );
};

const CardPlayEffect: React.FC<{ animation: Animation }> = ({ animation }) => {
  const pos = animation.position!;
  const isSpell = animation.playType === 'spell';
  const isMythic = animation.intensity === 'critical';

  useEffect(() => {
    const palette = isSpell
      ? { primary: '#3b82f6', secondary: '#93c5fd', glow: 'rgba(59,130,246,0.6)' }
      : ELEMENT_PALETTES.lightning;
    spawnParticleBurst(pos.x, pos.y, isMythic ? 50 : 25, palette);
    spawnImpactRing(pos.x, pos.y, palette);
    if (isMythic) {
      spawnEmbers(pos.x, pos.y, 20, palette);
    }
  }, []);

  const handY = window.innerHeight - 60;

  return (
    <>
      {/* Arc trail from hand to board position */}
      <motion.div
        style={{
          position: 'fixed',
          width: isSpell ? 40 : 50,
          height: isSpell ? 55 : 70,
          borderRadius: isSpell ? '8px' : '6px',
          background: isSpell
            ? 'linear-gradient(135deg, rgba(59,130,246,0.8), rgba(147,197,253,0.6))'
            : 'linear-gradient(135deg, rgba(255,215,0,0.8), rgba(255,255,200,0.6))',
          boxShadow: isSpell
            ? '0 0 20px rgba(59,130,246,0.6), 0 0 40px rgba(59,130,246,0.3)'
            : '0 0 20px rgba(255,215,0,0.6), 0 0 40px rgba(255,215,0,0.3)',
          zIndex: 200,
          pointerEvents: 'none'
        }}
        initial={{
          left: window.innerWidth / 2 - 25,
          top: handY,
          scale: 0.6,
          opacity: 0,
          rotate: -5
        }}
        animate={{
          left: [window.innerWidth / 2 - 25, pos.x - 25],
          top: [handY, Math.min(handY, pos.y) - 80, pos.y - 35],
          scale: [0.6, 0.9, isMythic ? 1.3 : 1.0, 0],
          opacity: [0, 1, 1, 0],
          rotate: [-5, 0, 2, 0]
        }}
        transition={{
          duration: 0.5,
          ease: [0.25, 0.1, 0.25, 1],
          times: [0, 0.4, 0.7, 1]
        }}
      />
      {/* Landing impact at board position */}
      <motion.div
        style={{
          position: 'absolute',
          width: isMythic ? 100 : 70,
          height: isMythic ? 100 : 70,
          left: pos.x - (isMythic ? 50 : 35),
          top: pos.y - (isMythic ? 50 : 35),
          borderRadius: '50%',
          background: isSpell
            ? 'radial-gradient(circle, rgba(59,130,246,0.6) 0%, rgba(59,130,246,0.2) 50%, transparent 70%)'
            : 'radial-gradient(circle, rgba(255,215,0,0.6) 0%, rgba(255,215,0,0.2) 50%, transparent 70%)',
          zIndex: 100
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.5, 0], opacity: [0, 0.8, 0] }}
        transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
      />
    </>
  );
};

// Death animation component
const DeathAnimation: React.FC<{ animation: Animation }> = ({ animation }) => {
  if (!animation.position) return null;
  
  // If it's an enhanced death, use the enhanced version
  if (animation.type === 'enhanced_death') {
    return (
      <EnhancedDeathAnimation 
        position={animation.position}
        card={animation.card}
        duration={animation.duration || 2500}
      />
    );
  }
  
  // Basic death animation (fallback)
  return (
    <motion.div
      style={{
        position: 'absolute',
        width: 60,
        height: 60,
        left: animation.position ? animation.position.x - 30 : 0,
        top: animation.position ? animation.position.y - 30 : 0,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(50,50,50,0.7) 0%, rgba(30,30,30,0.5) 50%, rgba(0,0,0,0) 70%)',
        zIndex: 99
      }}
      initial={{ scale: 1, opacity: 0.7 }}
      animate={{
        scale: [1, 1.5, 0],
        opacity: [0.7, 0.5, 0]
      }}
      transition={{
        duration: animation.duration ? animation.duration / 1000 : 1,
        ease: "easeOut"
      }}
    />
  );
};

const BattlecryEffect: React.FC<{ animation: Animation }> = ({ animation }) => {
  const pos = animation.position!;
  const targetPos = animation.targetPosition;

  useEffect(() => {
    playBattlecryVFX(
      animation.effect || 'default',
      pos.x, pos.y,
      targetPos?.x, targetPos?.y,
      animation.value
    );
  }, []);

  return null;
};

const DeathrattleEffect: React.FC<{ animation: Animation }> = ({ animation }) => {
  const pos = animation.position!;

  useEffect(() => {
    playDeathrattleVFX(pos.x, pos.y);
  }, []);

  return null;
};

const SummonEffect: React.FC<{ animation: Animation }> = ({ animation }) => {
  const pos = animation.position!;

  useEffect(() => {
    playSummonVFX(pos.x, pos.y);
  }, []);

  return null;
};

const BuffEffect: React.FC<{ animation: Animation }> = ({ animation }) => {
  const pos = animation.position!;
  const val = animation.value || 0;

  useEffect(() => {
    playBuffVFX(pos.x, pos.y, val, val);
  }, []);

  return null;
};

const PetAscensionEffect: React.FC<{ animation: Animation }> = ({ animation }) => {
  const pos = animation.position!;

  useEffect(() => {
    spawnParticleBurst(pos.x, pos.y, 45, ELEMENT_PALETTES.ice);
    spawnImpactRing(pos.x, pos.y, ELEMENT_PALETTES.ice);
    spawnEmbers(pos.x, pos.y - 30, 20, ELEMENT_PALETTES.ice);
  }, []);

  return (
    <>
      {/* Cyan energy burst */}
      <motion.div
        style={{
          position: 'absolute',
          width: 110, height: 110,
          left: pos.x - 55, top: pos.y - 55,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,220,255,0.7) 0%, rgba(80,0,255,0.4) 40%, transparent 70%)',
          boxShadow: '0 0 50px rgba(0,220,255,0.5), 0 0 100px rgba(80,0,255,0.3)',
          zIndex: 100
        }}
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.8, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
      {/* Rising energy column */}
      <motion.div
        style={{
          position: 'absolute',
          width: 50, height: 150,
          left: pos.x - 25, top: pos.y - 120,
          background: 'linear-gradient(to top, rgba(0,220,255,0.6), rgba(120,0,255,0.3), transparent)',
          boxShadow: '0 0 20px rgba(0,220,255,0.3)',
          zIndex: 99
        }}
        initial={{ scaleY: 0, opacity: 0, transformOrigin: 'center bottom' }}
        animate={{ scaleY: [0, 1, 0], opacity: [0, 0.8, 0] }}
        transition={{ duration: 0.8, times: [0, 0.4, 1] }}
      />
      {/* Double ring burst */}
      {[0, 0.1].map((delay, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            width: 90, height: 90,
            left: pos.x - 45, top: pos.y - 45,
            borderRadius: '50%',
            border: `2px solid ${i === 0 ? 'rgba(0,220,255,0.8)' : 'rgba(120,0,255,0.6)'}`,
            zIndex: 101
          }}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 2.5], opacity: [0.9, 0] }}
          transition={{ duration: 0.7, delay }}
        />
      ))}
    </>
  );
};

const PetApotheosisEffect: React.FC<{ animation: Animation }> = ({ animation }) => {
  const pos = animation.position!;

  useEffect(() => {
    spawnParticleBurst(pos.x, pos.y, 80, ELEMENT_PALETTES.ice);
    spawnImpactRing(pos.x, pos.y, ELEMENT_PALETTES.ice);
    setTimeout(() => {
      spawnParticleBurst(pos.x, pos.y, 50, ELEMENT_PALETTES.shadow);
      spawnImpactRing(pos.x, pos.y, ELEMENT_PALETTES.shadow);
    }, 300);
    spawnEmbers(pos.x, pos.y - 40, 30, { primary: '#ffffff', secondary: '#00dcff', glow: 'rgba(0,220,255,0.6)' });
  }, []);

  return (
    <>
      {/* Full divine radiance */}
      <motion.div
        style={{
          position: 'absolute',
          width: 160, height: 160,
          left: pos.x - 80, top: pos.y - 80,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(0,220,255,0.6) 25%, rgba(160,0,255,0.4) 50%, transparent 70%)',
          boxShadow: '0 0 60px rgba(255,255,255,0.5), 0 0 120px rgba(0,220,255,0.4), 0 0 180px rgba(160,0,255,0.2)',
          zIndex: 100
        }}
        initial={{ scale: 0 }}
        animate={{ scale: [0, 2.5, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />
      {/* Massive light pillar */}
      <motion.div
        style={{
          position: 'absolute',
          width: 100, height: 400,
          left: pos.x - 50, top: pos.y - 350,
          background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.7) 30%, rgba(0,220,255,0.5) 60%, rgba(160,0,255,0.3) 80%, transparent 100%)',
          boxShadow: '0 0 40px rgba(0,220,255,0.3)',
          zIndex: 99
        }}
        initial={{ scaleY: 0, opacity: 0, transformOrigin: 'center bottom' }}
        animate={{ scaleY: [0, 1, 1, 0], opacity: [0, 0.9, 0.9, 0] }}
        transition={{ duration: 1.5, times: [0, 0.2, 0.7, 1] }}
      />
      {/* Screen flash */}
      <motion.div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(255,255,255,0.3)',
          zIndex: 98
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 0.4, delay: 0.2 }}
      />
      {/* Triple expanding rings */}
      {[0, 0.15, 0.3].map((delay, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            width: 120, height: 120,
            left: pos.x - 60, top: pos.y - 60,
            borderRadius: '50%',
            border: `3px solid ${i === 0 ? 'rgba(255,255,255,0.9)' : i === 1 ? 'rgba(0,220,255,0.7)' : 'rgba(160,0,255,0.5)'}`,
            boxShadow: `0 0 15px ${i === 0 ? 'rgba(255,255,255,0.4)' : i === 1 ? 'rgba(0,220,255,0.3)' : 'rgba(160,0,255,0.2)'}`,
            zIndex: 101
          }}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 3], opacity: [1, 0] }}
          transition={{ duration: 1, delay }}
        />
      ))}
    </>
  );
};

const CardDrawEffect: React.FC<{ animation: Animation }> = ({ animation }) => {
	const pos = animation.position || { x: window.innerWidth / 2, y: window.innerHeight * 0.6 };

	useEffect(() => {
		spawnParticleBurst(pos.x, pos.y, 20, { primary: '#ffd700', secondary: '#fff9c4', glow: 'rgba(255,215,0,0.6)' });
	}, []);

	return (
		<motion.div
			style={{
				position: 'absolute',
				width: 80, height: 80,
				left: pos.x - 40, top: pos.y - 40,
				borderRadius: '50%',
				background: 'radial-gradient(circle, rgba(255,215,0,0.7) 0%, rgba(255,255,200,0.3) 40%, transparent 70%)',
				boxShadow: '0 0 30px rgba(255,215,0,0.5)',
				zIndex: 100
			}}
			initial={{ scale: 0, opacity: 0 }}
			animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
			transition={{ duration: 0.6, ease: 'easeOut' }}
		/>
	);
};

const MythicEntranceEffect: React.FC<{ animation: Animation }> = ({ animation: _animation }) => {
	useEffect(() => {
		const cx = window.innerWidth / 2;
		const cy = window.innerHeight * 0.4;
		spawnParticleBurst(cx, cy, 60, { primary: '#ffd700', secondary: '#ffffff', glow: 'rgba(255,215,0,0.8)' });
		spawnImpactRing(cx, cy, { primary: '#ffd700', secondary: '#ffffff', glow: 'rgba(255,215,0,0.8)' });
	}, []);

	return (
		<>
			<motion.div
				style={{ position: 'fixed', inset: 0, background: 'rgba(255,215,0,0.2)', zIndex: 98, pointerEvents: 'none' }}
				animate={{ opacity: [0, 0.8, 0] }}
				transition={{ duration: 0.8 }}
			/>
			<motion.div
				style={{
					position: 'fixed',
					top: '50%', left: '50%',
					width: 200, height: 280,
					marginLeft: -100, marginTop: -140,
					borderRadius: '12px',
					border: '3px solid #ffd700',
					boxShadow: '0 0 60px rgba(255,215,0,0.8), 0 0 120px rgba(255,215,0,0.4), inset 0 0 30px rgba(255,215,0,0.3)',
					background: 'linear-gradient(180deg, rgba(40,20,0,0.9), rgba(20,10,0,0.95))',
					zIndex: 200, pointerEvents: 'none'
				}}
				initial={{ scale: 0, opacity: 0 }}
				animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 1, 0] }}
				transition={{ duration: 1.5, times: [0, 0.3, 0.5, 1] }}
			/>
		</>
	);
};

const SpellCastEffect: React.FC<{ animation: Animation }> = ({ animation }) => {
	const pos = animation.position || { x: window.innerWidth / 2, y: window.innerHeight * 0.4 };

	useEffect(() => {
		spawnParticleBurst(pos.x, pos.y, 30, ELEMENT_PALETTES.lightning);
		spawnImpactRing(pos.x, pos.y, ELEMENT_PALETTES.lightning);
	}, []);

	return (
		<>
			<motion.div
				style={{
					position: 'absolute',
					width: 120, height: 120,
					left: pos.x - 60, top: pos.y - 60,
					borderRadius: '50%',
					border: '3px solid rgba(100,150,255,0.8)',
					boxShadow: '0 0 30px rgba(100,150,255,0.6), inset 0 0 20px rgba(100,150,255,0.3)',
					zIndex: 101
				}}
				initial={{ scale: 0, opacity: 0, rotate: 0 }}
				animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0], rotate: [0, 180] }}
				transition={{ duration: 1.0, ease: 'easeOut' }}
			/>
			<motion.div
				style={{
					position: 'absolute',
					width: 80, height: 80,
					left: pos.x - 40, top: pos.y - 40,
					borderRadius: '50%',
					background: 'radial-gradient(circle, rgba(100,150,255,0.8) 0%, rgba(60,80,200,0.4) 40%, transparent 70%)',
					boxShadow: '0 0 50px rgba(100,150,255,0.5)',
					zIndex: 100
				}}
				initial={{ scale: 0, opacity: 0 }}
				animate={{ scale: [0, 2, 0], opacity: [0, 0.9, 0] }}
				transition={{ duration: 0.8, ease: 'easeOut' }}
			/>
		</>
	);
};

const GameStartEffect: React.FC<{ animation: Animation }> = ({ animation: _animation }) => {
	useEffect(() => {
		const cx = window.innerWidth / 2;
		const cy = window.innerHeight * 0.4;
		setTimeout(() => {
			spawnParticleBurst(cx, cy, 50, ELEMENT_PALETTES.lightning);
			spawnImpactRing(cx, cy, ELEMENT_PALETTES.lightning);
		}, 400);
	}, []);

	return (
		<>
			<motion.div
				style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 98, pointerEvents: 'none' }}
				animate={{ opacity: [0, 0.8, 0.6, 0] }}
				transition={{ duration: 2, times: [0, 0.2, 0.7, 1] }}
			/>
			<motion.div
				style={{
					position: 'fixed', top: '35%', left: '50%', transform: 'translateX(-50%)',
					fontSize: '64px', fontWeight: 900, color: '#ffffff',
					fontFamily: 'Cinzel, "Times New Roman", serif',
					textShadow: '0 0 30px rgba(255,215,0,0.8), 0 0 60px rgba(255,165,0,0.5), 0 4px 8px rgba(0,0,0,0.9)',
					letterSpacing: '10px', textTransform: 'uppercase',
					whiteSpace: 'nowrap', zIndex: 9500 /* --z-cinematic */, pointerEvents: 'none'
				}}
				initial={{ scale: 3, opacity: 0 }}
				animate={{ scale: [3, 0.9, 1], opacity: [0, 1, 1, 0] }}
				transition={{ duration: 2, times: [0, 0.25, 0.7, 1], ease: 'easeOut' }}
			>
				BATTLE BEGINS
			</motion.div>
		</>
	);
};

const TurnStartEffect: React.FC<{ animation: Animation }> = ({ animation }) => {
	const isPlayer = animation.data?.turn !== 'opponent';
	const label = isPlayer ? 'YOUR TURN' : 'ENEMY TURN';
	const color = isPlayer ? '#60a5fa' : '#f87171';
	const bgColor = isPlayer
		? 'linear-gradient(90deg, transparent, rgba(30,80,180,0.9) 20%, rgba(30,80,180,0.9) 80%, transparent)'
		: 'linear-gradient(90deg, transparent, rgba(180,40,40,0.9) 20%, rgba(180,40,40,0.9) 80%, transparent)';

	return (
		<motion.div
			style={{
				position: 'fixed',
				top: '40%', left: 0, right: 0,
				height: '60px',
				background: bgColor,
				display: 'flex', alignItems: 'center', justifyContent: 'center',
				zIndex: 9500 /* --z-cinematic */, pointerEvents: 'none',
				borderTop: `2px solid ${color}`,
				borderBottom: `2px solid ${color}`,
				boxShadow: `0 0 30px ${color}40`
			}}
			initial={{ scaleX: 0, opacity: 0 }}
			animate={{ scaleX: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
			transition={{ duration: 1.5, times: [0, 0.15, 0.7, 1], ease: 'easeOut' }}
		>
			<motion.span
				style={{
					fontSize: '32px', fontWeight: 800, color: '#ffffff',
					letterSpacing: '8px', textTransform: 'uppercase',
					textShadow: `0 0 20px ${color}, 0 2px 4px rgba(0,0,0,0.8)`
				}}
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, 0] }}
				transition={{ duration: 1.5, times: [0, 0.2, 0.7, 1] }}
			>
				{label}
			</motion.span>
		</motion.div>
	);
};

const VictoryEffect: React.FC<{ animation: Animation }> = ({ animation: _animation }) => {
  useEffect(() => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.4;
    const goldPalette = { primary: '#ffd700', secondary: '#fff9c4', glow: 'rgba(255,215,0,0.6)' };
    spawnParticleBurst(cx, cy, 80, goldPalette);
    setTimeout(() => spawnParticleBurst(cx - 150, cy + 50, 40, goldPalette), 300);
    setTimeout(() => spawnParticleBurst(cx + 150, cy + 50, 40, goldPalette), 500);
    spawnEmbers(cx, cy, 30, goldPalette);
  }, []);

  return (
    <>
      {/* Golden flash */}
      <motion.div
        style={{ position: 'fixed', inset: 0, background: 'rgba(255,215,0,0.15)', zIndex: 98, pointerEvents: 'none' }}
        animate={{ opacity: [0, 0.6, 0] }}
        transition={{ duration: 0.6 }}
      />
      {/* Victory text */}
      <motion.div
        style={{
          position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)',
          fontSize: '72px', fontWeight: 900, color: '#ffd700',
          textShadow: '0 0 30px rgba(255,215,0,0.8), 0 4px 8px rgba(0,0,0,0.8), 0 0 60px rgba(255,215,0,0.4)',
          letterSpacing: '8px', textTransform: 'uppercase', zIndex: 9500 /* --z-cinematic */, pointerEvents: 'none'
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        VICTORY
      </motion.div>
      <motion.div
        style={{
          position: 'fixed', top: '42%', left: '50%', transform: 'translateX(-50%)',
          fontSize: '20px', fontWeight: 600, color: '#fff',
          textShadow: '0 0 10px rgba(255,215,0,0.5)', letterSpacing: '4px', zIndex: 9500 /* --z-cinematic */, pointerEvents: 'none'
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        WELL PLAYED
      </motion.div>
    </>
  );
};

const DefeatEffect: React.FC<{ animation: Animation }> = ({ animation: _animation }) => {
  useEffect(() => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.4;
    spawnParticleBurst(cx, cy, 60, ELEMENT_PALETTES.shadow);
    spawnEmbers(cx, cy, 20, ELEMENT_PALETTES.fire);
  }, []);

  return (
    <>
      {/* Dark overlay */}
      <motion.div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 98, pointerEvents: 'none' }}
        animate={{ opacity: [0, 0.7] }}
        transition={{ duration: 1 }}
      />
      {/* Defeat text */}
      <motion.div
        style={{
          position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)',
          fontSize: '72px', fontWeight: 900, color: '#dc2626',
          textShadow: '0 0 30px rgba(220,38,38,0.8), 0 4px 8px rgba(0,0,0,0.8)',
          letterSpacing: '8px', textTransform: 'uppercase', zIndex: 9500 /* --z-cinematic */, pointerEvents: 'none'
        }}
        initial={{ scale: 2, opacity: 0 }}
        animate={{ scale: [2, 0.9, 1], opacity: [0, 1, 1] }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        DEFEAT
      </motion.div>
      <motion.div
        style={{
          position: 'fixed', top: '42%', left: '50%', transform: 'translateX(-50%)',
          fontSize: '20px', fontWeight: 600, color: '#fca5a5',
          letterSpacing: '4px', zIndex: 9500 /* --z-cinematic */, pointerEvents: 'none'
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        BETTER LUCK NEXT TIME
      </motion.div>
    </>
  );
};

export default AnimationLayer;
