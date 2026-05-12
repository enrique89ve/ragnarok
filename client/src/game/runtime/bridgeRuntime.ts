import { initializeNFTBridge } from '@/game/nft';
import { purgeLegacyStarterRows, seedStarterHeroDecks } from '@/game/data/starterSet';
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
        // One-shot migration: drop legacy starter rows persisted by the old
        // materialization path. Idempotent — no path writes those uids anymore.
        purgeLegacyStarterRows();

        const accountId = bridge.getUsername();
        const starterStore = useStarterStore.getState();
        const hasClaimedStarter = bridge.isHiveMode()
          ? accountId !== null && starterStore.hasClaimed(accountId)
          : starterStore.hasClaimed();

        // Re-seed the 4 hero decks for accounts that have already claimed.
        // Respects existing custom decks (idempotent — does not overwrite).
        if (hasClaimedStarter) {
          seedStarterHeroDecks();
        }
        bridgeReady = true;
      })
      .finally(() => {
        bridgeInitPromise = null;
      });
  }

  await bridgeInitPromise;
}
