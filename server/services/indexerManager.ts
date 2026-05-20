/**
 * indexerManager.ts — Main Thread Interface for Indexer Worker
 * 
 * Manages the lifecycle of the Indexer Worker Thread and handles
 * state synchronization back to the main thread's local cache.
 */

import { Worker } from 'worker_threads';
import * as path from 'path';
import { importState } from './chainState';

let worker: Worker | null = null;

export function startIndexerWorker(): void {
  if (worker) return;

  const workerPath = path.resolve(__dirname, 'indexer.worker.ts');
  
  // Create the worker
  // Note: We use ts-node or similar in dev, but in prod it might be .js
  // For simplicity here, we assume the environment can handle .ts 
  // (the server usually runs with ts-node or vite-node)
  worker = new Worker(workerPath, {
    workerData: {
      POLL_INTERVAL_MS: 10_000
    },
    // Required to allow the worker to import TypeScript files if we are running in ts-node
    execArgv: process.execArgv.includes('--loader') ? process.execArgv : [...process.execArgv, '--loader', 'ts-node/esm']
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
