/**
 * indexer.worker.ts — Ragnarok Chain Indexer Worker
 * 
 * Runs the chainIndexer.ts logic in a separate thread to avoid
 * blocking the main API thread. Communication is via message passing.
 */

import { parentPort, workerData } from 'worker_threads';
import { startIndexer, syncAccountNow, stopIndexer } from './chainIndexer';
import { exportState, getBlockCursor } from './chainState';

if (!parentPort) {
  throw new Error('This file must be run as a worker');
}

console.log('[IndexerWorker] Starting in isolated thread...');

// Configuration passed from main thread
const pollInterval = workerData?.POLL_INTERVAL_MS || 10_000;
let lastReportedBlock = getBlockCursor();

// Start the indexer
startIndexer();

// Notification loop from Worker -> Main Thread
// We send state updates to keep the main thread's local cache in sync.
// To avoid massive overhead, we only send updates when the block cursor advances.
const stateSyncInterval = setInterval(() => {
  const currentBlock = getBlockCursor();
  if (currentBlock > lastReportedBlock) {
    const state = exportState();
    parentPort?.postMessage({
      type: 'STATE_UPDATE',
      payload: state
    });
    lastReportedBlock = currentBlock;
  }
}, 5000);

// Listen for commands from Main Thread -> Worker
parentPort.on('message', async (msg) => {
  try {
    switch (msg.type) {
      case 'SYNC_ACCOUNT_NOW':
        console.log(`[IndexerWorker] On-demand sync requested for: ${msg.username}`);
        await syncAccountNow(msg.username);
        // Immediately report back after on-demand sync
        parentPort?.postMessage({
          type: 'STATE_UPDATE',
          payload: exportState()
        });
        lastReportedBlock = getBlockCursor();
        break;

      case 'STOP':
        console.log('[IndexerWorker] Stopping...');
        clearInterval(stateSyncInterval);
        stopIndexer();
        process.exit(0);
        break;

      default:
        console.warn(`[IndexerWorker] Unknown message type: ${msg.type}`);
    }
  } catch (err) {
    console.error('[IndexerWorker] Error processing message:', err);
  }
});

console.log('[IndexerWorker] Ready');
