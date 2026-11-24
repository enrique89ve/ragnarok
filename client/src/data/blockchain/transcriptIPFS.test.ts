import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRuntimeDatabaseName } from '../../game/config/networkConfig';
import {
	closeTranscriptDBForTests,
	fetchTranscript,
	MAX_LOCAL_TRANSCRIPTS,
	pinTranscript,
	LOCAL_TRANSCRIPT_TTL_MS,
} from './transcriptIPFS';
import type { TranscriptBundle } from './transcriptBuilder';

const TRANSCRIPT_DB = createRuntimeDatabaseName('transcripts');

const bundle: TranscriptBundle = {
	version: 1,
	matchId: 'm-1',
	seed: 'seed-1',
	merkleRoot: 'abc123',
	moveCount: 1,
	createdAt: 1,
	moves: '{"kind":"play"}\n',
};

beforeEach(async () => {
	closeTranscriptDBForTests();
	vi.restoreAllMocks();
	await new Promise<void>((resolve, reject) => {
		const req = indexedDB.deleteDatabase(TRANSCRIPT_DB);
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
	});
});

describe('transcriptIPFS local cache', () => {
	it('pins locally when relay is unavailable and verifies pseudo-CID integrity', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
		const cid = await pinTranscript(bundle);
		expect(cid).toMatch(/^bafk/);
		const loaded = await fetchTranscript(cid!);
		expect(loaded).toEqual(bundle);
	});

	it('rejects tampered local bundle hash', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
		const cid = await pinTranscript(bundle);
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open(TRANSCRIPT_DB, 1);
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
		const tx = db.transaction('transcripts', 'readwrite');
		tx.objectStore('transcripts').put({
			cid,
			storedAt: Date.now(),
			contentHash: 'deadbeef',
			bundle: { ...bundle, merkleRoot: 'tampered' },
		});
		await new Promise<void>((resolve, reject) => {
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
		db.close();
		closeTranscriptDBForTests();
		expect(await fetchTranscript(cid!)).toBeNull();
	});

	it('expires rows past TTL', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
		const cid = await pinTranscript(bundle);
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open(TRANSCRIPT_DB, 1);
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
		const tx = db.transaction('transcripts', 'readwrite');
		tx.objectStore('transcripts').put({
			cid,
			storedAt: Date.now() - LOCAL_TRANSCRIPT_TTL_MS - 1,
			bundle,
		});
		await new Promise<void>((resolve, reject) => {
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
		db.close();
		closeTranscriptDBForTests();
		expect(await fetchTranscript(cid!)).toBeNull();
	});

	it('evicts oldest rows beyond max-entry cap', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
		const cids: string[] = [];
		for (let i = 0; i < MAX_LOCAL_TRANSCRIPTS + 5; i += 1) {
			const cid = await pinTranscript({ ...bundle, merkleRoot: `root-${i}`, matchId: `m-${i}` });
			expect(cid).toBeTruthy();
			cids.push(cid!);
		}
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open(TRANSCRIPT_DB, 1);
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
		const count = await new Promise<number>((resolve, reject) => {
			const tx = db.transaction('transcripts', 'readonly');
			const req = tx.objectStore('transcripts').count();
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
		db.close();
		expect(count).toBeLessThanOrEqual(MAX_LOCAL_TRANSCRIPTS);
		expect(await fetchTranscript(cids[0])).toBeNull();
	});
});