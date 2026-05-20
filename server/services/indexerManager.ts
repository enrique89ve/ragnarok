/**
 * indexerManager.ts — Main Thread Interface for Indexer Worker
 * 
 * Manages the lifecycle of the Indexer Worker Thread and handles
 * state synchronization back to the main thread's local cache.
 */

import { Worker } from 'worker_threads';
import { importState } from './chainState';

let worker: Worker | null = null;

function getIndexerWorkerBootstrap(): string {
  const workerUrl = new URL('./indexer.worker.ts', import.meta.url).href;
  const encodedWorkerUrl = JSON.stringify(workerUrl);
  return `(async () => {
    const { tsImport } = await import('tsx/esm/api');
    await tsImport(${encodedWorkerUrl}, { parentURL: ${encodedWorkerUrl} });
  })().catch((err) => {
    console.error('[IndexerWorker] Bootstrap error:', err);
    process.exit(1);
  });`;
}

export function startIndexerWorker(): void {
  if (worker) return;

  // Create the worker
  worker = new Worker(getIndexerWorkerBootstrap(), {
    eval: true,
    workerData: {
      POLL_INTERVAL_MS: 10_000
    },
  });

  worker.on('message', (msg) => {
    if (msg.type === 'STATE_UPDATE') {
      // Receive and apply state update to the main thread's memory Maps
      importState(msg.payload);
    }
  });

  worker.on('error', (err) => {
    console.error('[IndexerManager] Worker error:', err);
  });

  worker.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[IndexerManager] Worker stopped with exit code ${code}`);
    }
    worker = null;
  });

  console.log('[IndexerManager] Indexer worker started');
}

export function stopIndexerWorker(): void {
  if (worker) {
    worker.postMessage({ type: 'STOP' });
  }
}

export async function syncAccountNow(username: string): Promise<void> {
  if (!worker) {
    console.warn('[IndexerManager] Cannot sync account: Worker not running');
    return;
  }

  worker.postMessage({ type: 'SYNC_ACCOUNT_NOW', username });
}
