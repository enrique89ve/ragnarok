/**
 * latentSpaceManager.ts
 * 
 * This utility implements a sophisticated latent space system inspired by Stable Diffusion
 * for creating advanced visual effects and transitions in premium card rendering.
 * 
 * Key features:
 * 1. High-dimensional vector representations of cards (emulating SD's latent space)
 * 2. Noise sampling and diffusion-based transitions between states
 * 3. Multi-step denoising process similar to Stable Diffusion's sampling
 * 4. Advanced interpolation methods including spherical and noise-guided techniques
 * 5. Complete integration with THREE.js shader uniforms for GPU-accelerated rendering
 * 
 * The latent space representation enables:
 * - Smooth transitions between different card states
 * - Generation of dynamic visual effects based on card properties
 * - Coherent and stable animation effects with controlled randomness
 * - Creation of holographic and parallax effects with mathematical precision
 * 
 * This system serves as a bridge between the abstract card data and its visual representation,
 * analogous to how Stable Diffusion translates text prompts into visual features.
 */

import { CardData } from '../types';
import { debug } from '../config/debugConfig';

// Types for latent space operations
export interface LatentVector {
  dimensions: number;
  values: Float32Array;
  // Metadata about the latent representation
  metadata: {
    cardId?: number | string;
    seed?: number;
    timestamp: number;
    strength: number;
    noiseLevel: number;
  };
}

export interface InterpolationOptions {
  steps?: number;
  method?: 'linear' | 'spherical' | 'noise-guided';
  strength?: number;
  seed?: number;
}

export interface DiffusionStep {
  latent: LatentVector;
  noiseScale: number;
  timestep: number;
}

/**
 * Creates a latent space representation for a card
 * This simulates how Stable Diffusion encodes images into latent space
 */
export function cardToLatentVector(card: CardData, dimensions = 64): LatentVector {
  // In a real diffusion model, this would be an encoding step
  // Here we create a deterministic "encoding" based on card properties
  const values = new Float32Array(dimensions);
  
  // Use card properties to generate a stable latent representation
  const seed = Number(card.id) * 1000 + (card.manaCost || 0) * 100;
  
  // Fill the latent vector with values derived from card properties
  for (let i = 0; i < dimensions; i++) {
    // Create a value that's:
    // - Deterministic (same card = same values)
    // - Distributed between -1 and 1 (like real latent spaces)
    // - Influenced by card properties
    const angle = (seed + i) * 0.1;
    const baseValue = Math.sin(angle) * Math.cos(angle * 0.7);
    
    // Add different "frequencies" based on card properties
    const rarityFactor = getRarityFactor(card.rarity || 'common');
    const costFactor = ((card.manaCost || 0) / 10) * 0.5;
    const typeFactor = getTypeFactor(card.type || 'minion');
    
    // Combine factors with different weights
    values[i] = baseValue * 0.5 + rarityFactor * 0.3 + costFactor * 0.1 + typeFactor * 0.1;
  }
  
  return {
    dimensions,
    values,
    metadata: {
      cardId: card.id,
      seed,
      timestamp: Date.now(),
      strength: 1.0,
      noiseLevel: 0
    }
  };
}

/**
 * Add noise to a latent vector (similar to diffusion model forward process)
 */
export function addNoiseToLatent(
  latent: LatentVector, 
  noiseAmount = 0.1, 
  seed?: number
): LatentVector {
  const noisySeed = seed || Math.random() * 10000;
  const noisyValues = new Float32Array(latent.values.length);
  
  // Add controlled noise to each dimension
  for (let i = 0; i < latent.values.length; i++) {
    const noise = (Math.sin(noisySeed + i * 0.1) * 0.5 + 0.5) * 2 - 1;
    noisyValues[i] = latent.values[i] + noise * noiseAmount;
  }
  
  return {
    ...latent,
    values: noisyValues,
    metadata: {
      ...latent.metadata,
      noiseLevel: latent.metadata.noiseLevel + noiseAmount,
      seed: noisySeed
    }
  };
}

/**
 * Interpolate between two latent vectors (moving through latent space)
 */
export function interpolateLatents(
  from: LatentVector,
  to: LatentVector,
  t: number, // Value between 0 and 1
  options: InterpolationOptions = {}
): LatentVector {
  const { 
    method = 'linear',
    strength = 1.0,
    seed = Math.random() * 10000 
  } = options;
  
  // Early returns for edge cases
  if (t <= 0) return from;
  if (t >= 1) return to;
  
  // Create a new array for the interpolated values
  const values = new Float32Array(from.values.length);
  
  // Different interpolation methods
  switch (method) {
    case 'spherical': {
      // Spherical interpolation (better preserves magnitude)
      const dot = dotProduct(from.values, to.values);
      const theta = Math.acos(Math.min(1, Math.max(-1, dot)));
      
      if (Math.abs(theta) < 1e-6) {
        // If vectors are nearly identical, use linear
        for (let i = 0; i < values.length; i++) {
          values[i] = from.values[i] * (1 - t) + to.values[i] * t;
        }
      } else {
        const sinTheta = Math.sin(theta);
        const fromWeight = Math.sin((1 - t) * theta) / sinTheta;
        const toWeight = Math.sin(t * theta) / sinTheta;
        
        for (let i = 0; i < values.length; i++) {
          values[i] = from.values[i] * fromWeight + to.values[i] * toWeight;
        }
      }
      break;
    }
    
    case 'noise-guided': {
      // Noise-guided interpolation (adds controlled noise for more variation)
      const noise = new Float32Array(from.values.length);
      const noiseScale = Math.sin(t * Math.PI) * 0.1 * strength; // Max noise in the middle
      
      // Generate deterministic noise
      for (let i = 0; i < noise.length; i++) {
        noise[i] = (Math.sin(seed + i * 0.1) * 0.5 + 0.5) * 2 - 1;
      }
      
      // Linear interpolation with noise
      for (let i = 0; i < values.length; i++) {
        const linear = from.values[i] * (1 - t) + to.values[i] * t;
        values[i] = linear + noise[i] * noiseScale;
      }
      break;
    }
    
    default:
    case 'linear': {
      // Simple linear interpolation (LERP)
      for (let i = 0; i < values.length; i++) {
        values[i] = from.values[i] * (1 - t) + to.values[i] * t;
      }
    }
  }
  
  // Return the new latent vector with updated metadata
  return {
    dimensions: from.dimensions,
    values,
    metadata: {
      timestamp: Date.now(),
      strength: strength,
      noiseLevel: Math.max(from.metadata.noiseLevel, to.metadata.noiseLevel) * (1 - t) + t,
      seed
    }
  };
}

/**
 * Simulate a diffusion model denoising process
 * This mimics how Stable Diffusion generates images
 */
export function denoisingProcess(
  latent: LatentVector,
  steps = 10
): DiffusionStep[] {
  const result: DiffusionStep[] = [];
  const currentLatent = { ...latent };
  
  // Start with the noisy latent
  for (let i = 0; i < steps; i++) {
    const t = 1 - (i / (steps - 1)); // Goes from 1 to 0
    const noiseScale = t * t; // Quadratic schedule
    
    // Update the latent for this step (simple denoising)
    for (let j = 0; j < currentLatent.values.length; j++) {
      // Progressively denoise the latent
      const noiseReduction = (1 - t) * 0.1;
      currentLatent.values[j] *= (1 - noiseReduction);
    }
    
    // Add this step to the result
    result.push({
      latent: { ...currentLatent },
      noiseScale,
      timestep: t
    });
  }
  
  return result;
}

/**
 * Generate a set of shader uniforms from latent vector
 * for use in WebGL shaders
 */
export function latentToShaderUniforms(latent: LatentVector) {
  // Pack the latent vector values into arrays suitable for shader uniforms
  const values = Array.from(latent.values);
  
  // We'll split the latent vector into chunks that fit into vec4 uniforms
  const latentVec4Count = Math.ceil(latent.values.length / 4);
  const latentVec4 = Array(latentVec4Count).fill(0).map((_, i) => {
    const start = i * 4;
    return [
      values[start] || 0,
      values[start + 1] || 0,
      values[start + 2] || 0,
      values[start + 3] || 0
    ];
  });
  
  // Return uniforms in a format that can be used by THREE.js shaders
  return {
    // The packed latent vectors
    uLatentVectors: latentVec4,
    // Metadata as individual uniforms
    uLatentStrength: latent.metadata.strength,
    uLatentNoise: latent.metadata.noiseLevel,
    uLatentSeed: latent.metadata.seed || 0,
    uLatentTimestamp: (Date.now() - (latent.metadata.timestamp || 0)) / 1000
  };
}

// Utility functions

function getRarityFactor(rarity: string): number {
  switch (rarity.toLowerCase()) {
    case 'mythic': return 1.0;
    case 'epic': return 0.8;
    case 'rare': return 0.6;
    case 'common':
    default: return 0.4;
  }
}

function getTypeFactor(type: string): number {
  switch (type.toLowerCase()) {
    case 'spell': return 0.7;
    case 'weapon': return 0.5;
    case 'minion':
    default: return 0.3;
  }
}

function dotProduct(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  const length = Math.min(a.length, b.length);
  
  for (let i = 0; i < length; i++) {
    sum += a[i] * b[i];
  }
  
  return sum;
}

// Cache of latent vectors
const latentVectorCache: { [key: string]: LatentVector } = {};

/**
 * Get a cached latent vector by id
 */
export function getVector(id: string): LatentVector | null {
  return latentVectorCache[id] || null;
}

/**
 * Generate and cache a random latent vector for an id
 */
export function generateRandomVector(id: string, dimensions = 64): LatentVector {
  // Create a seed from the ID
  const seed = Array.from(id).reduce(
    (hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0
  );
  
  // Create a random latent vector
  const values = new Float32Array(dimensions);
  for (let i = 0; i < dimensions; i++) {
    values[i] = (Math.sin(seed + i * 0.1) * 0.5 + 0.5) * 2 - 1;
  }
  
  // Create the latent vector
  const vector: LatentVector = {
    dimensions,
    values,
    metadata: {
      seed: seed,
      timestamp: Date.now(),
      strength: 1.0,
      noiseLevel: 0
    }
  };
  
  // Cache and return
  latentVectorCache[id] = vector;
  return vector;
}

/**
 * Apply an attention mechanism to a latent vector
 * This simulates the attention mechanism in Stable Diffusion
 * to focus on certain features
 */
export function applyAttention(
  latent: LatentVector,
  attentionMask: number[],
  strength = 1.0
): LatentVector {
  if (attentionMask.length !== latent.dimensions) {
    debug.warn('Attention mask dimensions do not match latent vector');
    return latent;
  }

  const newValues = new Float32Array(latent.values.length);
  
  // Apply the attention mask
  for (let i = 0; i < latent.dimensions; i++) {
    // Scale each dimension based on attention (values 0-1)
    const attentionValue = Math.max(0, Math.min(1, attentionMask[i]));
    // Apply attention with strength factor
    newValues[i] = latent.values[i] * (1 + (attentionValue - 0.5) * strength);
  }
  
  return {
    ...latent,
    values: newValues,
    metadata: {
      ...latent.metadata,
      timestamp: Date.now(),
      strength: latent.metadata.strength * strength
    }
  };
}

/**
 * Generate an attention mask for card based on card properties
 * This creates a focus pattern that highlights certain aspects
 */
export function generateCardAttentionMask(
  card: CardData,
  dimensions = 64,
  focusPoints: ('rarity' | 'type' | 'class' | 'cost')[] = ['rarity', 'type']
): number[] {
  const mask = Array(dimensions).fill(0.5); // Default neutral attention
  
  // Base seed for deterministic generation
  const seed = Number(card.id) * 1000;
  
  // Create points of focus based on card properties
  const focusMap: Record<string, number[]> = {};
  
  if (focusPoints.includes('rarity')) {
    // Rarity affects specific dimensions
    const rarityCenter = Math.floor(dimensions * 0.2);
    const rarityStrength = getRarityFactor(card.rarity || 'common');
    
    for (let i = 0; i < dimensions / 8; i++) {
      const pos = (rarityCenter + i) % dimensions;
      focusMap[pos] = (focusMap[pos] || []).concat([rarityStrength]);
    }
  }
  
  if (focusPoints.includes('type')) {
    // Type affects different dimensions
    const typeCenter = Math.floor(dimensions * 0.5);
    const typeStrength = getTypeFactor(card.type || 'minion');
    
    for (let i = 0; i < dimensions / 6; i++) {
      const pos = (typeCenter + i) % dimensions;
      focusMap[pos] = (focusMap[pos] || []).concat([typeStrength]);
    }
  }
  
  if (focusPoints.includes('class')) {
    // Class affects another region
    const classCenter = Math.floor(dimensions * 0.7);
    const classStrength = card.class === 'Neutral' ? 0.4 : 0.8;
    
    for (let i = 0; i < dimensions / 7; i++) {
      const pos = (classCenter + i) % dimensions;
      focusMap[pos] = (focusMap[pos] || []).concat([classStrength]);
    }
  }
  
  if (focusPoints.includes('cost')) {
    // Cost affects another region
    const costCenter = Math.floor(dimensions * 0.9);
    const costFactor = ((card.manaCost || 0) / 10) * 0.8;
    
    for (let i = 0; i < dimensions / 10; i++) {
      const pos = (costCenter + i) % dimensions;
      focusMap[pos] = (focusMap[pos] || []).concat([costFactor]);
    }
  }
  
  // Apply the focus points to create the mask
  Object.entries(focusMap).forEach(([posStr, values]) => {
    const pos = parseInt(posStr, 10);
    // Take the maximum attention value for this position
    mask[pos] = Math.max(...values, 0.5);
  });
  
  return mask;
}

/**
 * Creates a conditional latent vector based on specific attributes
 * Similar to how Stable Diffusion uses conditional information
 */
export function createConditionalLatent(
  baseLatent: LatentVector,
  conditions: {
    rarity?: string;
    type?: string;
    class?: string;
    isGolden?: boolean;
  }
): LatentVector {
  const newValues = new Float32Array(baseLatent.values.length);
  const conditionSeed = conditions.isGolden ? 42 : 0;
  
  // Copy the base latent
  for (let i = 0; i < baseLatent.values.length; i++) {
    newValues[i] = baseLatent.values[i];
  }
  
  // Apply conditional modifiers to specific regions of the latent space
  if (conditions.rarity) {
    const rarityFactor = getRarityFactor(conditions.rarity);
    // Apply to first quarter
    for (let i = 0; i < baseLatent.values.length / 4; i++) {
      // Mix in rarity influence
      newValues[i] = newValues[i] * (1 - 0.3) + rarityFactor * 0.3;
    }
  }
  
  if (conditions.type) {
    const typeFactor = getTypeFactor(conditions.type);
    // Apply to second quarter
    for (let i = Math.floor(baseLatent.values.length / 4); i < baseLatent.values.length / 2; i++) {
      // Mix in type influence
      newValues[i] = newValues[i] * (1 - 0.3) + typeFactor * 0.3;
    }
  }
  
  if (conditions.isGolden) {
    // Apply a golden effect pattern
    for (let i = 0; i < baseLatent.values.length; i++) {
      const goldModulation = Math.sin((i / baseLatent.values.length) * Math.PI * 8) * 0.2;
      newValues[i] += goldModulation;
    }
  }
  
  return {
    dimensions: baseLatent.dimensions,
    values: newValues,
    metadata: {
      ...baseLatent.metadata,
      timestamp: Date.now(),
      strength: baseLatent.metadata.strength,
      seed: (baseLatent.metadata.seed || 0) + conditionSeed
    }
  };
}

/**
 * Apply a cross attention effect between two latent vectors
 * Similar to how Stable Diffusion combines text and image features
 */
export function crossAttention(
  sourceLatent: LatentVector,
  targetLatent: LatentVector,
  strength = 0.5
): LatentVector {
  const newValues = new Float32Array(sourceLatent.values.length);
  
  // Calculate attention scores between dimensions (simplified cross-attention)
  for (let i = 0; i < sourceLatent.values.length; i++) {
    // For each dimension, calculate a weighted influence from the target
    let attentionSum = 0;
    let weightSum = 0;
    
    for (let j = 0; j < targetLatent.values.length; j++) {
      // Calculate similarity (dot product of individual elements as a simple attention mechanism)
      const similarity = Math.abs(sourceLatent.values[i] * targetLatent.values[j]);
      attentionSum += targetLatent.values[j] * similarity;
      weightSum += similarity;
    }
    
    // Avoid division by zero
    const attentionValue = weightSum > 0 ? attentionSum / weightSum : 0;
    
    // Mix the original value with the attention-weighted value
    newValues[i] = sourceLatent.values[i] * (1 - strength) + attentionValue * strength;
  }
  
  return {
    dimensions: sourceLatent.dimensions,
    values: newValues,
    metadata: {
      ...sourceLatent.metadata,
      timestamp: Date.now(),
      strength: sourceLatent.metadata.strength * (1 - strength) + targetLatent.metadata.strength * strength
    }
  };
}

export default {
  // Original methods
  cardToLatentVector,
  addNoiseToLatent,
  interpolateLatents,
  denoisingProcess,
  latentToShaderUniforms,
  getVector,
  generateRandomVector,
  
  // New advanced methods
  applyAttention,
  generateCardAttentionMask,
  createConditionalLatent,
  crossAttention
};