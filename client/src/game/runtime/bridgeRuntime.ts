import { initializeNFTBridge } from '@/game/nft';
import { materializeStarterEntitlement, ensureStarterDecks } from '@/game/data/starterSet';
import { useStarterStore } from '@/game/stores/starterStore';

let bridgeReady = false;
let bridgeInitPromise: Promise<void> | null = null;

export function isBridgeRuntimeReady(): boolean {
  return bridgeReady;
}

export async function ensureBridgeRuntime(): Promise<void> {
  if (bridgeReady) {
    return;
  }

  if (!bridgeInitPromise) {
    bridgeInitPromise = initializeNFTBridge()
      .then(() => {
        const { claimed } = useStarterStore.getState();
        if (claimed) {
          materializeStarterEntitlement();
          ensureStarterDecks();
        }
        bridgeReady = true;
      })
      .finally(() => {
        bridgeInitPromise = null;
      });
  }

  await bridgeInitPromise;
}
