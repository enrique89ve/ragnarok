import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { stopIndexerWorker } from './indexerManager';

describe('indexer shutdown wiring', () => {
	it('awaits worker STOP/exit from stopIndexerWorker', async () => {
		await expect(stopIndexerWorker(1)).resolves.toBeUndefined();
	});

	it('keeps main-process chain-state flush behind indexer worker ownership', () => {
		const indexPath = join(dirname(fileURLToPath(import.meta.url)), '../index.ts');
		const workerPath = join(dirname(fileURLToPath(import.meta.url)), 'indexer.worker.ts');
		const indexSource = readFileSync(indexPath, 'utf8');
		const workerSource = readFileSync(workerPath, 'utf8');

		expect(indexSource).toContain("const indexerWorkerEnabled = process.env.ENABLE_CHAIN_INDEXER !== 'false'");
		expect(indexSource).toContain('await stopIndexerWorker()');
		expect(indexSource).toContain('stopPersistenceAsync');
		expect(indexSource).not.toContain('flushPersistenceAsync');
		expect(workerSource).toContain('await flushPersistenceAsync()');
	});
});