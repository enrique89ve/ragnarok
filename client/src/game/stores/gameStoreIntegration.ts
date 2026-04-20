/**
 * gameStoreIntegration.ts
 *
 * Integration layer that connects the legacy gameStore with the new
 * event-driven architecture. This allows gradual migration without
 * breaking existing functionality.
 *
 * Usage:
 * Call initializeGameStoreIntegration() once at app startup to:
 * 1. Initialize all UI subscribers (audio, notifications, animations)
 * 2. Set up event forwarding from legacy actions to GameEventBus
 * 
 * Added by Enrique - Event-driven architecture integration
 */

import { GameEventBus } from '@/core/events/GameEventBus';
import { initializeAudioSubscriber } from '@/game/subscribers/AudioSubscriber';
import { initializeNotificationSubscriber } from '@/game/subscribers/NotificationSubscriber';
import { initializeAnimationSubscriber } from '@/game/subscribers/AnimationSubscriber';
import { initializeDailyQuestSubscriber } from '@/game/subscribers/DailyQuestSubscriber';
import { isBlockchainPackagingEnabled } from '../config/featureFlags';
import { debug } from '../config/debugConfig';
import { getNFTBridge } from '../nft';
import { toast } from 'sonner';
import { useSettingsStore } from '@/game/stores/settingsStore';
import { useAudio } from '@/lib/stores/useAudio';

let isInitialized = false;
let cleanupFunctions: (() => void)[] = [];

/**
 * Initialize the game store integration layer.
 * This connects the new event-driven architecture with the existing stores.
 */
export function initializeGameStoreIntegration(): () => void {
  if (isInitialized) {
    debug.warn('[GameStoreIntegration] Already initialized, skipping');
    return () => {};
  }

  debug.log('[GameStoreIntegration] Initializing event-driven architecture...');

  // Initialize UI subscribers
  cleanupFunctions.push(initializeAudioSubscriber());
  cleanupFunctions.push(initializeNotificationSubscriber());
  cleanupFunctions.push(initializeAnimationSubscriber());
  cleanupFunctions.push(initializeDailyQuestSubscriber());

  if (getNFTBridge().isHiveMode()) {
    const bridge = getNFTBridge();
    cleanupFunctions.push(
      bridge.onEvent('card:transferred', (e) => {
        const p = e.payload as { cardUid?: string; from?: string; to?: string };
        if (!p?.cardUid || !p.to) return;
        toast.info(`Card ${p.cardUid.slice(0, 8)}… transferred to ${p.to}`, { duration: 3000 });
      }),
      bridge.onEvent('token:updated', (e) => {
        const p = e.payload as { token?: string; amount?: number; change?: number };
        if (!p?.token || p.amount == null || p.change == null) return;
        const sign = p.change > 0 ? '+' : '';
        toast.success(`${p.token}: ${sign}${p.change} (total: ${p.amount})`, { duration: 3000 });
      }),
      bridge.onEvent('transaction:confirmed', () => {
        toast.success('Transaction confirmed on Hive', { duration: 2000 });
      }),
      bridge.onEvent('transaction:failed', (e) => {
        const p = e.payload as { errorMessage?: string };
        toast.error(`Transaction failed: ${p?.errorMessage ?? 'unknown error'}`, { duration: 4000 });
      }),
    );
  }

  if (isBlockchainPackagingEnabled()) {
    Promise.all([
      import('@/game/subscribers/BlockchainSubscriber'),
      import('@/data/blockchain/transactionProcessor'),
    ]).then(([{ initializeBlockchainSubscriber }, { startTransactionProcessor, stopTransactionProcessor }]) => {
      cleanupFunctions.push(initializeBlockchainSubscriber());
      startTransactionProcessor();
      cleanupFunctions.push(stopTransactionProcessor);
      debug.log('[GameStoreIntegration] Blockchain subscriber + transaction processor started');
    });
  }

  const settings = useSettingsStore.getState();
  const audioStore = useAudio.getState();
  if (typeof audioStore.setMusicVolume === 'function') {
    audioStore.setMusicVolume(settings.musicVolume ?? 0.5);
  }
  if (typeof audioStore.setSoundVolume === 'function') {
    audioStore.setSoundVolume(settings.sfxVolume ?? 0.7);
  }

  isInitialized = true;
  debug.log('[GameStoreIntegration] Initialization complete');

  // Return cleanup function
  return () => {
    cleanupFunctions.forEach(cleanup => cleanup());
    cleanupFunctions = [];
    isInitialized = false;
    GameEventBus.reset();
    debug.log('[GameStoreIntegration] Cleanup complete');
  };
}

/**
 * Check if integration is initialized
 */
export function isIntegrationInitialized(): boolean {
  return isInitialized;
}

/**
 * Get the GameEventBus for direct event emission
 */
export function getEventBus(): typeof GameEventBus {
  return GameEventBus;
}

export default initializeGameStoreIntegration;
