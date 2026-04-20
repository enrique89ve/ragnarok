import React from 'react';
import { motion } from 'framer-motion';
import { ElementType, ELEMENT_COLORS, ELEMENT_ICONS } from '../types/ChessTypes';
import { NorseElement, NORSE_TO_GAME_ELEMENT } from '../types/NorseTypes';
import './ElementIndicator.css';

interface ElementIndicatorProps {
  element: ElementType | NorseElement;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

const ELEMENT_LABELS: Record<ElementType, string> = {
  fire: 'Fire',
  water: 'Water',
  wind: 'Wind',
  earth: 'Earth',
  holy: 'Holy',
  shadow: 'Shadow',
  neutral: 'Neutral'
};

const ELEMENT_GRADIENTS: Record<ElementType, string> = {
  fire: 'linear-gradient(135deg, #ff6b35 0%, #ff4500 50%, #ff8c00 100%)',
  water: 'linear-gradient(135deg, #00bfff 0%, #1e90ff 50%, #4169e1 100%)',
  wind: 'linear-gradient(135deg, #90ee90 0%, #32cd32 50%, #228b22 100%)',
  earth: 'linear-gradient(135deg, #deb887 0%, #8b4513 50%, #654321 100%)',
  holy: 'linear-gradient(135deg, #fffacd 0%, #ffd700 50%, #ffb700 100%)',
  shadow: 'linear-gradient(135deg, #4b0082 0%, #8b008b 50%, #9932cc 100%)',
  neutral: 'linear-gradient(135deg, #808080 0%, #696969 50%, #5a5a5a 100%)'
};

const getGameElement = (element: ElementType | NorseElement): ElementType => {
  if (['fire', 'water', 'wind', 'earth', 'holy', 'shadow', 'neutral'].includes(element)) {
    return element as ElementType;
  }
  return NORSE_TO_GAME_ELEMENT[element as NorseElement] || 'neutral';
};

const ElementIndicator: React.FC<ElementIndicatorProps> = ({
  element,
  size = 'medium',
  showLabel = false,
  animated = true,
  className = ''
}) => {
  const gameElement = getGameElement(element);
  const sizeClasses = {
    small: 'element-indicator-small',
    medium: 'element-indicator-medium',
    large: 'element-indicator-large'
  };

  return (
    <motion.div
      className={`element-indicator ${sizeClasses[size]} element-${gameElement} ${animated ? 'animated' : ''} ${className}`}
      style={{ background: ELEMENT_GRADIENTS[gameElement] }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      title={`${ELEMENT_LABELS[gameElement]} Element`}
    >
      <span className="element-icon">{ELEMENT_ICONS[gameElement]}</span>
      <div className={`element-effect element-effect-${gameElement}`} />
      {showLabel && (
        <span className="element-label">{ELEMENT_LABELS[gameElement]}</span>
      )}
    </motion.div>
  );
};

export const ElementBadge: React.FC<{ element: ElementType | NorseElement; className?: string }> = ({ element, className = '' }) => {
  const gameElement = getGameElement(element);
  
  return (
    <div 
      className={`element-badge element-badge-${gameElement} ${className}`}
      style={{ 
        background: ELEMENT_GRADIENTS[gameElement],
        boxShadow: `0 0 8px ${ELEMENT_COLORS[gameElement]}80`
      }}
      title={`${ELEMENT_LABELS[gameElement]} Element`}
    >
      <span className="element-badge-icon">{ELEMENT_ICONS[gameElement]}</span>
      <span className="element-badge-label">{ELEMENT_LABELS[gameElement]}</span>
    </div>
  );
};

export const ElementAura: React.FC<{ element: ElementType; intensity?: number; children: React.ReactNode }> = ({ 
  element, 
  intensity = 1,
  children 
}) => {
  return (
    <div className={`element-aura element-aura-${element}`} style={{ '--intensity': intensity } as React.CSSProperties}>
      <div className={`element-aura-effect element-aura-${element}-effect`} />
      {children}
    </div>
  );
};

export default ElementIndicator;
