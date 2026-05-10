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
      .then((bridge) => {
        const accountId = bridge.getUsername();
        const starterStore = useStarterStore.getState();
        const shouldMaterializeStarter = bridge.isHiveMode()
          ? accountId !== null && starterStore.hasClaimed(accountId)
          : starterStore.hasClaimed();

        if (shouldMaterializeStarter) {
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
