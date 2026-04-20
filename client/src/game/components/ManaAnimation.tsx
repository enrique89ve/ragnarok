import React, { useEffect, useState } from 'react';
import { Position } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface ManaAnimationProps {
  position: Position;
  amount: number; // Can be positive (gain) or negative (loss)
  duration?: number;
  onComplete?: () => void;
  temporary?: boolean; // Is this temporary mana (like from Innervate or The Coin)
}

export const ManaAnimation: React.FC<ManaAnimationProps> = ({
  position,
  amount,
  duration = 1000,
  onComplete,
  temporary = false
}) => {
  const [isActive, setIsActive] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsActive(false);
      if (onComplete) onComplete();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onComplete]);
  
  // Text content based on amount
  const textContent = amount > 0 ? `+${amount}` : `${amount}`;
  
  // Color based on gain/loss and temporary status
  const getColor = () => {
    if (temporary) {
      return amount > 0 ? 'text-green-300' : 'text-red-400';
    }
    return amount > 0 ? 'text-blue-300' : 'text-red-500';
  };
  
  // Get crystal icon based on gain/loss
  const getCrystalIcon = () => {
    if (amount > 0) {
      return temporary ? '🔮' : '💎';
    } else {
      return '💔';
    }
  };
  
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className={`absolute text-2xl font-bold flex items-center z-50 ${getColor()} pointer-events-none`}
          style={{
            left: position.x,
            top: position.y,
            textShadow: '0px 0px 4px rgba(0,0,0,0.7)'
          }}
          initial={{ opacity: 0, y: 0, scale: 0.5 }}
          animate={{ 
            opacity: 1, 
            y: -30, 
            scale: 1,
            transition: { duration: duration / 1000 * 0.3 }
          }}
          exit={{ 
            opacity: 0, 
            y: -60, 
            scale: 0.8,
            transition: { duration: duration / 1000 * 0.7 }
          }}
        >
          <span className="mr-1">{getCrystalIcon()}</span>
          {textContent}
          {temporary && <span className="ml-1 text-sm">(temp)</span>}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Specialized version for mana crystal gain animation
export const ManaCrystalGainAnimation: React.FC<{
  position: Position;
  amount: number;
  temporary?: boolean;
  duration?: number;
  onComplete?: () => void;
}> = ({ position, amount, temporary = false, duration = 1500, onComplete }) => (
  <ManaAnimation 
    position={position} 
    amount={amount} 
    temporary={temporary}
    duration={duration}
    onComplete={onComplete}
  />
);

// Specialized version for mana crystal use animation
export const ManaCrystalUseAnimation: React.FC<{
  position: Position;
  amount: number;
  duration?: number;
  onComplete?: () => void;
}> = ({ position, amount, duration = 1200, onComplete }) => (
  <ManaAnimation 
    position={position} 
    amount={-Math.abs(amount)} 
    duration={duration}
    onComplete={onComplete}
  />
);

// Specialized version for overloaded mana crystal animation
export const OverloadedManaAnimation: React.FC<{
  position: Position;
  amount: number;
  duration?: number;
  onComplete?: () => void;
}> = ({ position, amount, duration = 1800, onComplete }) => (
  <div className="relative">
    <ManaAnimation 
      position={position} 
      amount={-Math.abs(amount)} 
      duration={duration}
      onComplete={onComplete}
    />
    
    {/* Main overload notification */}
    <motion.div
      className="absolute bg-red-800 text-white font-bold rounded-md px-3 py-1 pointer-events-none flex items-center"
      style={{
        left: position.x + 30,
        top: position.y - 15,
        boxShadow: '0 0 8px rgba(254, 202, 62, 0.6)',
        border: '1px solid rgb(220, 38, 38)'
      }}
      initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        rotate: 0,
        transition: { duration: 0.3 }
      }}
      exit={{ 
        opacity: 0,
        transition: { duration: 0.5, delay: 1 }
      }}
    >
      <span className="text-yellow-300 mr-1 text-lg">⚡</span>
      <div className="flex flex-col">
        <span className="text-lg">OVERLOAD</span>
        <span className="text-xs text-yellow-300">{amount} mana locked next turn</span>
      </div>
    </motion.div>
    
    {/* Lightning effects */}
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: position.x - 5,
        top: position.y - 25,
        zIndex: 60
      }}
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: [0, 1, 0],
        transition: { 
          duration: 0.5,
          times: [0, 0.1, 1],
          repeat: 2,
          repeatDelay: 0.2
        }
      }}
    >
      <svg width="50" height="50" viewBox="0 0 50 50">
        <motion.path
          d="M25 0L15 20H30L20 50"
          stroke="yellow"
          strokeWidth="3"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, repeat: 2, repeatDelay: 0.4 }}
        />
      </svg>
    </motion.div>
  </div>
);