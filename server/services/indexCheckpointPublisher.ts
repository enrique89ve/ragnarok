import { createHash } from 'crypto';
import type { RagnarokRuntimeConfig } from '../../shared/runtimeConfig';
import { exportState, getStats } from './chainState';
import { fetchAccountKeys } from './hiveSignatureVerifier';
import { loadHiveTx } from './hiveTx';

const ENABLE_ENV = 'ENABLE_INDEX_CHECKPOINT_PUBLISHER';
const INDEX_ACCOUNT_ENV = 'RAGNAROK_INDEX_ACCOUNT';
const INDEX_POSTING_KEY_ENV = 'RAGNAROK_INDEX_POSTING_KEY';
const INTERVAL_BLOCKS_ENV = 'RAGNAROK_INDEX_CHECKPOINT_INTERVAL_BLOCKS';
const DRY_RUN_ENV = 'RAGNAROK_INDEX_CHECKPOINT_DRY_RUN';
const DEFAULT_INTERVAL_BLOCKS = 100;

type HiveTxResult = {
	readonly result?: unknown;
	readonly tx_id?: string;
	readonly id?: string;
};

type IndexCheckpointSigner = {
	readonly account: string;
	readonly publicKey: string;
	readonly privateKey: import('hive-tx').PrivateKey;
};

export type IndexCheckpointStats = {
	readonly lastIrreversibleBlockProcessed: number;
	readonly irreversibleBlock: number;
	readonly syncTargetBlock: number;
	readonly inSync: boolean;
	readonly totalPlayers: number;
	readonly totalCards: number;
	readonly totalMatches: number;
	readonly knownAccounts: number;
};

export type IndexCheckpointPayload = {
	readonly action: 'index_checkpoint';
	readonly version: 1;
	readonly stage: RagnarokRuntimeConfig['stage'];
	readonly indexedBlock: number;
	readonly irreversibleBlock: number;
	readonly syncTargetBlock: number;
	readonly stateHash: string;
	readonly hashAlgorithm: 'sha256:canonical-json:v1';
	readonly summary: {
		readonly players: number;
		readonly cards: number;
		readonly matches: number;
		readonly knownAccounts: number;
	};
	readonly emittedAt: number;
};

export type IndexCheckpointPublishResult =
	| { readonly status: 'disabled' }
	| { readonly status: 'skipped'; readonly reason: string }
	| {
		readonly status: 'dry_run';
		readonly block: number;
		readonly bucket: number;
		readonly stateHash: string;
	}
	| {
		readonly status: 'published';
		readonly block: number;
		readonly bucket: number;
		readonly trxId?: string;
		readonly stateHash: string;
	};

let cachedSigner: IndexCheckpointSigner | null = null;
let cachedSignerError: Error | null = null;
let lastPublishedBucket = 0;
let publishInFlight = false;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getResultTxId(result: unknown): string | undefined {
	if (!isRecord(result)) return undefined;
	const nested = result.result;
	if (isRecord(nested) && typeof nested.tx_id === 'string') return nested.tx_id;
	if (typeof result.tx_id === 'string') return result.tx_id;
	if (typeof result.id === 'string') return result.id;
	return undefined;
}

function normalizeForHash(value: unknown): unknown {
	if (Array.isArray(value)) {
		const normalized = value.map(normalizeForHash);
		if (normalized.every((item) => (
			Array.isArray(item)
			&& item.length === 2
			&& typeof item[0] === 'string'
		))) {
			return [...normalized].sort((a, b) => {
				const left = Array.isArray(a) && typeof a[0] === 'string' ? a[0] : '';
				const right = Array.isArray(b) && typeof b[0] === 'string' ? b[0] : '';
				return left.localeCompare(right);
			});
		}
		if (normalized.every((item) => typeof item === 'string')) {
			return [...normalized].sort();
		}
		return normalized;
	}

	if (!isRecord(value)) return value;

	const entries = Object.entries(value)
		.filter(([, entryValue]) => entryValue !== undefined)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([key, entryValue]) => [key, normalizeForHash(entryValue)] as const);
	return Object.fromEntries(entries);
}

function stableStringify(value: unknown): string {
	return JSON.stringify(normalizeForHash(value));
}

export function computeProjectionStateHash(input: {
	readonly runtime: RagnarokRuntimeConfig;
	readonly state: unknown;
	readonly block: number;
}): string {
	const canonical = stableStringify({
		block: input.block,
		protocolId: input.runtime.protocolId,
		stage: input.runtime.stage,
		state: input.state,
	});
	return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function buildIndexCheckpointPayload(input: {
	readonly runtime: RagnarokRuntimeConfig;
	readonly state: unknown;
	readonly stats: IndexCheckpointStats;
	readonly now?: number;
}): IndexCheckpointPayload {
	const indexedBlock = input.stats.lastIrreversibleBlockProcessed;
	return {
		action: 'index_checkpoint',
		version: 1,
		stage: input.runtime.stage,
		indexedBlock,
		irreversibleBlock: input.stats.irreversibleBlock,
		syncTargetBlock: input.stats.syncTargetBlock,
		stateHash: computeProjectionStateHash({
			runtime: input.runtime,
			state: input.state,
			block: indexedBlock,
		}),
		hashAlgorithm: 'sha256:canonical-json:v1',
		summary: {
			players: input.stats.totalPlayers,
			cards: input.stats.totalCards,
			matches: input.stats.totalMatches,
			knownAccounts: input.stats.knownAccounts,
		},
		emittedAt: input.now ?? Date.now(),
	};
}

export function getIndexCheckpointCustomJsonId(runtime: RagnarokRuntimeConfig): string {
	return `${runtime.protocolId}_index`;
}

export function isIndexCheckpointPublisherEnabled(): boolean {
	return process.env[ENABLE_ENV] === 'true';
}

export function isIndexCheckpointDryRun(): boolean {
	return process.env[DRY_RUN_ENV] === 'true';
}

export function getIndexCheckpointIntervalBlocks(): number {
	const raw = process.env[INTERVAL_BLOCKS_ENV]?.trim();
	if (!raw) return DEFAULT_INTERVAL_BLOCKS;

	const parsed = Number(raw);
	if (!Number.isSafeInteger(parsed) || parsed < 1) {
		throw new Error(`${INTERVAL_BLOCKS_ENV} must be a positive integer`);
	}
	return parsed;
}

function getConfiguredIndexAccount(runtime: RagnarokRuntimeConfig): string {
	return process.env[INDEX_ACCOUNT_ENV]?.trim() || runtime.indexAccount.trim();
}

async function getIndexCheckpointSigner(runtime: RagnarokRuntimeConfig): Promise<IndexCheckpointSigner> {
	if (cachedSigner) return cachedSigner;
	if (cachedSignerError) throw cachedSignerError;

	try {
		const account = getConfiguredIndexAccount(runtime);
		const postingKey = process.env[INDEX_POSTING_KEY_ENV]?.trim();
		if (!account || !postingKey) {
			throw new Error(`${INDEX_ACCOUNT_ENV} and ${INDEX_POSTING_KEY_ENV} are required for index checkpoint publishing`);
		}

		const { PrivateKey } = await loadHiveTx();
		const privateKey = PrivateKey.fromString(postingKey);
		const publicKey = privateKey.createPublic().toString();
		cachedSigner = { account, publicKey, privateKey };
		return cachedSigner;
	} catch (err) {
		cachedSignerError = err instanceof Error ? err : new Error(String(err));
		throw cachedSignerError;
	}
}

export function resetIndexCheckpointPublisherForTests(): void {
	cachedSigner = null;
	cachedSignerError = null;
	lastPublishedBucket = 0;
	publishInFlight = false;
}

export function shouldValidateIndexCheckpointPublisherConfig(): boolean {
	if (isIndexCheckpointPublisherEnabled()) return true;
	return Boolean(process.env[INDEX_POSTING_KEY_ENV]?.trim());
}

export async function validateIndexCheckpointPublisherConfig(
	runtime: RagnarokRuntimeConfig,
): Promise<{ account: string; publicKey: string; enabled: boolean }> {
	const signer = await getIndexCheckpointSigner(runtime);
	const keys = await fetchAccountKeys(signer.account);
	if (!keys.posting.includes(signer.publicKey)) {
		const err = new Error(
			`Index checkpoint pubkey ${signer.publicKey} is not a Posting authority for ${signer.account}. ` +
			`Authorities on chain: ${keys.posting.join(', ')}`,
		);
		cachedSigner = null;
		cachedSignerError = err;
		throw err;
	}
	return {
		account: signer.account,
		publicKey: signer.publicKey,
		enabled: isIndexCheckpointPublisherEnabled(),
	};
}

export function shouldPublishIndexCheckpoint(input: {
	readonly stats: IndexCheckpointStats;
	readonly intervalBlocks: number;
	readonly lastPublishedBucketValue: number;
}): { readonly publish: true; readonly bucket: number } | { readonly publish: false; readonly reason: string } {
	if (!input.stats.inSync) return { publish: false, reason: 'indexer_not_in_sync' };
	if (input.stats.lastIrreversibleBlockProcessed <= 0) return { publish: false, reason: 'cursor_not_ready' };

	const bucket = Math.floor(input.stats.lastIrreversibleBlockProcessed / input.intervalBlocks) * input.intervalBlocks;
	if (bucket <= 0) return { publish: false, reason: 'bucket_not_ready' };
	if (bucket <= input.lastPublishedBucketValue) return { publish: false, reason: 'checkpoint_already_published_for_bucket' };
	return { publish: true, bucket };
}

async function broadcastIndexCheckpoint(input: {
	readonly runtime: RagnarokRuntimeConfig;
	readonly payload: IndexCheckpointPayload;
}): Promise<{ readonly trxId?: string }> {
	const signer = await getIndexCheckpointSigner(input.runtime);
	const { Transaction } = await loadHiveTx();
	const tx = new Transaction();
	await tx.addOperation('custom_json', {
		required_auths: [],
		required_posting_auths: [signer.account],
		id: getIndexCheckpointCustomJsonId(input.runtime),
		json: JSON.stringify(input.payload),
	});
	tx.sign(signer.privateKey);
	const result = await tx.broadcast(true) as HiveTxResult;
	return { trxId: getResultTxId(result) };
}

export async function maybePublishIndexCheckpoint(
	runtime: RagnarokRuntimeConfig,
): Promise<IndexCheckpointPublishResult> {
	if (!isIndexCheckpointPublisherEnabled()) return { status: 'disabled' };
	if (publishInFlight) return { status: 'skipped', reason: 'publish_in_flight' };

	const stats = getStats();
	const intervalBlocks = getIndexCheckpointIntervalBlocks();
	const decision = shouldPublishIndexCheckpoint({
		stats,
		intervalBlocks,
		lastPublishedBucketValue: lastPublishedBucket,
	});
	if (!decision.publish) return { status: 'skipped', reason: decision.reason };

	publishInFlight = true;
	try {
		await getIndexCheckpointSigner(runtime);
		const payload = buildIndexCheckpointPayload({
			runtime,
			state: exportState(),
			stats,
		});
		if (isIndexCheckpointDryRun()) {
			lastPublishedBucket = decision.bucket;
			return {
			status: 'dry_run',
			block: payload.indexedBlock,
			bucket: decision.bucket,
			stateHash: payload.stateHash,
			};
		}

		const result = await broadcastIndexCheckpoint({ runtime, payload });
		lastPublishedBucket = decision.bucket;
		return {
			status: 'published',
			block: payload.indexedBlock,
			bucket: decision.bucket,
			trxId: result.trxId,
			stateHash: payload.stateHash,
		};
	} finally {
		publishInFlight = false;
	}
}
