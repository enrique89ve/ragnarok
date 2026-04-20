import { ensureBridgeRuntime } from '@/game/runtime/bridgeRuntime';
import { ensureCardDataRuntime } from '@/game/runtime/cardDataRuntime';

type GameplayModules = {
  default: () => void;
  initializeGameStoreIntegration: () => () => void;
  loadWasmEngine: () => Promise<unknown>;
  initGameStoreSubscriptions: () => void;
  disposeGameStoreSubscriptions: () => void;
  initGameFlowSubscription: () => void;
  disposeGameFlowSubscription: () => void;
  stopOrphanSweep: () => void;
};

let gameplayModulesPromise: Promise<GameplayModules> | null = null;
let gameplayAcquirePromise: Promise<void> | null = null;
let gameplayRefCount = 0;
let gameplayActive = false;
let gameplayCleanup: (() => void) | null = null;
let effectSystemReady = false;
let wasmLoadStarted = false;

async function loadGameplayModules(): Promise<GameplayModules> {
  if (!gameplayModulesPromise) {
    gameplayModulesPromise = Promise.all([
      import('@/game/effects/initEffectSystem'),
      import('@/game/stores/gameStoreIntegration'),
      import('@/game/engine/wasmLoader'),
      import('@/game/stores/gameStore'),
      import('@/game/stores/gameFlowStore'),
      import('@/game/animations/BattlecryVFX'),
    ]).then(([
      effectSystemModule,
      gameStoreIntegrationModule,
      wasmLoaderModule,
      gameStoreModule,
      gameFlowStoreModule,
      battlecryVfxModule,
    ]) => ({
      default: effectSystemModule.default,
      initializeGameStoreIntegration: gameStoreIntegrationModule.initializeGameStoreIntegration,
      loadWasmEngine: wasmLoaderModule.loadWasmEngine,
      initGameStoreSubscriptions: gameStoreModule.initGameStoreSubscriptions,
      disposeGameStoreSubscriptions: gameStoreModule.disposeGameStoreSubscriptions,
      initGameFlowSubscription: gameFlowStoreModule.initGameFlowSubscription,
      disposeGameFlowSubscription: gameFlowStoreModule.disposeGameFlowSubscription,
      stopOrphanSweep: battlecryVfxModule.stopOrphanSweep,
    }));
  }

  return gameplayModulesPromise;
}

async function ensureGameplayRuntime(): Promise<void> {
  if (gameplayActive) {
    return;
  }

  if (!gameplayAcquirePromise) {
    gameplayAcquirePromise = (async () => {
      await Promise.all([ensureBridgeRuntime(), ensureCardDataRuntime()]);

      const modules = await loadGameplayModules();

      if (!effectSystemReady) {
        modules.default();
        effectSystemReady = true;
      }

      modules.initGameStoreSubscriptions();
      modules.initGameFlowSubscription();
      gameplayCleanup = modules.initializeGameStoreIntegration();

      if (!wasmLoadStarted) {
        wasmLoadStarted = true;
        void modules.loadWasmEngine().catch(() => undefined);
      }

      gameplayActive = true;
    })().finally(() => {
      gameplayAcquirePromise = null;
    });
  }

  await gameplayAcquirePromise;
}

async function releaseGameplayRuntime(): Promise<void> {
  if (!gameplayActive) {
    return;
  }

  const modules = await loadGameplayModules();

  gameplayCleanup?.();
  gameplayCleanup = null;
  modules.disposeGameStoreSubscriptions();
  modules.disposeGameFlowSubscription();
  modules.stopOrphanSweep();
  gameplayActive = false;
}

export function isGameplayRuntimeReady(): boolean {
  return gameplayActive;
}

export async function acquireGameplayRuntime(): Promise<() => void> {
  gameplayRefCount += 1;

  try {
    await ensureGameplayRuntime();
  } catch (error) {
    gameplayRefCount = Math.max(0, gameplayRefCount - 1);
    throw error;
  }

  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    gameplayRefCount = Math.max(0, gameplayRefCount - 1);

    if (gameplayRefCount === 0) {
      void releaseGameplayRuntime();
    }
  };
}
