import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Position, useAnimation } from './AnimationManager';

/**
 * Attack Animation - Visualizes an attack from one entity to another
 */
interface AttackAnimationProps {
  sourcePosition?: Position;
  targetPosition?: Position;
  value?: number;
  onComplete?: () => void;
}

export const AttackAnimation: React.FC<AttackAnimationProps> = ({
  sourcePosition,
  targetPosition,
  value,
  onComplete
}) => {
  // Animation that moves from source to target
  return (
    <AnimatePresence mode="wait" onExitComplete={onComplete}>
      {sourcePosition && targetPosition && (
        <motion.div 
          className="absolute pointer-events-none z-50"
          style={{
            left: sourcePosition.x,
            top: sourcePosition.y,
            width: '2rem',
            height: '2rem',
          }}
          animate={{
            x: targetPosition.x - sourcePosition.x,
            y: targetPosition.y - sourcePosition.y,
            opacity: [1, 1, 0]
          }}
          transition={{
            duration: 0.5,
            ease: "easeInOut",
            times: [0, 0.8, 1]
          }}
          exit={{ opacity: 0 }}
        >
          <div className="bg-red-500 rounded-full h-full w-full flex items-center justify-center shadow-md">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {value && <span className="text-white font-bold text-xs">{value}</span>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Damage Animation - Shows damage amount with red text
 */
interface DamageAnimationProps {
  position?: Position;
  value: number;
  onComplete?: () => void;
}

export const DamageAnimation: React.FC<DamageAnimationProps> = ({
  position,
  value,
  onComplete
}) => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  // If value is 0, it's a shield break, not damage
  const isShieldBreak = value === 0;
  
  return (
    <AnimatePresence>
      {isVisible && position && (
        <motion.div
          className="absolute pointer-events-none z-50 select-none"
          style={{
            left: position.x,
            top: position.y,
          }}
          initial={{ opacity: 0, y: 0, scale: 1.5 }}
          animate={{ opacity: 1, y: -20, scale: 1 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 1 }}
        >
          {isShieldBreak ? (
            // Shield break animation
            <div className="flex items-center justify-center">
              <motion.div
                className="bg-blue-400 rounded-full p-1 shadow-md"
                animate={{ scale: [1, 1.2, 0.8, 0] }}
                transition={{ duration: 0.7, times: [0, 0.3, 0.6, 1] }}
              >
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                </svg>
              </motion.div>
            </div>
          ) : (
            // Regular damage animation
            <motion.div
              className="text-2xl font-bold text-red-500 shadow-text"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.5, times: [0, 0.5, 1] }}
            >
              {value > 0 ? `-${value}` : value}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Heal Animation - Shows heal amount with green text
 */
interface HealAnimationProps {
  position?: Position;
  value: number;
  onComplete?: () => void;
}

export const HealAnimation: React.FC<HealAnimationProps> = ({
  position,
  value,
  onComplete
}) => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return (
    <AnimatePresence>
      {isVisible && position && (
        <motion.div
          className="absolute pointer-events-none z-50 select-none"
          style={{
            left: position.x,
            top: position.y,
          }}
          initial={{ opacity: 0, y: 0, scale: 1.5 }}
          animate={{ opacity: 1, y: -20, scale: 1 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 1 }}
        >
          <motion.div
            className="text-2xl font-bold text-green-500 shadow-text"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.5, times: [0, 0.5, 1] }}
          >
            +{value}
          </motion.div>
          
          {/* Healing particles */}
          <motion.div 
            className="absolute top-0 left-0 right-0 flex justify-center"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-green-300 rounded-full"
                style={{ 
                  left: `${50 + (Math.random() * 40 - 20)}%`,
                  top: `${Math.random() * 20}px`
                }}
                animate={{
                  y: [0, -30 - Math.random() * 20],
                  opacity: [1, 0]
                }}
                transition={{
                  duration: 0.6 + Math.random() * 0.4,
                  ease: "easeOut"
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Spell Cast Animation - Visualizes a spell being cast
 */
interface SpellCastAnimationProps {
  position?: Position;
  targetPosition?: Position;
  spellName: string; // Name of the spell for different visual effects
  onComplete?: () => void;
}

export const SpellCastAnimation: React.FC<SpellCastAnimationProps> = ({
  position,
  targetPosition,
  spellName,
  onComplete
}) => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, 800);
    
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  // Determine spell type from name (fire, frost, arcane, etc.)
  const getSpellColor = () => {
    // Make spellName lowercase safely, handling null/undefined
    const spellNameLower = spellName ? spellName.toLowerCase() : '';
    
    if (spellNameLower.includes('fire') || spellNameLower.includes('flame')) {
      return 'from-orange-500 to-red-600';
    } else if (spellNameLower.includes('frost') || spellNameLower.includes('ice')) {
      return 'from-blue-300 to-blue-600';
    } else if (spellNameLower.includes('arcane')) {
      return 'from-purple-400 to-purple-700';
    } else if (spellNameLower.includes('nature') || spellNameLower.includes('earth')) {
      return 'from-green-400 to-green-700';
    } else if (spellNameLower.includes('shadow') || spellNameLower.includes('void')) {
      return 'from-indigo-700 to-purple-900';
    } else if (spellNameLower.includes('holy') || spellNameLower.includes('light')) {
      return 'from-yellow-300 to-yellow-500';
    } else {
      return 'from-blue-400 to-purple-600'; // Default magical effect
    }
  };
  
  return (
    <AnimatePresence>
      {isVisible && position && (
        <motion.div
          className={`absolute pointer-events-none z-40 bg-gradient-radial ${getSpellColor()} rounded-full`}
          style={{
            left: position.x - 30,
            top: position.y - 30,
            width: '60px',
            height: '60px',
          }}
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ 
            scale: targetPosition ? [0, 1, 0.8] : [0, 1, 1.5, 0],
            opacity: targetPosition ? [0.8, 1, 0] : [0.8, 1, 0.6, 0],
            x: targetPosition ? [0, 0, targetPosition.x - position.x] : 0,
            y: targetPosition ? [0, 0, targetPosition.y - position.y] : 0
          }}
          transition={{ 
            duration: targetPosition ? 0.8 : 0.5,
            times: targetPosition ? [0, 0.3, 1] : [0, 0.3, 0.7, 1]
          }}
          exit={{ scale: 0, opacity: 0 }}
        >
          {/* Inner glow */}
          <motion.div 
            className="w-full h-full rounded-full bg-white opacity-70"
            animate={{ 
              scale: [0.5, 0.7, 0.5],
              opacity: [0.7, 0.9, 0.7]
            }}
            transition={{ 
              duration: 0.8, 
              repeat: Infinity,
              repeatType: "reverse"
            }}
          />
          
          {/* Spell particles */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{ 
                left: '50%',
                top: '50%'
              }}
              animate={{
                x: [0, Math.cos(i * Math.PI / 4) * 40],
                y: [0, Math.sin(i * Math.PI / 4) * 40],
                opacity: [1, 0]
              }}
              transition={{
                duration: 0.5,
                ease: "easeOut",
                delay: i * 0.02
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Death Animation - Visualizes a minion's death
 */
interface DeathAnimationProps {
  position?: Position;
  cardName: string;
  onComplete?: () => void;
}

export const DeathAnimation: React.FC<DeathAnimationProps> = ({
  position,
  cardName,
  onComplete
}) => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return (
    <AnimatePresence>
      {isVisible && position && (
        <motion.div
          className="absolute pointer-events-none z-50"
          style={{
            left: position.x - 40,
            top: position.y - 40,
            width: '80px',
            height: '80px',
          }}
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0, scale: 0.2 }}
          transition={{ duration: 1, ease: "easeOut" }}
          exit={{ opacity: 0 }}
        >
          {/* Skull icon */}
          <motion.div 
            className="absolute flex items-center justify-center w-12 h-12 bg-black bg-opacity-60 rounded-full"
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ duration: 0.5, times: [0, 0.7, 1] }}
          >
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 14c-.3 0-.6-.1-.8-.4-.2-.2-.3-.5-.2-.8 0-.3.1-.5.3-.7.2-.2.5-.3.7-.3.3 0 .6.1.8.3.2.2.3.5.3.8s-.1.5-.3.7c-.2.2-.5.4-.8.4zm-6 0c-.3 0-.6-.1-.8-.4-.2-.2-.3-.5-.2-.8 0-.3.1-.5.3-.7.2-.2.5-.3.7-.3.3 0 .6.1.8.3.2.2.3.5.3.8s-.1.5-.3.7c-.2.2-.5.4-.8.4zm11-6v6.5c0 .8-.3 1.6-.9 2.2-.6.5-1.3.8-2.1.8h-6c-.8 0-1.6-.3-2.1-.9-.6-.6-.9-1.3-.9-2.1V8c0-.8.3-1.6.9-2.2.6-.5 1.3-.8 2.1-.8h6c.8 0 1.6.3 2.1.9.6.6.9 1.3.9 2.1zm-5 3c0-.6-.4-1-1-1s-1 .4-1 1v3c0 .6.4 1 1 1s1-.4 1-1v-3zm-3 9h6c.6 0 1-.4 1-1 0-.3-.1-.6-.3-.8-.2-.2-.5-.3-.8-.2H9c-.3 0-.6.1-.8.3-.2.2-.3.5-.2.8 0 .5.4.9 1 .9z" />
            </svg>
          </motion.div>
          
          {/* Death particles */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute bg-gray-300 rounded-full"
              style={{ 
                left: '50%',
                top: '50%',
                width: 2 + Math.random() * 4,
                height: 2 + Math.random() * 4,
              }}
              animate={{
                x: [0, (Math.random() - 0.5) * 100],
                y: [0, (Math.random() - 0.5) * 100],
                opacity: [1, 0]
              }}
              transition={{
                duration: 0.7 + Math.random() * 0.3,
                ease: "easeOut"
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Summon Animation - Visualizes a minion being summoned
 */
interface SummonAnimationProps {
  position?: Position;
  cardName: string;
  onComplete?: () => void;
}

export const SummonAnimation: React.FC<SummonAnimationProps> = ({
  position,
  cardName,
  onComplete
}) => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return (
    <AnimatePresence>
      {isVisible && position && (
        <motion.div
          className="absolute pointer-events-none z-40"
          style={{
            left: position.x - 40,
            top: position.y - 60,
            width: '80px',
            height: '120px',
          }}
          exit={{ opacity: 0 }}
        >
          {/* Main summon light ray */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-b from-yellow-200 to-transparent"
            style={{ transformOrigin: 'center top' }}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: [0, 0.7, 0] }}
            transition={{ duration: 0.8, times: [0, 0.3, 1] }}
          />
          
          {/* Summon glow effect */}
          <motion.div 
            className="absolute left-0 right-0 bottom-0 mx-auto w-16 h-16 bg-yellow-300 rounded-full filter blur-md"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 0], opacity: [0, 0.7, 0] }}
            transition={{ duration: 0.8, times: [0, 0.5, 1] }}
          />
          
          {/* Summon particles */}
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute bg-yellow-200 rounded-full"
              style={{ 
                left: '50%',
                bottom: '0',
                width: 2 + Math.random() * 3,
                height: 2 + Math.random() * 3,
              }}
              initial={{ x: 0, y: 0, opacity: 0 }}
              animate={{
                x: (Math.random() - 0.5) * 60,
                y: -40 - Math.random() * 40,
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 0.6 + Math.random() * 0.4,
                delay: Math.random() * 0.3,
                ease: "easeOut"
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Draw Card Animation - Visualizes a card being drawn
 */
interface DrawCardAnimationProps {
  cardName: string;
  onComplete?: () => void;
}

export const DrawCardAnimation: React.FC<DrawCardAnimationProps> = ({
  cardName,
  onComplete
}) => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, 600);
    
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  // This animation is shown on the hand, not in the animation layer
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute pointer-events-none z-30 bg-gradient-to-b from-blue-400 to-transparent rounded-lg"
          style={{
            width: '60px',
            height: '90px',
            top: '50%',
            left: '50%',
            marginLeft: '-30px',
            marginTop: '-45px',
          }}
          initial={{ opacity: 0, scale: 0.5, y: -10 }}
          animate={{ opacity: [0, 0.7, 0], scale: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          exit={{ opacity: 0 }}
        >
          {/* Card outline */}
          <motion.div
            className="w-full h-full border-2 border-blue-300 rounded-lg"
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.6 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Message Animation - Shows a text message on screen
 */
interface MessageAnimationProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  onComplete?: () => void;
}

export const MessageAnimation: React.FC<MessageAnimationProps> = ({
  message,
  type = 'info',
  onComplete
}) => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  // Different colors based on message type
  const getBgColor = () => {
    switch(type) {
      case 'info': return 'bg-blue-500 bg-opacity-90';
      case 'success': return 'bg-green-500 bg-opacity-90';
      case 'warning': return 'bg-yellow-500 bg-opacity-90';
      case 'error': return 'bg-red-500 bg-opacity-90';
      default: return 'bg-gray-700 bg-opacity-90';
    }
  };
  
  // Get icon based on message type
  const getIcon = () => {
    switch(type) {
      case 'info':
        return (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'success':
        return (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none select-none"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className={`px-4 py-2 rounded-lg shadow-lg flex items-center ${getBgColor()}`}>
            <span className="mr-2">
              {getIcon()}
            </span>
            <span className="text-white font-medium">
              {message}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};