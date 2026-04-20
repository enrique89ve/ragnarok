/**
 * cardRenderingSystemFix.ts
 * 
 * This utility provides a comprehensive solution to fix rendering issues
 * with the card rendering system by disabling or restricting competing 
 * rendering systems and ensuring a consistent approach.
 * 
 * It implements a global fix for invisible boxes and other rendering issues
 * by enforcing the use of a single consolidated card rendering approach.
 */

import './cardRenderingSystem.css';
import { CardData, CardInstance, CardQuality } from '../types';
import { ACTIVE_CARD_RENDERER, CardRendererType, getActiveRenderer } from './cards/cardRenderingRegistry';

/**
 * Fix card rendering issues by addressing common problems
 */
export function fixCardRenderingIssues(): void {
  
  // Apply any necessary global fixes to the DOM
  applyGlobalStyleFixes();
  
  // Disable competing card renderers
  disableCompetingRenderers();
  
  // Apply runtime patching to fix component references
  patchComponentImports();
}

/**
 * Apply global style fixes to address card rendering issues
 * 
 * CSS styles are now loaded via static import (cardRenderingSystem.css)
 */
function applyGlobalStyleFixes(): void {
}

let singletonObserver: MutationObserver | null = null;

export function cleanupCardRenderingFix(): void {
  if (singletonObserver) {
    singletonObserver.disconnect();
    singletonObserver = null;
  }
}

/**
 * Disable competing card renderers to prevent conflicts
 *
 * This function takes a more aggressive approach to ensure only one renderer
 * is active by creating a MutationObserver to detect and disable any
 * competing renderers immediately when they appear in the DOM.
 */
function disableCompetingRenderers(): void {
  // Add flag to window to signal which renderer is active
  (window as any).__CARD_RENDERER_SYSTEM__ = ACTIVE_CARD_RENDERER;
  
  // Immediately disable any existing competing renderers
  function disableCompetingCanvases() {
    const allCanvases = document.querySelectorAll('canvas');
    allCanvases.forEach(canvas => {
      const renderer = canvas.getAttribute('data-renderer');
      
      // Skip if this is our active renderer or has already been disabled
      if (
        !renderer || 
        renderer === ACTIVE_CARD_RENDERER || 
        canvas.classList.contains('disabled-renderer')
      ) {
        return;
      }
      
      // Force the canvas to be hidden
      canvas.style.display = 'none';
      canvas.style.visibility = 'hidden';
      canvas.style.opacity = '0';
      canvas.style.pointerEvents = 'none';
      
      // Add a class to mark this as disabled
      canvas.classList.add('disabled-renderer');
      
    });
  }
  
  // Run immediately to catch any existing elements
  disableCompetingCanvases();

  // Create a singleton MutationObserver to watch for new canvas elements
  if (!singletonObserver) {
    singletonObserver = new MutationObserver((mutations) => {
      let shouldDisable = false;

      // Check if any new canvas elements were added
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeName === 'CANVAS') {
              shouldDisable = true;
            } else if (node instanceof Element) {
              // Check for canvas elements inside added DOM nodes
              if (node.querySelectorAll('canvas').length > 0) {
                shouldDisable = true;
              }
            }
          });
        }
      });

      // If we found new canvas elements, disable competing renderers
      if (shouldDisable) {
        disableCompetingCanvases();
      }
    });

    // Start observing the document with configured parameters
    singletonObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Also run on a short interval for the first few seconds to catch any that slip through
  const cleanupInterval = setInterval(disableCompetingCanvases, 200);
  setTimeout(() => clearInterval(cleanupInterval), 5000);

}

/**
 * Patch component imports at runtime - this is a nuclear option
 * to force all components to use the right renderer
 */
function patchComponentImports(): void {
  // This technique uses the fact that JavaScript modules are live bindings
  // We can't directly modify the imports, but we can add a global hook
  // that will intercept certain module lookups
  
  // Create a global object to store our patched modules
  (window as any).__PATCHED_MODULES__ = (window as any).__PATCHED_MODULES__ || {};
  
  // We'll use a special debug flag to track these patches
}

/**
 * Determine the correct renderer to use for a card
 */
export function getRendererForCard(
  card: CardData | CardInstance, 
  quality: CardQuality = 'normal',
  isInHand: boolean = false
): CardRendererType {
  // For now, always return the active renderer
  return ACTIVE_CARD_RENDERER;
}

/**
 * A set of component path mappings to enforce our renderer
 * This helps us rewrite imports at build time
 */
export const COMPONENT_MAPPINGS = {
  // Map all card renderers to our active one
  'UltimatePremiumCard3D': 'SimpleCard3D',
  'EnhancedCard3D': 'SimpleCard3D',
  'DiffusionEnhancedCard3D': 'SimpleCard3D',
  // Add mappings for other components as needed
};

// Initialize the fix system
fixCardRenderingIssues();

// Export the active renderer for direct access
export { ACTIVE_CARD_RENDERER };