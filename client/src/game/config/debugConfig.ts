/**
 * Debug configuration for the game
 * Controls logging verbosity and debug features
 */

interface DebugConfig {
  enableLogging: boolean;
  enableVerboseLogging: boolean;
  enablePerformanceLogging: boolean;
  logCardOperations: boolean;
  logManaOperations: boolean;
  logGameState: boolean;
  logAIDecisions: boolean;
  logBattlefieldChanges: boolean;
  logCombat: boolean;
  logChess: boolean;
  logDrag: boolean;
  log3D: boolean;
  logAnimations: boolean;
}

const IS_DEV = import.meta.env?.DEV ?? process.env.NODE_ENV === 'development';

const debugConfig: DebugConfig = {
  enableLogging: IS_DEV,
  enableVerboseLogging: false,
  enablePerformanceLogging: false,
  logCardOperations: false,
  logManaOperations: false,
  logGameState: false,
  logAIDecisions: false,
  logBattlefieldChanges: false,
  logCombat: false,
  logChess: false,
  logDrag: false,
  log3D: false,
  logAnimations: false,
};

export const debug = {
  log: (...args: unknown[]) => {
    if (debugConfig.enableLogging) {
      console.log(...args);
    }
  },
  verbose: (...args: unknown[]) => {
    if (debugConfig.enableVerboseLogging) {
      console.log('[VERBOSE]', ...args);
    }
  },
  card: (...args: unknown[]) => {
    if (debugConfig.logCardOperations) {
      console.log('[CARD]', ...args);
    }
  },
  mana: (...args: unknown[]) => {
    if (debugConfig.logManaOperations) {
      console.log('[MANA]', ...args);
    }
  },
  state: (...args: unknown[]) => {
    if (debugConfig.logGameState) {
      console.log('[STATE]', ...args);
    }
  },
  ai: (...args: unknown[]) => {
    if (debugConfig.logAIDecisions) {
      console.log('[AI]', ...args);
    }
  },
  combat: (...args: unknown[]) => {
    if (debugConfig.logCombat) {
      console.log('[COMBAT]', ...args);
    }
  },
  chess: (...args: unknown[]) => {
    if (debugConfig.logChess) {
      console.log('[CHESS]', ...args);
    }
  },
  drag: (...args: unknown[]) => {
    if (debugConfig.logDrag) {
      console.log('[DRAG]', ...args);
    }
  },
  render3d: (...args: unknown[]) => {
    if (debugConfig.log3D) {
      console.log('[3D]', ...args);
    }
  },
  animation: (...args: unknown[]) => {
    if (debugConfig.logAnimations) {
      console.log('[ANIM]', ...args);
    }
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  }
};

let _isAISimulation = false;

export const setAISimulationMode = (value: boolean): void => {
  _isAISimulation = value;
};

export const isAISimulationMode = (): boolean => {
  if (_isAISimulation) return true;
  if (typeof window === 'undefined') return false;
  try {
    const path = window.location.pathname;
    return path === '/ai-game' || path === '/ai' || path.startsWith('/ai-game/');
  } catch {
    return false;
  }
};

export const setDebugOption = (option: keyof DebugConfig, value: boolean) => {
  debugConfig[option] = value;
};

export const getDebugConfig = () => ({ ...debugConfig });

export default debugConfig;
