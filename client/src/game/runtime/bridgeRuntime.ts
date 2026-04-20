import { initializeNFTBridge } from '@/game/nft';

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
        bridgeReady = true;
      })
      .finally(() => {
        bridgeInitPromise = null;
      });
  }

  await bridgeInitPromise;
}
