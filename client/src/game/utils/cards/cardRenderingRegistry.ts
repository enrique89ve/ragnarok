/**
 * Card Rendering Registry
 * 
 * This module provides a comprehensive registry and management system
 * for all card rendering implementations in the application.
 * 
 * It consolidates all available renderers, provides information about
 * their capabilities, and ensures that only one renderer is active
 * throughout the application to prevent conflicts and invisible boxes.
 */

import { CardData, CardInstance, CardQuality } from '../../types';
import { debug } from '../../config/debugConfig';

/**
 * Types of card renderers available in the system
 */
export type CardRendererType = 
  | 'SimpleCard3D'           // Simple ThreeJS card with minimal effects
  | 'UltimatePremiumCard3D'  // Advanced card with full effects and complex materials
  | 'EnhancedCard3D'         // Card with spring animations and physics
  | 'DiffusionEnhancedCard3D' // Card with stable diffusion inspired effects
  | 'TripoSRCardIntegration'  // Integration component for TripoSR style rendering
  | 'LegacyCardComponent'     // Old 2D card system
  | 'MinimalCardTest'         // Debug/testing card rendering
  | 'NorseFrameCard'          // Norse-themed frame rendering
  | 'CardRenderer';           // New unified renderer facade component

/**
 * Features supported by different renderers
 */
export interface RendererFeatures {
  supportsPremiumEffects: boolean;
  supportsAnimations: boolean;
  supportsDragAndDrop: boolean;
  supportsCardText: boolean;
  supportsAttackHealth: boolean;
  supportsTilting: boolean;
  supportsHoverEffects: boolean;
  memory: 'low' | 'medium' | 'high';
  performance: 'low' | 'medium' | 'high';
  isStable: boolean;
}

/**
 * Comprehensive information about each renderer
 */
interface RendererInfo {
  type: CardRendererType;
  name: string;
  description: string;
  features: RendererFeatures;
  component: string; // Path to the component
  active: boolean;
}

/**
 * Registry of all card renderers in the application
 */
export const CARD_RENDERERS: Record<CardRendererType, RendererInfo> = {
  'CardRenderer': {
    type: 'CardRenderer',
    name: 'Unified Card Renderer',
    description: 'A facade component that ensures rendering consistency across the application',
    features: {
      supportsPremiumEffects: true,
      supportsAnimations: true,
      supportsDragAndDrop: true,
      supportsCardText: true,
      supportsAttackHealth: true,
      supportsTilting: true,
      supportsHoverEffects: true,
      memory: 'medium',
      performance: 'high',
      isStable: true
    },
    component: 'client/src/game/components/CardRendering/CardRenderer.tsx',
    active: true
  },
  'SimpleCard3D': {
    type: 'SimpleCard3D',
    name: 'Simple 3D Card',
    description: 'A lightweight 3D card renderer with good performance',
    features: {
      supportsPremiumEffects: true,
      supportsAnimations: true,
      supportsDragAndDrop: true,
      supportsCardText: true,
      supportsAttackHealth: true,
      supportsTilting: true,
      supportsHoverEffects: true,
      memory: 'low',
      performance: 'high',
      isStable: true
    },
    component: 'client/src/game/components/3D/SimpleCard3D.tsx',
    active: false
  },
  'UltimatePremiumCard3D': {
    type: 'UltimatePremiumCard3D',
    name: 'Ultimate Premium Card 3D',
    description: 'Full-featured 3D card with advanced visual effects',
    features: {
      supportsPremiumEffects: true,
      supportsAnimations: true,
      supportsDragAndDrop: true,
      supportsCardText: true,
      supportsAttackHealth: true,
      supportsTilting: true,
      supportsHoverEffects: true,
      memory: 'high',
      performance: 'medium',
      isStable: true
    },
    component: 'client/src/game/components/3D/UltimatePremiumCard3D.tsx',
    active: false
  },
  'EnhancedCard3D': {
    type: 'EnhancedCard3D',
    name: 'Enhanced Card 3D',
    description: 'Card with spring-physics based animations',
    features: {
      supportsPremiumEffects: true,
      supportsAnimations: true,
      supportsDragAndDrop: true,
      supportsCardText: true,
      supportsAttackHealth: true,
      supportsTilting: true,
      supportsHoverEffects: true,
      memory: 'medium',
      performance: 'medium',
      isStable: true
    },
    component: 'client/src/game/components/3D/EnhancedCard3D.tsx',
    active: false
  },
  'DiffusionEnhancedCard3D': {
    type: 'DiffusionEnhancedCard3D',
    name: 'Diffusion Enhanced Card 3D',
    description: 'Card with stable diffusion inspired visual effects',
    features: {
      supportsPremiumEffects: true,
      supportsAnimations: true,
      supportsDragAndDrop: true,
      supportsCardText: true,
      supportsAttackHealth: true,
      supportsTilting: true,
      supportsHoverEffects: true,
      memory: 'high',
      performance: 'low',
      isStable: false
    },
    component: 'client/src/game/components/3D/DiffusionEnhancedCard3D.tsx',
    active: false
  },
  'TripoSRCardIntegration': {
    type: 'TripoSRCardIntegration',
    name: 'TripoSR Card Integration',
    description: 'Integration component for TripoSR-style rendering with Norse theme',
    features: {
      supportsPremiumEffects: true,
      supportsAnimations: true,
      supportsDragAndDrop: true,
      supportsCardText: true,
      supportsAttackHealth: true,
      supportsTilting: true,
      supportsHoverEffects: true,
      memory: 'medium',
      performance: 'high',
      isStable: true
    },
    component: 'client/src/game/components/TripoSRCardIntegration.tsx',
    active: true
  },
  'LegacyCardComponent': {
    type: 'LegacyCardComponent',
    name: 'Legacy Card Component',
    description: '2D card rendering used in the original implementation',
    features: {
      supportsPremiumEffects: false,
      supportsAnimations: false,
      supportsDragAndDrop: true,
      supportsCardText: true,
      supportsAttackHealth: true,
      supportsTilting: false,
      supportsHoverEffects: true,
      memory: 'low',
      performance: 'high',
      isStable: true
    },
    component: 'client/src/game/components/Card.tsx',
    active: false
  },
  'MinimalCardTest': {
    type: 'MinimalCardTest',
    name: 'Minimal Card Test',
    description: 'Simplified card implementation for testing',
    features: {
      supportsPremiumEffects: false,
      supportsAnimations: false,
      supportsDragAndDrop: false,
      supportsCardText: true,
      supportsAttackHealth: true,
      supportsTilting: false,
      supportsHoverEffects: true,
      memory: 'low',
      performance: 'high',
      isStable: true
    },
    component: 'client/src/game/components/MinimalCardTest.tsx',
    active: false
  },
  'NorseFrameCard': {
    type: 'NorseFrameCard',
    name: 'Norse Frame Card',
    description: 'Norse mythology themed card frame with premium effects',
    features: {
      supportsPremiumEffects: true,
      supportsAnimations: true,
      supportsDragAndDrop: true, // Enabled drag and drop support for seamless integration
      supportsCardText: true,
      supportsAttackHealth: true,
      supportsTilting: true, // Enabled tilting for enhanced interaction
      supportsHoverEffects: true,
      memory: 'medium',
      performance: 'high', // Optimized performance
      isStable: true
    },
    component: 'client/src/game/components/NorseFrame/NorseFrame.tsx',
    active: true
  }
};

// The currently active card rendering system
export const ACTIVE_CARD_RENDERER: CardRendererType = 'CardRenderer';

/**
 * Validate a card object to ensure it has all required properties
 */
export function validateCard(card: any): boolean {
  // Skip validation for effect-only objects
  if (card && card.type === 'transform' && !('id' in card)) {
    // Mark effect objects so they don't trigger the warning
    // These are not actual cards but effect descriptors
    return true;
  }

  // Basic validation - check for required properties
  const requiredProperties = ['id', 'name', 'type'];
  
  // Check if card is null or undefined
  if (!card) {
    debug.warn('❌ Card validation: Received null or undefined card');
    return false;
  }
  
  // Handle nested card.card structure
  if ('card' in card && card.card) {
    return validateCard(card.card);
  }
  
  // Check required properties
  for (const prop of requiredProperties) {
    if (!(prop in card)) {
      debug.warn(`❌ Card validation: Missing required property "${prop}"`, card);
      return false;
    }
  }
  
  // Type-specific validations
  if (card.type === 'minion' && !('attack' in card || 'health' in card)) {
    debug.warn('❌ Card validation: Minion card missing attack or health', card);
    return false;
  }
  
  if (card.type === 'spell' && !('manaCost' in card || 'cost' in card)) {
    debug.warn('❌ Card validation: Spell card missing manaCost', card);
    return false;
  }
  
  return true;
}

/**
 * Get the active card renderer
 */
export function getActiveRenderer(): RendererInfo {
  return CARD_RENDERERS[ACTIVE_CARD_RENDERER];
}

/**
 * Determine the appropriate renderer for a specific card
 */
export function getRendererForCard(
  card: CardData | CardInstance, 
  quality: CardQuality = 'normal',
  isInHand: boolean = false
): CardRendererType {
  // Validate the card first
  if (!validateCard(card)) {
    debug.warn('⚠️ Using fallback renderer for invalid card:', card);
    // Return the active renderer even for invalid cards - we'll let the renderer handle fallbacks
  }
  
  // For now, always return the active renderer
  // In the future, this could use card properties to determine the best renderer
  return ACTIVE_CARD_RENDERER;
}

/**
 * Initialize the card rendering system
 */
export function initializeCardRendering(): void {
  
  // Update the active state in the registry
  Object.keys(CARD_RENDERERS).forEach(key => {
    const rendererType = key as CardRendererType;
    CARD_RENDERERS[rendererType].active = (rendererType === ACTIVE_CARD_RENDERER);
  });
}

// Initialize the rendering system when this module is imported
initializeCardRendering();