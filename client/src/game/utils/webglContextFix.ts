import { debug } from '../config/debugConfig';
/**
 * WebGL Context Fix Utility
 * 
 * This utility handles WebGL context issues that can occur when rendering 3D cards.
 * It addresses the "Canvas has an existing context of a different type" error
 * and provides methods for safely creating and managing WebGL contexts.
 * 
 * Key features:
 * 1. Canvas replacement for broken contexts
 * 2. WebGL context detection and management
 * 3. Error recovery for failed context creation
 * 4. Diagnostics for WebGL support
 */

// Track all created canvas elements and their contexts
const canvasRegistry = new Map<HTMLCanvasElement, {
  contextType: string;
  context: any;
}>();

// Track active WebGL contexts
let activeWebGLContexts = 0;

/**
 * Checks if WebGL is supported in the current browser
 */
export function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    debug.error('Error checking WebGL support:', e);
    return false;
  }
}

/**
 * Counts the number of active WebGL contexts
 */
export function countActiveWebGLContexts(): number {
  return activeWebGLContexts;
}

/**
 * Creates a replacement canvas with the same dimensions and properties
 * as the original canvas
 */
function createReplacementCanvas(originalCanvas: HTMLCanvasElement): HTMLCanvasElement {
  // Create new canvas
  const newCanvas = document.createElement('canvas');
  
  // Copy dimensions
  newCanvas.width = originalCanvas.width;
  newCanvas.height = originalCanvas.height;
  
  // Copy style attributes
  const originalStyle = window.getComputedStyle(originalCanvas);
  Array.from(originalStyle).forEach(key => {
    try {
      // @ts-ignore
      newCanvas.style[key] = originalStyle.getPropertyValue(key);
    } catch (e) {
      // Ignore unsupported style properties
    }
  });
  
  // Copy classnames
  newCanvas.className = originalCanvas.className;
  
  // Copy dataset
  Object.keys(originalCanvas.dataset).forEach(key => {
    newCanvas.dataset[key] = originalCanvas.dataset[key] || '';
  });
  
  // Copy attributes
  Array.from(originalCanvas.attributes).forEach(attr => {
    if (attr.name !== 'style' && attr.name !== 'class') {
      newCanvas.setAttribute(attr.name, attr.value);
    }
  });
  
  return newCanvas;
}

/**
 * Clean up and properly dispose of a WebGL context
 */
function disposeContext(canvas: HTMLCanvasElement, context: WebGLRenderingContext): void {
  try {
    // Get all WebGL extensions
    const ext = context.getExtension('WEBGL_lose_context');
    if (ext) {
      ext.loseContext();
    }
    
    // Remove canvas from registry
    canvasRegistry.delete(canvas);
    activeWebGLContexts--;
  } catch (e) {
    debug.error('Error disposing WebGL context:', e);
  }
}

/**
 * Monkey patch the canvas.getContext method to handle errors
 * and automatically replace the canvas if a context error occurs
 */
export function patchCanvasGetContext(): void {
  // Store the original getContext method
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  
  // Replace with our patched version
  (HTMLCanvasElement.prototype as any).getContext = function(
    contextType: string,
    contextAttributes?: any
  ): any {
    // Check if this canvas already has a context of a different type
    const existingRegistration = canvasRegistry.get(this);
    if (existingRegistration && existingRegistration.contextType !== contextType) {
      debug.warn(
        `Canvas already has a context of type ${existingRegistration.contextType}, ` +
        `but ${contextType} was requested. Creating replacement canvas.`
      );
      
      // If this is WebGL, dispose of it properly
      if (
        existingRegistration.contextType === 'webgl' || 
        existingRegistration.contextType === 'experimental-webgl'
      ) {
        disposeContext(this, existingRegistration.context as WebGLRenderingContext);
      }
      
      // Create a replacement canvas
      const replacementCanvas = createReplacementCanvas(this);
      
      // Replace the original canvas in the DOM
      if (this.parentNode) {
        this.parentNode.insertBefore(replacementCanvas, this);
        this.parentNode.removeChild(this);
      }
      
      // Get context on the new canvas
      return replacementCanvas.getContext(contextType, contextAttributes);
    }
    
    // Try to get the context normally
    try {
      const context = (originalGetContext as Function).call(this, contextType, contextAttributes);
      
      // Register this canvas and context
      if (context) {
        canvasRegistry.set(this, {
          contextType,
          context
        });
        
        // Track active WebGL contexts
        if (contextType === 'webgl' || contextType === 'experimental-webgl') {
          activeWebGLContexts++;
        }
      }
      
      return context;
    } catch (e) {
      debug.error('Error creating context:', e);
      
      // If this error is related to WebGL, try a replacement canvas
      if (contextType === 'webgl' || contextType === 'experimental-webgl') {
        debug.warn('WebGL context creation failed. Creating replacement canvas.');
        
        // Create a replacement canvas
        const replacementCanvas = createReplacementCanvas(this);
        
        // Replace the original canvas in the DOM
        if (this.parentNode) {
          this.parentNode.insertBefore(replacementCanvas, this);
          this.parentNode.removeChild(this);
        }
        
        // Try again with the new canvas
        try {
          const context = (originalGetContext as Function).call(replacementCanvas, contextType, contextAttributes);
          
          // Register this canvas and context
          if (context) {
            canvasRegistry.set(replacementCanvas, {
              contextType,
              context
            });
            
            // Track active WebGL contexts
            if (contextType === 'webgl' || contextType === 'experimental-webgl') {
              activeWebGLContexts++;
            }
          }
          
          return context;
        } catch (e2) {
          debug.error('Error creating context on replacement canvas:', e2);
          return null;
        }
      }
      
      return null;
    }
  };
}

/**
 * Clean up all WebGL contexts
 */
export function cleanupAllWebGLContexts(): void {
  canvasRegistry.forEach((registration, canvas) => {
    if (
      registration.contextType === 'webgl' || 
      registration.contextType === 'experimental-webgl'
    ) {
      disposeContext(canvas, registration.context as WebGLRenderingContext);
    }
  });
  
  canvasRegistry.clear();
  activeWebGLContexts = 0;
}

// Initialize the patches
patchCanvasGetContext();