/**
 * soundUtils.ts
 * 
 * Utility functions for working with sound effects and audio in the game
 */

import { SoundEffectType } from '../../lib/stores/useAudio';
import { useAudio } from '../../lib/stores/useAudio';

/**
 * Maps animation types to appropriate sound effects
 * @param animationType The type of animation
 * @returns The corresponding sound effect type
 */
export const getAnimationSound = (animationType: string): SoundEffectType => {
  switch (animationType) {
    case 'attack':
      return 'attack';
    case 'damage':
      return 'damage';
    case 'heal':
      return 'heal';
    case 'spell':
      return 'spell';
    case 'battlecry':
      return 'battlecry';
    case 'play':
      return 'card_play';
    case 'draw':
      return 'card_draw';
    case 'death':
      return 'deathrattle';
    case 'secret_reveal':
      return 'secret_trigger';
    case 'hero_power':
      return 'hero_power';
    case 'battlecry_damage':
      return 'damage';
    case 'battlecry_heal':
      return 'heal';
    case 'battlecry_draw':
      return 'card_draw';
    case 'battlecry_discover':
      return 'discover';
    case 'battlecry_aoe':
      return 'spell';
    case 'battlecry_freeze':
      return 'freeze';
    case 'enhanced_death':
      return 'deathrattle';
    default:
      return 'card_play'; // Default sound
  }
};

// Time delays for various animation types (in milliseconds)
export const getAnimationDuration = (animationType: string): number => {
  switch (animationType) {
    case 'attack':
      return 700;
    case 'damage':
      return 500;
    case 'heal':
      return 1000;
    case 'spell':
      return 1500;
    case 'battlecry':
      return 1200;
    case 'play':
      return 500;
    case 'draw':
      return 300;
    case 'death':
      return 1000;
    case 'secret_reveal':
      return 1500;
    case 'hero_power':
      return 800;
    case 'enhanced_death':
      return 2500;
    default:
      return 800; // Default duration
  }
};

/**
 * Function to play a sound effect using the audio store
 * This is for legacy compatibility with components that import this function directly
 * @param soundType Type of sound effect to play
 */
export const playSound = (soundType: string): void => {
  // Get the audio store and play the sound
  const audioStore = useAudio.getState();
  
  // Map common sound types to appropriate SoundEffectType
  let effectType: SoundEffectType;
  
  switch (soundType) {
    case 'card_hover':
      effectType = 'card_hover';
      break;
    case 'card_place':
      effectType = 'card_play';
      break;
    case 'card_movement':
      effectType = 'card_draw';
      break;
    default:
      // Try to use the sound type directly if it's a valid SoundEffectType
      effectType = soundType as SoundEffectType;
  }
  
  if (audioStore && audioStore.playSoundEffect) {
    audioStore.playSoundEffect(effectType);
  }
};

export default {
  getAnimationSound,
  getAnimationDuration,
  playSound
};