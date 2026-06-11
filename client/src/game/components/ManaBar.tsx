import React, { useState, useEffect, useRef, useId } from 'react';
import { motion } from 'framer-motion';
import { playSound } from '../utils/soundUtils';
import './ManaBar.css';
import { GameIcon } from '../utils/ui/GameIcon';

const MAX_MANA_SLOTS = 10;
const CRYSTAL_SIZE = 20; // Larger crystals for better visibility

interface ManaBarProps {
  currentMana: number;
  maxMana: number;
  overloadedMana?: number;
  pendingOverload?: number;
  registerPosition?: (type: 'mana', position: { x: number, y: number }) => void;
  vertical?: boolean;
  variant?: 'default' | 'hero';
  label?: string;
}

const ManaBar: React.FC<ManaBarProps> = ({
  currentMana,
  maxMana,
  overloadedMana = 0,
  pendingOverload = 0,
  registerPosition,
  vertical = false,
  variant = 'default',
  label
}) => {
  const manaBarId = useId();
  const manaBarRef = React.useRef<HTMLDivElement>(null);
  const isHeroVariant = variant === 'hero';
  const crystalSize = isHeroVariant ? 14 : CRYSTAL_SIZE;
  const orientationClass = vertical ? 'mana-bar-container--vertical' : 'mana-bar-container--horizontal';

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
      className={`mana-bar-container mana-bar-container--${variant} ${orientationClass}`}
    >
      {isHeroVariant ? (
        <span className="mana-label">
          <span>{label ?? 'Mana'}</span>
          <strong>{currentMana}/{maxMana}</strong>
        </span>
      ) : (
        <>
          {label && (
            <span className="mana-label">
              {label}
            </span>
          )}

          <div className="mana-bar-counter">
            <span className="mana-bar-counter-value">
              {currentMana}/{maxMana}
            </span>
          </div>
        </>
      )}

      <div className="mana-bar-tray">
        {crystals.map((crystal) => (
          <ManaCrystal key={crystal.index} {...crystal} size={crystalSize} uid={manaBarId} />
        ))}
      </div>

      {pendingOverload > 0 && (
        <div className="mana-overload-badge">
          <GameIcon name="zap" size={12} />{pendingOverload}
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

  const stateClass = isLocked
    ? 'is-locked'
    : isOverloaded
      ? 'is-overloaded'
      : isAvailable
        ? 'is-available'
        : isSpent
          ? 'is-spent'
          : 'is-empty';
  const crystalStyle: React.CSSProperties & { '--mana-crystal-size': string } = {
    '--mana-crystal-size': `${size}px`,
  };

  return (
    <motion.div
      className={`mana-crystal ${stateClass} ${animClass || ''}`}
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
      style={crystalStyle}
    >
      <svg width={size} height={size} viewBox="0 0 20 20">
        <defs>
          <linearGradient id={`${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--mana-crystal-start)" />
            <stop offset="100%" stopColor="var(--mana-crystal-fill)" />
          </linearGradient>
        </defs>

        <motion.polygon
          points="10,1 18,6 18,14 10,19 2,14 2,6"
          fill={`url(#${gradId})`}
          stroke="var(--mana-crystal-stroke)"
          strokeWidth="1.5"
          style={{ filter: 'var(--mana-crystal-filter)' }}
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
