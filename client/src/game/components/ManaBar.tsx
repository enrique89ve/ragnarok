import React, { useState, useEffect, useRef, useId } from 'react';
import { motion } from 'framer-motion';
import { playSound } from '../utils/soundUtils';
import './ManaBar.css';

const MAX_MANA_SLOTS = 9;
const CRYSTAL_SIZE = 20; // Larger crystals for better visibility

interface ManaBarProps {
  currentMana: number;
  maxMana: number;
  overloadedMana?: number;
  pendingOverload?: number;
  registerPosition?: (type: 'mana', position: { x: number, y: number }) => void;
  vertical?: boolean;
}

const ManaBar: React.FC<ManaBarProps> = ({ 
  currentMana, 
  maxMana, 
  overloadedMana = 0, 
  pendingOverload = 0,
  registerPosition,
  vertical = false
}) => {
  const manaBarId = useId();
  const manaBarRef = React.useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (manaBarRef.current && registerPosition) {
      const rect = manaBarRef.current.getBoundingClientRect();
      registerPosition('mana', { 
        x: rect.left + rect.width / 2, 
        y: rect.top + rect.height / 2 
      });
    }
  }, [registerPosition]);

  const crystals = Array.from({ length: MAX_MANA_SLOTS }, (_, i) => {
    const isLocked = i >= maxMana;
    const isAvailable = i < currentMana && !isLocked;
    const isSpent = i >= currentMana && i < maxMana;
    const isOverloaded = i < overloadedMana;
    
    return { isLocked, isAvailable, isSpent, isOverloaded, index: i };
  });
  
  return (
    <div 
      ref={manaBarRef}
      className="mana-bar-container"
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        alignItems: 'center',
        gap: '4px'
      }}
    >
      <div className="mana-counter" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '44px',
        height: '32px',
        padding: '0 10px',
        background: 'linear-gradient(180deg, #1e3a5f 0%, #0f2847 100%)',
        borderRadius: '16px',
        border: '2px solid rgba(59, 130, 246, 0.7)',
        boxShadow: '0 0 12px rgba(59, 130, 246, 0.4), 0 2px 6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
      }}>
        <span style={{
          fontFamily: "'Cinzel', Georgia, serif",
          fontWeight: 800,
          fontSize: '0.95rem',
          color: '#93c5fd',
          textShadow: '0 0 12px rgba(59, 130, 246, 0.8), 0 1px 2px rgba(0,0,0,0.8)'
        }}>
          {currentMana}/{maxMana}
        </span>
      </div>
      
      <div className="mana-tray" style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        alignItems: 'center',
        gap: '2px',
        padding: '3px 5px',
        background: 'linear-gradient(180deg, rgba(15, 30, 50, 0.95) 0%, rgba(8, 20, 35, 0.98) 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(59, 130, 246, 0.4)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
      }}>
        {crystals.map((crystal) => (
          <ManaCrystal key={crystal.index} {...crystal} size={CRYSTAL_SIZE} uid={manaBarId} />
        ))}
      </div>
      
      {pendingOverload > 0 && (
        <div style={{
          fontSize: '0.65rem',
          color: '#fbbf24',
          marginLeft: '4px'
        }}>
          ⚡{pendingOverload}
        </div>
      )}
    </div>
  );
};

interface ManaCrystalProps {
  isLocked: boolean;
  isAvailable: boolean;
  isSpent: boolean;
  isOverloaded: boolean;
  index: number;
  size?: number;
  uid?: string;
}

const ManaCrystal: React.FC<ManaCrystalProps> = ({
  isLocked,
  isAvailable,
  isSpent,
  isOverloaded,
  index,
  size = CRYSTAL_SIZE,
  uid = ''
}) => {
  const gradId = `crystal-grad-${uid}-${index}`;
  const [prevAvailable, setPrevAvailable] = useState(isAvailable);
  const [animClass, setAnimClass] = useState<'filling' | 'spending' | null>(null);
  const soundDebounceRef = useRef<number>(0);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (isAvailable && !prevAvailable) {
      setAnimClass('filling');
      const now = Date.now();
      if (now - soundDebounceRef.current > 100) {
        playSound('mana_fill');
        soundDebounceRef.current = now;
      }
      t = setTimeout(() => setAnimClass(null), 500);
    } else if (!isAvailable && prevAvailable && !isLocked) {
      setAnimClass('spending');
      const now = Date.now();
      if (now - soundDebounceRef.current > 100) {
        playSound('mana_spend');
        soundDebounceRef.current = now;
      }
      t = setTimeout(() => setAnimClass(null), 400);
    }
    setPrevAvailable(isAvailable);
    return () => { if (t) clearTimeout(t); };
  }, [isAvailable, prevAvailable, isLocked]);

  let fillColor = '#1e3a5f';
  let glowColor = 'none';
  let opacity = 1;
  
  if (isLocked) {
    fillColor = '#374151';
    opacity = 0.6;
  } else if (isOverloaded) {
    fillColor = '#7f1d1d';
  } else if (isAvailable) {
    fillColor = '#3b82f6';
    glowColor = '0 0 6px rgba(59, 130, 246, 0.8)';
  } else if (isSpent) {
    fillColor = '#1e3a5f';
    opacity = 0.5;
  }
  
  return (
    <motion.div
      className={`mana-crystal ${animClass || ''}`}
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
      style={{
        width: size,
        height: size,
        position: 'relative',
        opacity
      }}
    >
      <svg width={size} height={size} viewBox="0 0 20 20">
        <defs>
          <linearGradient id={`${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isAvailable ? '#60a5fa' : fillColor} />
            <stop offset="100%" stopColor={fillColor} />
          </linearGradient>
        </defs>
        
        <motion.polygon
          points="10,1 18,6 18,14 10,19 2,14 2,6"
          fill={`url(#crystal-grad-${index})`}
          stroke={isAvailable ? '#93c5fd' : isLocked ? '#4b5563' : '#1e40af'}
          strokeWidth="1.5"
          style={{
            filter: glowColor !== 'none' ? `drop-shadow(${glowColor})` : 'none'
          }}
          animate={isAvailable ? {
            filter: ['drop-shadow(0 0 4px rgba(59, 130, 246, 0.6))', 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.9))', 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.6))']
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        {isAvailable && (
          <>
            <circle cx="7" cy="7" r="1.5" fill="white" opacity="0.6" />
            <line x1="6" y1="12" x2="12" y2="8" stroke="white" strokeWidth="0.5" opacity="0.4" />
          </>
        )}
        
        {isLocked && (
          <g transform="translate(5, 5)">
            <rect x="2" y="4" width="6" height="5" rx="1" fill="#6b7280" stroke="#9ca3af" strokeWidth="0.5" />
            <path d="M3.5 4V3C3.5 1.5 4.5 0.5 5 0.5C5.5 0.5 6.5 1.5 6.5 3V4" stroke="#9ca3af" strokeWidth="0.8" fill="none" />
            <circle cx="5" cy="6.5" r="0.8" fill="#374151" />
          </g>
        )}
        
        {isOverloaded && (
          <g transform="translate(5, 5)">
            <rect x="2" y="4" width="6" height="5" rx="1" fill="#b91c1c" stroke="#fca5a5" strokeWidth="0.5" />
            <path d="M3.5 4V3C3.5 1.5 4.5 0.5 5 0.5C5.5 0.5 6.5 1.5 6.5 3V4" stroke="#fca5a5" strokeWidth="0.8" fill="none" />
          </g>
        )}
      </svg>
    </motion.div>
  );
};

export default ManaBar;
