/**
 * Ragnarok Operator Indexer — Standalone Block Scanner
 *
 * Scans Hive blocks for ragnarok-cards custom_json ops, validates via
 * protocol-core, and outputs NDJSON chunks + manifest for IPFS publication.
 *
 * Usage:
 *   npx tsx operator/indexer.ts [--output ./index-output] [--start-block 0]
 *
 * This is the same logic as server/services/chainIndexer.ts, repackaged
 * as a standalone process that writes files instead of holding state in memory.
 *
 * See docs/DECENTRALIZED_INDEXER_DESIGN.md
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { normalizeRawOp } from '../shared/protocol-core/normalize';
import type { RawHiveOp, EloRecord } from '../shared/protocol-core/types';
import { ELO_K_FACTOR, ELO_FLOOR } from '../shared/protocol-core/types';
import type {
	IndexEntry, IndexManifest, ChunkDescriptor,
	LeaderboardSnapshot, SupplySnapshot, DerivedState,
} from '../shared/indexer-types';
import {
	INDEXER_VERSION, CHUNK_SIZE_BLOCKS, BLOCKS_PER_BATCH,
	POLL_INTERVAL_MS, RAGNAROK_APP_IDS, RAGNAROK_LEGACY_PREFIX,
} from '../shared/indexer-types';

// ============================================================
// Configuration
// ============================================================

const HIVE_NODES = [
	'https://api.hive.blog',
	'https://api.deathwing.me',
	'https://api.openhive.network',
];

const NODE_TIMEOUT_MS = 8000;
const MAX_BACKOFF_MS = 30_000;
let consecutiveFailures = 0;

interface IndexerConfig {
	outputDir: string;
	startBlock: number;
	operatorAccount: string;
}

function parseArgs(): IndexerConfig {
	const args = process.argv.slice(2);
	let outputDir = './index-output';
	let startBlock = 0;
	let operatorAccount = 'ragnarok';

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--output' && args[i + 1]) outputDir = args[++i];
		if (args[i] === '--start-block' && args[i + 1]) startBlock = parseInt(args[++i], 10);
		if (args[i] === '--operator' && args[i + 1]) operatorAccount = args[++i];
	}

	return { outputDir, startBlock, operatorAccount };
}

// ============================================================
// Hive RPC (with exponential backoff)
// ============================================================

let currentNodeIndex = 0;

async function callHive<T>(method: string, params: unknown[]): Promise<T> {
	const startIdx = currentNodeIndex;
	for (let attempt = 0; attempt < HIVE_NODES.length; attempt++) {
		const nodeIdx = (startIdx + attempt) % HIVE_NODES.length;
		const node = HIVE_NODES[nodeIdx];
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), NODE_TIMEOUT_MS);
		try {
			const resp = await fetch(node, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
				signal: controller.signal,
			});
			clearTimeout(timeout);
			const data = await resp.json() as { result?: T; error?: { message: string } };
			if (data.error) throw new Error(data.error.message);
			if (data.result == null) throw new Error(`Null result from ${method}`);
			currentNodeIndex = nodeIdx;
			consecutiveFailures = 0;
			return data.result;
		} catch (err) {
			clearTimeout(timeout);
			if (attempt === HIVE_NODES.length - 1) {
				consecutiveFailures++;
				throw new Error(`All Hive nodes failed for ${method}: ${err}`);
			}
		}
	}
	throw new Error('unreachable');
}

async function getLastIrreversibleBlock(): Promise<number> {
	const props = await callHive<{ last_irreversible_block_num: number }>(
		'condenser_api.get_dynamic_global_properties', []
	);
	return props.last_irreversible_block_num;
}

interface HiveBlockOp {
	trx_id: string;
	op: [string, Record<string, unknown>];
	trx_in_block: number;
	op_in_trx: number;
	timestamp: string;
}

async function getOpsInBlock(blockNum: number): Promise<HiveBlockOp[]> {
	return callHive<HiveBlockOp[]>('condenser_api.get_ops_in_block', [blockNum, false]);
}

// ============================================================
// State Tracking (lightweight, in-memory for operator)
// ============================================================

const eloState = new Map<string, EloRecord>();
const transcriptCIDs: string[] = []; // Collected during indexing for operator pinning
const supplyState = new Map<string, { pool: string; cap: number; minted: number }>();
const seenTrxIds = new Set<string>();

function getElo(account: string): EloRecord {
	return eloState.get(account) || { account, elo: 1000, wins: 0, losses: 0 };
}

function computeEloDelta(winnerElo: number, loserElo: number): number {
	const expected = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
	return Math.round(ELO_K_FACTOR * (1 - expected));
}

function applyMatchResult(payload: Record<string, unknown>): DerivedState | undefined {
	const winner = payload.winner as string | undefined;
	const loser = payload.loser as string | undefined;
	if (!winner || !loser) return undefined;

	const winnerRec = getElo(winner);
	const loserRec = getElo(loser);
	const delta = computeEloDelta(winnerRec.elo, loserRec.elo);

	winnerRec.elo = Math.max(ELO_FLOOR, winnerRec.elo + delta);
	winnerRec.wins++;
	loserRec.elo = Math.max(ELO_FLOOR, loserRec.elo - delta);
	loserRec.losses++;

	eloState.set(winner, winnerRec);
	eloState.set(loser, loserRec);

	// Extract transcript CID for operator pinning (if present in on-chain payload)
	const transcriptCID = payload.tc as string | undefined;
	if (transcriptCID) {
		transcriptCIDs.push(transcriptCID);
	}

	return {
		winner,
		loser,
		eloAfter: winnerRec.elo,
		runeChange: 10,
		transcriptCID,
	};
}

function applyMintOp(payload: Record<string, unknown>): DerivedState | undefined {
	const cards = payload.cards as Array<{ cardId: number; rarity: string }> | undefined;
	if (!cards?.length) return undefined;
	return { cardId: cards[0].cardId };
}

function applyTransferOp(payload: Record<string, unknown>): DerivedState | undefined {
	const uid = payload.uid as string || payload.cardUid as string;
	const cardId = payload.cardId as number | undefined;
	return uid ? { cardUid: uid, cardId } : undefined;
}

function derivedStateFor(action: string, payload: Record<string, unknown>): DerivedState | undefined {
	switch (action) {
		case 'match_result': return applyMatchResult(payload);
		case 'mint_batch': return applyMintOp(payload);
		case 'card_transfer': return applyTransferOp(payload);
		default: return undefined;
	}
}

// ============================================================
// Chunk Writer
// ============================================================

interface ChunkWriter {
	entries: IndexEntry[];
	blockStart: number;
	blockEnd: number;
}

function createChunkWriter(blockStart: number): ChunkWriter {
	return {
		entries: [],
		blockStart,
		blockEnd: blockStart + CHUNK_SIZE_BLOCKS - 1,
	};
}

function loadPartialChunk(outputDir: string, blockStart: number, blockEnd: number): IndexEntry[] {
	const chunksDir = path.join(outputDir, 'chunks');
	const fileName = `chunk-${String(blockStart).padStart(9, '0')}-${String(blockEnd).padStart(9, '0')}.ndjson`;
	const filePath = path.join(chunksDir, fileName);
	if (!fs.existsSync(filePath)) return [];

	const entries: IndexEntry[] = [];
	const text = fs.readFileSync(filePath, 'utf-8');
	for (const line of text.split('\n')) {
		if (!line.trim()) continue;
		try {
			entries.push(JSON.parse(line) as IndexEntry);
		} catch { /* skip malformed */ }
	}
	return entries;
}

function finalizeChunk(writer: ChunkWriter, outputDir: string): ChunkDescriptor {
	const chunksDir = path.join(outputDir, 'chunks');
	fs.mkdirSync(chunksDir, { recursive: true });

	const fileName = `chunk-${String(writer.blockStart).padStart(9, '0')}-${String(writer.blockEnd).padStart(9, '0')}.ndjson`;
	const filePath = path.join(chunksDir, fileName);

	const ndjson = writer.entries.map(e => JSON.stringify(e)).join('\n');

	// Write raw NDJSON (canonical for SHA-256 hash)
	const tmpPath = filePath + '.tmp';
	fs.writeFileSync(tmpPath, ndjson, 'utf-8');
	fs.renameSync(tmpPath, filePath);

	// Write gzipped version (~75% smaller, clients prefer this)
	const gzPath = filePath + '.gz';
	const gzTmpPath = gzPath + '.tmp';
	fs.writeFileSync(gzTmpPath, zlib.gzipSync(Buffer.from(ndjson, 'utf-8'), { level: 9 }));
	fs.renameSync(gzTmpPath, gzPath);

	const hash = crypto.createHash('sha256').update(ndjson).digest('hex');

	return {
		file: `chunks/${fileName}`,
		blockRange: [writer.blockStart, writer.blockEnd],
		opCount: writer.entries.length,
		sha256: hash,
	};
}

// ============================================================
// Snapshot Writers
// ============================================================

function writeLeaderboardSnapshot(outputDir: string, lastBlock: number): void {
	const snapshotsDir = path.join(outputDir, 'snapshots');
	fs.mkdirSync(snapshotsDir, { recursive: true });

	const entries = Array.from(eloState.values())
		.sort((a, b) => b.elo - a.elo)
		.slice(0, 1000)
		.map((e, i) => ({
			username: e.account,
			elo: e.elo,
			wins: e.wins,
			losses: e.losses,
			rank: i + 1,
		}));

	const snapshot: LeaderboardSnapshot = {
		updatedAtBlock: lastBlock,
		timestamp: Date.now(),
		entries,
	};

	const filePath = path.join(snapshotsDir, 'leaderboard.json');
	const tmpPath = filePath + '.tmp';
	fs.writeFileSync(tmpPath, JSON.stringify(snapshot, null, 2));
	fs.renameSync(tmpPath, filePath);
}

function writeSupplySnapshot(outputDir: string, lastBlock: number): void {
	const snapshotsDir = path.join(outputDir, 'snapshots');
	fs.mkdirSync(snapshotsDir, { recursive: true });

	const snapshot: SupplySnapshot = {
		updatedAtBlock: lastBlock,
		timestamp: Date.now(),
		counters: Object.fromEntries(supplyState),
	};

	const filePath = path.join(snapshotsDir, 'supply.json');
	const tmpPath = filePath + '.tmp';
	fs.writeFileSync(tmpPath, JSON.stringify(snapshot, null, 2));
	fs.renameSync(tmpPath, filePath);
}

// ============================================================
// Manifest Writer
// ============================================================

function writeManifest(
	outputDir: string,
	chunks: ChunkDescriptor[],
	lastBlock: number,
	totalOps: number,
	operatorAccount: string,
): void {
	const stateHash = computeStateHash(chunks, lastBlock);

	const manifest: IndexManifest = {
		version: INDEXER_VERSION,
		lastBlock,
		lastBlockTimestamp: Date.now(),
		totalOps,
		chunks,
		snapshots: {
			leaderboard: 'snapshots/leaderboard.json',
			supply: 'snapshots/supply.json',
			genesis: 'snapshots/genesis.json',
		},
		attestations: [{
			operator: operatorAccount,
			stateHash,
			signature: '',
			block: lastBlock,
			timestamp: Date.now(),
		}],
		publisher: operatorAccount,
		publisherRotation: [operatorAccount],
		transcriptCIDs: transcriptCIDs.length > 0 ? [...transcriptCIDs] : undefined,
	};

	const filePath = path.join(outputDir, 'manifest.json');
	const tmpPath = filePath + '.tmp';
	fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2));
	fs.renameSync(tmpPath, filePath);
}

function computeStateHash(chunks: ChunkDescriptor[], lastBlock: number): string {
	const sortedHashes = chunks.map(c => c.sha256).sort();
	const data = JSON.stringify({
		lastBlock,
		chunkHashes: sortedHashes,
		eloCount: eloState.size,
	});
	return crypto.createHash('sha256').update(data).digest('hex').slice(0, 32);
}

// ============================================================
// Cursor Persistence (atomic write)
// ============================================================

interface CursorState {
	lastBlock: number;
	totalOps: number;
	chunks: ChunkDescriptor[];
}

function loadCursor(outputDir: string): CursorState {
	const cursorPath = path.join(outputDir, '.cursor.json');
	if (fs.existsSync(cursorPath)) {
		try {
			return JSON.parse(fs.readFileSync(cursorPath, 'utf-8'));
		} catch (err) {
			console.error('[Indexer] Corrupt cursor file, resetting:', err);
			return { lastBlock: 0, totalOps: 0, chunks: [] };
		}
	}
	return { lastBlock: 0, totalOps: 0, chunks: [] };
}

function saveCursor(outputDir: string, state: CursorState): void {
	const cursorPath = path.join(outputDir, '.cursor.json');
	const tmpPath = cursorPath + '.tmp';
	fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2));
	fs.renameSync(tmpPath, cursorPath);
}

// ============================================================
// Block Scanner — Core Loop
// ============================================================

function isRagnarokOp(op: HiveBlockOp): boolean {
	if (op.op[0] !== 'custom_json') return false;
	const data = op.op[1] as { id?: string };
	const id = data.id || '';
	return (
		(RAGNAROK_APP_IDS as readonly string[]).includes(id) ||
		id.startsWith(RAGNAROK_LEGACY_PREFIX)
	);
}

function hiveOpToRawHiveOp(op: HiveBlockOp, blockNum: number): RawHiveOp {
	const data = op.op[1] as Record<string, unknown>;
	return {
		customJsonId: data.id as string,
		json: data.json as string,
		broadcaster: ((data.required_posting_auths as string[]) || [])[0]
			|| ((data.required_auths as string[]) || [])[0]
			|| '',
		trxId: op.trx_id,
		blockNum,
		timestamp: new Date(op.timestamp + 'Z').getTime(),
		requiredPostingAuths: (data.required_posting_auths as string[]) || [],
		requiredAuths: (data.required_auths as string[]) || [],
	};
}

async function scanBlocks(config: IndexerConfig): Promise<void> {
	const { outputDir, operatorAccount } = config;
	fs.mkdirSync(outputDir, { recursive: true });

	const cursor = loadCursor(outputDir);
	let { lastBlock, totalOps } = cursor;
	const chunks = [...cursor.chunks];

	if (config.startBlock > 0 && lastBlock === 0) {
		lastBlock = config.startBlock - 1;
	}

	const lib = await getLastIrreversibleBlock();
	const startBlock = lastBlock + 1;

	if (startBlock > lib) {
		console.log(`[Indexer] Already at LIB (${lib}). Nothing to scan.`);
		return;
	}

	const endBlock = Math.min(startBlock + BLOCKS_PER_BATCH - 1, lib);
	console.log(`[Indexer] Scanning blocks ${startBlock} → ${endBlock} (LIB: ${lib})`);

	const chunkStart = Math.floor(startBlock / CHUNK_SIZE_BLOCKS) * CHUNK_SIZE_BLOCKS;
	const writer = createChunkWriter(chunkStart);

	const existingEntries = loadPartialChunk(outputDir, chunkStart, writer.blockEnd);
	writer.entries.push(...existingEntries);

	for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
		let ops: HiveBlockOp[];
		try {
			ops = await getOpsInBlock(blockNum);
		} catch (err) {
			console.error(`[Indexer] Failed to fetch block ${blockNum}:`, err);
			break;
		}

		for (let opIdx = 0; opIdx < ops.length; opIdx++) {
			const rawOp = ops[opIdx];
			if (!isRagnarokOp(rawOp)) continue;

			if (seenTrxIds.has(rawOp.trx_id)) continue;
			seenTrxIds.add(rawOp.trx_id);

			const hiveOp = hiveOpToRawHiveOp(rawOp, blockNum);
			const normalized = normalizeRawOp(hiveOp);

			if (normalized.status !== 'ok') continue;

			const { op } = normalized;
			const payload = op.payload;

			const derived = derivedStateFor(op.action, payload);

			const counterparty =
				(typeof payload.recipient === 'string' ? payload.recipient : undefined)
				|| (typeof payload.loser === 'string' ? payload.loser : undefined)
				|| (typeof payload.to === 'string' ? payload.to : undefined)
				|| undefined;

			const entry: IndexEntry = {
				player: op.broadcaster,
				counterparty,
				action: op.action as IndexEntry['action'],
				trxId: op.trxId,
				blockNum: op.blockNum,
				opIndexInBlock: opIdx,
				timestamp: op.timestamp,
				derived,
			};

			writer.entries.push(entry);
			totalOps++;
		}

		lastBlock = blockNum;

		if (blockNum >= writer.blockEnd) {
			if (writer.entries.length > 0) {
				const descriptor = finalizeChunk(writer, outputDir);
				const existingIdx = chunks.findIndex(c =>
					c.blockRange[0] === descriptor.blockRange[0]
				);
				if (existingIdx >= 0) {
					chunks[existingIdx] = descriptor;
				} else {
					chunks.push(descriptor);
				}
				console.log(`[Indexer] Finalized chunk: ${descriptor.file} (${descriptor.opCount} ops)`);
			}
		}

		saveCursor(outputDir, { lastBlock, totalOps, chunks });
	}

	if (writer.entries.length > 0 && lastBlock < writer.blockEnd) {
		const descriptor = finalizeChunk(writer, outputDir);
		const existingIdx = chunks.findIndex(c =>
			c.blockRange[0] === descriptor.blockRange[0]
		);
		if (existingIdx >= 0) {
			chunks[existingIdx] = descriptor;
		} else {
			chunks.push(descriptor);
		}
	}

	writeLeaderboardSnapshot(outputDir, lastBlock);
	writeSupplySnapshot(outputDir, lastBlock);
	writeManifest(outputDir, chunks, lastBlock, totalOps, operatorAccount);

	saveCursor(outputDir, { lastBlock, totalOps, chunks });

	if (seenTrxIds.size > 100_000) {
		seenTrxIds.clear();
	}

	console.log(`[Indexer] Processed to block ${lastBlock}. Total ops: ${totalOps}. Chunks: ${chunks.length}`);
}

// ============================================================
// Main Loop
// ============================================================

let running = true;
let currentScan: Promise<void> | null = null;

async function main(): Promise<void> {
	const config = parseArgs();
	console.log(`[Indexer] Starting operator indexer`);
	console.log(`[Indexer] Output: ${config.outputDir}`);
	console.log(`[Indexer] Operator: ${config.operatorAccount}`);

	while (running) {
		try {
			currentScan = scanBlocks(config);
			await currentScan;
			currentScan = null;
		} catch (err) {
			currentScan = null;
			console.error('[Indexer] Scan error:', err);
		}

		const backoffMs = Math.min(
			POLL_INTERVAL_MS * Math.pow(2, consecutiveFailures),
			MAX_BACKOFF_MS,
		);
		await new Promise(resolve => setTimeout(resolve, backoffMs));
	}
}

async function shutdown(): Promise<void> {
	console.log('\n[Indexer] Shutting down...');
	running = false;
	if (currentScan) {
		console.log('[Indexer] Waiting for current scan to finish...');
		try { await currentScan; } catch { /* already logged */ }
	}
	console.log('[Indexer] Goodbye.');
	process.exit(0);
}

process.on('SIGINT', () => { shutdown(); });
process.on('SIGTERM', () => { shutdown(); });

main().catch(err => {
	console.error('[Indexer] Fatal error:', err);
	process.exit(1);
});
