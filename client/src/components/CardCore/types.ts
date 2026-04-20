/**
 * Card Component Core Type Definitions
 * 
 * This file contains shared type definitions for all card components.
 * These types are used to ensure consistency across different card implementations.
 */

// Base props that all card components should support
export interface CardBaseProps {
  // Card identity and metadata
  id?: string | number;
  name: string;
  rarity?: 'basic' | 'common' | 'rare' | 'epic' | 'mythic';
  type?: 'minion' | 'spell' | 'weapon';
  
  // Card stats
  attack?: number;
  health?: number;
  manaCost?: number;
  
  // Card content
  description?: string;
  keywords?: string[];
  imageSrc?: string;
  
  // Card state
  isPlayed?: boolean;
  isPlayable?: boolean;
  isTargetable?: boolean;
  isHighlighted?: boolean;
  isSummoningSick?: boolean;
  canAttack?: boolean;
  
  // Display options
  size?: 'small' | 'medium' | 'large';
  use3D?: boolean;
  showDebugInfo?: boolean;
  effectIntensity?: number;
  className?: string;
  style?: React.CSSProperties;
  
  // Events
  onClick?: () => void;
  onHover?: (isHovering: boolean) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

// Battlefield card specific props
export interface BattlefieldCardProps extends CardBaseProps {
  isBattlefield: true;
  attacksPerformed?: number;
  position?: 'player' | 'opponent';
  externalIsHovering?: boolean;
}

// Hand card specific props
export interface HandCardProps extends CardBaseProps {
  isInHand: true;
  index?: number;
  totalCards?: number;
}

// Badge-specific props
export interface BadgeProps {
  value: number;
  color: string;
  position: 'left' | 'right' | 'top' | 'bottom';
  size?: number;
  style?: React.CSSProperties;
}

// Card animation states
export interface CardAnimationState {
  isHovering: boolean;
  isDragging: boolean;
  isAnimating: boolean;
  isFlipping: boolean;
  zIndex: number;
}

// Re-export types to be used by consuming components
export type CardRarity = 'basic' | 'common' | 'rare' | 'epic' | 'mythic';
export type CardType = 'minion' | 'spell' | 'weapon';
export type CardSize = 'small' | 'medium' | 'large';