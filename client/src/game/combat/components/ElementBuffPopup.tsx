import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getElementColor, getElementIcon, type ElementType } from '../../utils/elements';

interface ElementBuffPopupProps {
  show: boolean;
  attackBonus: number;
  healthBonus: number;
  element: ElementType;
  position?: 'left' | 'right' | 'center';
  onComplete?: () => void;
}

export const ElementBuffPopup: React.FC<ElementBuffPopupProps> = ({
  show,
  attackBonus,
  healthBonus,
  element,
  position = 'center',
  onComplete
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const color = getElementColor(element);
  const icon = getElementIcon(element);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [show, onComplete]);

  const positionStyles: Record<string, React.CSSProperties> = {
    left: { left: '20%', transform: 'translateX(-50%)' },
    right: { right: '20%', transform: 'translateX(50%)' },
    center: { left: '50%', transform: 'translateX(-50%)' }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.8 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: '40%',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'none',
            ...positionStyles[position]
          }}
        >
          <motion.div
            animate={{
              textShadow: [
                `0 0 10px ${color}`,
                `0 0 20px ${color}`,
                `0 0 10px ${color}`
              ]
            }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{
              fontSize: '1.5rem',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
            }}
          >
            {icon}
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
            style={{
              display: 'flex',
              gap: '12px',
              background: 'linear-gradient(135deg, rgba(0,0,0,0.8), rgba(20,20,30,0.9))',
              border: `2px solid ${color}`,
              borderRadius: '8px',
              padding: '8px 16px',
              boxShadow: `0 0 20px ${color}40, inset 0 0 10px ${color}20`
            }}
          >
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                color: '#ff6b6b',
                fontWeight: 'bold',
                fontSize: '1.25rem',
                fontFamily: 'var(--font-norse, serif)',
                textShadow: '0 0 8px rgba(255, 107, 107, 0.5)'
              }}
            >
              +{attackBonus} ATK
            </motion.span>
            
            <motion.span
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              style={{
                color: '#4ade80',
                fontWeight: 'bold',
                fontSize: '1.25rem',
                fontFamily: 'var(--font-norse, serif)',
                textShadow: '0 0 8px rgba(74, 222, 128, 0.5)'
              }}
            >
              +{healthBonus} HP
            </motion.span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              color: color,
              fontSize: '0.85rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              textShadow: `0 0 10px ${color}`
            }}
          >
            Elemental Advantage!
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ElementBuffPopup;
