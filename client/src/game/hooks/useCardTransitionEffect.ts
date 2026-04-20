/**
 * useCardTransitionEffect.ts
 * 
 * This hook implements Stable Diffusion-inspired transition effects
 * for premium card rendering. It simulates the diffusion model's denoising
 * process to create smooth, natural transitions between card states.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import latentSpaceManager from '../utils/latentSpaceManager';

interface CardTransitionOptions {
  duration?: number;
  noiseScale?: number;
  noiseSpeed?: number;
  diffusionSteps?: number;
  seed?: string | number;
  density?: number;
  turbulence?: number;
}

interface CardTransitionResult {
  progress: number;
  noiseValue: number;
  isTransitioning: boolean;
  transitionVector: Float32Array | null;
  startTransition: () => void;
  stopTransition: () => void;
}

/**
 * Hook for creating Stable Diffusion-inspired transition effects for cards
 */
export default function useCardTransitionEffect(options: CardTransitionOptions = {}): CardTransitionResult {
  const {
    duration = 500,
    noiseScale = 0.1,
    noiseSpeed = 0.5,
    diffusionSteps = 10,
    seed = Math.random() * 10000,
    density = 0.8,
    turbulence = 0.1
  } = options;

  const [progress, setProgress] = useState(0);
  const [noiseValue, setNoiseValue] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionVector, setTransitionVector] = useState<Float32Array | null>(null);
  
  // References for animation
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Generate a seed based on string or number input
  const numericSeed = useRef<number>(
    typeof seed === 'string' 
      ? seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) 
      : seed
  );

  // Create initial and target latent vectors
  const fromVectorRef = useRef(latentSpaceManager.generateRandomVector(`transition_from_${numericSeed.current}`, 32));
  const toVectorRef = useRef(latentSpaceManager.generateRandomVector(`transition_to_${numericSeed.current}`, 32));

  // Add noise to vectors for more interesting transitions
  fromVectorRef.current = latentSpaceManager.addNoiseToLatent(
    fromVectorRef.current, 
    turbulence,
    numericSeed.current
  );
  
  toVectorRef.current = latentSpaceManager.addNoiseToLatent(
    toVectorRef.current,
    turbulence * 0.8,
    numericSeed.current + 100
  );

  // Stop any running animation
  const stopTransition = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsTransitioning(false);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopTransition();
    };
  }, [stopTransition]);

  // Start a new transition
  const startTransition = useCallback(() => {
    // Stop any existing animation
    stopTransition();
    
    // Create new vectors for this transition with slight variations
    fromVectorRef.current = latentSpaceManager.addNoiseToLatent(
      fromVectorRef.current,
      noiseScale * 0.2,
      numericSeed.current + Date.now() % 1000
    );
    
    toVectorRef.current = latentSpaceManager.addNoiseToLatent(
      toVectorRef.current,
      noiseScale * 0.15,
      numericSeed.current + 100 + Date.now() % 1000
    );
    
    // Reset state
    setProgress(0);
    setIsTransitioning(true);
    startTimeRef.current = Date.now();
    
    // Generate diffusion steps
    const diffusionProcess = latentSpaceManager.denoisingProcess(
      fromVectorRef.current, 
      diffusionSteps
    );
    
    // Start animation
    const animateTransition = (time: number) => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min(1, elapsed / duration);
      
      // Calculate current step in diffusion process
      const stepIndex = Math.min(
        diffusionSteps - 1,
        Math.floor(newProgress * diffusionSteps)
      );
      
      // Get current diffusion step
      const currentStep = diffusionProcess[stepIndex];
      
      // Interpolate between steps for smoother transition
      const stepProgress = (newProgress * diffusionSteps) % 1;
      const nextStepIndex = Math.min(stepIndex + 1, diffusionSteps - 1);
      
      // Interpolate between current and next step
      let currentVector;
      if (stepIndex < diffusionSteps - 1) {
        currentVector = latentSpaceManager.interpolateLatents(
          currentStep.latent,
          diffusionProcess[nextStepIndex].latent,
          stepProgress,
          { method: 'noise-guided', strength: density }
        );
      } else {
        // Final step - interpolate to target
        currentVector = latentSpaceManager.interpolateLatents(
          currentStep.latent,
          toVectorRef.current,
          newProgress,
          { method: 'spherical', strength: density }
        );
      }
      
      // Set current noise value for visuals
      setNoiseValue(currentStep.noiseScale * noiseScale);
      setTransitionVector(currentVector.values);
      setProgress(newProgress);
      
      // Continue animation if not complete
      if (newProgress < 1) {
        animationRef.current = requestAnimationFrame(animateTransition);
      } else {
        setIsTransitioning(false);
        
        // Swap vectors for next transition
        const temp = fromVectorRef.current;
        fromVectorRef.current = toVectorRef.current;
        toVectorRef.current = temp;
      }
    };
    
    // Start animation
    animationRef.current = requestAnimationFrame(animateTransition);
  }, [duration, noiseScale, diffusionSteps, density, stopTransition, turbulence]);

  return {
    progress,
    noiseValue,
    isTransitioning,
    transitionVector,
    startTransition,
    stopTransition
  };
}