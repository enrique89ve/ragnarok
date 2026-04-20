/**
 * Combo Handlers Index
 * 
 * This file exports all combo handlers for registration with the EffectRegistry
 */
import executeBuffSelfBuffSelf from './buffSelfHandler';

// Map of all combo handlers
const comboHandlers = {
  'buff_self': executeBuffSelfBuffSelf
};

export default comboHandlers;
