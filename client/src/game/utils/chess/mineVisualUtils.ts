/**
 * Mine Visual Utilities
 * =====================
 * Pure utility functions for Divine Command mine visual styling.
 * Provides centralized, reusable visual configurations for mine effects.
 * 
 * Architecture: TSX → Hook → Store → Utils (this file)
 */

export interface MineVisualStyle {
  background: string;
  boxShadow: string;
  borderStyle?: string;
}

export interface MineGlowAnimation {
  boxShadowKeyframes: string[];
  opacityKeyframes: number[];
  scaleKeyframes?: number[];
  duration: number;
}

export interface MineIconStyle {
  color: string;
  fontSize: string;
  textShadow: string;
  opacity: number;
}

/**
 * Get the visual style for an active mine tile (glowing hotspot effect)
 */
export const getActiveMineStyle = (): MineVisualStyle => ({
  background: 'radial-gradient(circle, rgba(251, 191, 36, 0.5) 0%, rgba(234, 179, 8, 0.35) 40%, rgba(217, 119, 6, 0.15) 70%, transparent 100%)',
  boxShadow: 'inset 0 0 20px rgba(251, 191, 36, 0.7), inset 0 0 40px rgba(234, 179, 8, 0.4), 0 0 15px rgba(251, 191, 36, 0.5)',
  borderStyle: '2px solid rgba(251, 191, 36, 0.6)'
});

/**
 * Get the pulsing glow animation keyframes for active mines
 */
export const getActiveMineGlowAnimation = (): MineGlowAnimation => ({
  boxShadowKeyframes: [
    'inset 0 0 15px rgba(251, 191, 36, 0.5), inset 0 0 30px rgba(234, 179, 8, 0.3), 0 0 12px rgba(251, 191, 36, 0.4)',
    'inset 0 0 25px rgba(251, 191, 36, 0.8), inset 0 0 50px rgba(234, 179, 8, 0.5), 0 0 25px rgba(251, 191, 36, 0.7)',
    'inset 0 0 15px rgba(251, 191, 36, 0.5), inset 0 0 30px rgba(234, 179, 8, 0.3), 0 0 12px rgba(251, 191, 36, 0.4)'
  ],
  opacityKeyframes: [0.7, 1, 0.7],
  scaleKeyframes: [1, 1.02, 1],
  duration: 1.5
});

/**
 * Get the icon style for the mine rune symbol
 */
export const getActiveMineIconStyle = (): MineIconStyle => ({
  color: 'rgb(251, 191, 36)',
  fontSize: '1rem',
  textShadow: '0 0 8px rgba(251, 191, 36, 0.9), 0 0 16px rgba(234, 179, 8, 0.7), 0 0 24px rgba(217, 119, 6, 0.5)',
  opacity: 0.9
});

/**
 * Get the icon animation keyframes
 */
export const getActiveMineIconAnimation = () => ({
  opacityKeyframes: [0.7, 1, 0.7],
  scaleKeyframes: [0.9, 1.1, 0.9],
  duration: 1.5
});

/**
 * Get the outer glow ring style (additional visibility layer)
 */
export const getMineOuterGlowStyle = (): MineVisualStyle => ({
  background: 'transparent',
  boxShadow: '0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(234, 179, 8, 0.3)'
});

/**
 * Get mine preview style (when hovering during placement)
 */
export const getMinePreviewStyle = (isValid: boolean): MineVisualStyle => ({
  background: isValid 
    ? 'radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, rgba(22, 163, 74, 0.2) 60%, transparent 100%)'
    : 'radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, rgba(220, 38, 38, 0.2) 60%, transparent 100%)',
  boxShadow: isValid
    ? 'inset 0 0 15px rgba(34, 197, 94, 0.5), 0 0 10px rgba(34, 197, 94, 0.3)'
    : 'inset 0 0 15px rgba(239, 68, 68, 0.5), 0 0 10px rgba(239, 68, 68, 0.3)'
});

/**
 * Get placement burst animation style
 */
export const getMinePlacementBurstStyle = (): MineVisualStyle => ({
  background: 'radial-gradient(circle, rgba(251, 191, 36, 0.95) 0%, rgba(234, 179, 8, 0.7) 30%, rgba(217, 119, 6, 0.4) 60%, transparent 85%)',
  boxShadow: '0 0 40px rgba(251, 191, 36, 0.9), 0 0 80px rgba(234, 179, 8, 0.5), 0 0 120px rgba(217, 119, 6, 0.3)'
});

/**
 * Get trigger explosion animation style
 */
export const getMineTriggerExplosionStyle = (): MineVisualStyle => ({
  background: 'radial-gradient(circle, rgba(239, 68, 68, 1) 0%, rgba(249, 115, 22, 0.85) 30%, rgba(234, 179, 8, 0.5) 60%, transparent 85%)',
  boxShadow: '0 0 50px rgba(239, 68, 68, 0.95), 0 0 100px rgba(249, 115, 22, 0.7), 0 0 150px rgba(234, 179, 8, 0.4)'
});

/**
 * Norse rune symbol for mines
 */
export const MINE_RUNE_SYMBOL = 'ᛉ';

/**
 * Get CSS class names for mine states
 */
export const getMineStateClasses = (state: 'active' | 'preview' | 'triggered' | 'placed'): string => {
  const baseClasses = 'absolute inset-0 pointer-events-none';
  switch (state) {
    case 'active':
      return `${baseClasses} z-10`;
    case 'preview':
      return `${baseClasses} z-15`;
    case 'triggered':
      return `${baseClasses} z-30`;
    case 'placed':
      return `${baseClasses} z-20`;
    default:
      return baseClasses;
  }
};
