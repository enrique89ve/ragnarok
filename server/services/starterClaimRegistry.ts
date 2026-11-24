import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import { normalizeHiveUsername } from '../../shared/p2pAvailability';
import { assertProtocolRuntimeFingerprint } from '../../shared/protocolPhaseMigration';
import { parseProtocolRuntimeFingerprint, type ProtocolRuntimeFingerprint } from '../../shared/protocolPhase';
import { buildRagnarokRuntimeEvidence, getRagnarokRuntimePhase } from '../../shared/runtimeConfig';
import { getRagnarokServerRuntimeConfig } from './runtimeConfig';

type StarterClaimRecord = {
	readonly account: string;
	readonly claimedAt: number;
};

type SerializedStarterClaimsV1 = {
	readonly version: 1;
	readonly claims: readonly StarterClaimRecord[];
};

type SerializedStarterClaimsV2 = {
	readonly version: 2;
	readonly runtimeFingerprint: ProtocolRuntimeFingerprint;
	readonly claims: readonly StarterClaimRecord[];
};

type SerializedStarterClaims = SerializedStarterClaimsV1 | SerializedStarterClaimsV2;

const claims = new Map<string, StarterClaimRecord>();
let loaded = false;
let loadPromise: Promise<void> | null = null;
let writeQueue: Promise<void> = Promise.resolve();
let writeSeq = 0;

function getDefaultStarterClaimsFile(): string {
	const runtime = getRagnarokServerRuntimeConfig();
	const phase = getRagnarokRuntimePhase(runtime);
	const filenameByPhase: Record<ReturnType<typeof getRagnarokRuntimePhase>, string> = {
		local: 'starter-claims.local.json',
		'qa-season-0': 'starter-claims.qa-season-0.json',
		'alfa-testnet': 'starter-claims.alfa-testnet.json',
		'closed-beta': 'starter-claims.closed-beta.json',
		'generic-testnet': 'starter-claims.testnet.json',
		mainnet: 'starter-claims.mainnet.json',
	};
	return path.join(process.cwd(), 'data', filenameByPhase[phase]);
}

export function resolveStarterClaimsFilePath(): string {
	return process.env.RAGNAROK_STARTER_CLAIMS_FILE
		?? getDefaultStarterClaimsFile();
}

function shouldSkipDiskWrites(): boolean {
	return process.env.NODE_ENV === 'test' && !process.env.RAGNAROK_STARTER_CLAIMS_FILE;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProtocolFingerprintError(error: unknown): error is Error & { code: 'fingerprint_mismatch' } {
	return isRecord(error) && error.code === 'fingerprint_mismatch';
}

function readStarterClaimRecord(value: unknown): StarterClaimRecord | null {
	if (!isRecord(value)) return null;
	if (typeof value.account !== 'string') return null;
	if (typeof value.claimedAt !== 'number' || !Number.isFinite(value.claimedAt) || value.claimedAt <= 0) return null;
	const account = normalizeHiveUsername(value.account);
	if (!account) return null;
	return { account, claimedAt: Math.trunc(value.claimedAt) };
}

function readSerializedStarterClaims(value: unknown): SerializedStarterClaims | null {
	if (!isRecord(value) || !Array.isArray(value.claims)) return null;
	const parsedClaims = value.claims
		.map(readStarterClaimRecord)
		.filter((claim): claim is StarterClaimRecord => claim !== null);

	if (value.version === 2) {
		const runtimeFingerprint = parseProtocolRuntimeFingerprint(value.runtimeFingerprint);
		return { version: 2, runtimeFingerprint, claims: parsedClaims };
	}

	if (value.version === 1) {
		if (getRagnarokRuntimePhase(getRagnarokServerRuntimeConfig()) !== 'local') return null;
		return { version: 1, claims: parsedClaims };
	}

	return null;
}

function legacyStarterClaimsV1Path(): string {
	return path.join(process.cwd(), 'data', 'starter-claims.json');
}

async function tryMigrateLegacyStarterClaimsV1(): Promise<boolean> {
	if (process.env.RAGNAROK_STARTER_CLAIMS_FILE) return false;

	const phase = getRagnarokRuntimePhase(getRagnarokServerRuntimeConfig());
	if (phase !== 'alfa-testnet' && phase !== 'local') return false;

	const legacyPath = legacyStarterClaimsV1Path();
	let raw: string;
	try {
		raw = await fs.readFile(legacyPath, 'utf8');
	} catch (error) {
		if (isRecord(error) && error.code === 'ENOENT') return false;
		throw error;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return false;
	}
	if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.claims)) return false;

	const migratedClaims = parsed.claims
		.map(readStarterClaimRecord)
		.filter((claim): claim is StarterClaimRecord => claim !== null);
	claims.clear();
	for (const claim of migratedClaims) claims.set(claim.account, claim);

	const targetFile = resolveStarterClaimsFilePath();
	if (!shouldSkipDiskWrites()) {
		const payload: SerializedStarterClaimsV2 = {
			version: 2,
			runtimeFingerprint: buildRagnarokRuntimeEvidence(getRagnarokServerRuntimeConfig()).runtimeFingerprint,
			claims: [...claims.values()].sort((a, b) => a.account.localeCompare(b.account)),
		};
		await writeStarterClaimsAtomic(targetFile, payload);
	}
	return true;
}

async function loadStarterClaimsFromDisk(): Promise<void> {
	const file = resolveStarterClaimsFilePath();
	try {
		const parsed: unknown = JSON.parse(await fs.readFile(file, 'utf8'));
		const serialized = readSerializedStarterClaims(parsed);
		if (!serialized) return;

		if (serialized.version === 2) {
			const currentFingerprint = buildRagnarokRuntimeEvidence(getRagnarokServerRuntimeConfig()).runtimeFingerprint;
			assertProtocolRuntimeFingerprint(currentFingerprint, serialized.runtimeFingerprint);
		}

		claims.clear();
		for (const claim of serialized.claims) claims.set(claim.account, claim);
	} catch (error) {
		if (isRecord(error) && error.code === 'ENOENT') {
			if (await tryMigrateLegacyStarterClaimsV1()) return;
			return;
		}
		if (isProtocolFingerprintError(error)) throw error;
		claims.clear();
	}
}

async function ensureStarterClaimsLoaded(): Promise<void> {
	if (loaded) return;
	if (!loadPromise) {
		loadPromise = (async () => {
			try {
				await loadStarterClaimsFromDisk();
				loaded = true;
			} catch (error) {
				loadPromise = null;
				throw error;
			}
		})();
	}
	await loadPromise;
}

async function writeStarterClaimsAtomic(file: string, payload: SerializedStarterClaims): Promise<void> {
	const dir = path.dirname(file);
	await fs.mkdir(dir, { recursive: true });
	const body = `${JSON.stringify(payload, null, 2)}\n`;
	const tmpFile = `${file}.${process.pid}.${Date.now()}.${++writeSeq}.tmp`;
	let fileHandle: fssync.promises.FileHandle | null = null;
	try {
		fileHandle = await fs.open(tmpFile, 'w');
		await fileHandle.writeFile(body, 'utf8');
		await fileHandle.sync();
		await fileHandle.close();
		fileHandle = null;
		await fs.rename(tmpFile, file);
	} catch (error) {
		if (fileHandle) await fileHandle.close().catch(() => undefined);
		await fs.unlink(tmpFile).catch(() => undefined);
		throw error;
	}
}

async function saveStarterClaims(): Promise<void> {
	if (shouldSkipDiskWrites()) return;

	const persist = async (): Promise<void> => {
		const file = resolveStarterClaimsFilePath();
		const payload: SerializedStarterClaimsV2 = {
			version: 2,
			runtimeFingerprint: buildRagnarokRuntimeEvidence(getRagnarokServerRuntimeConfig()).runtimeFingerprint,
			claims: [...claims.values()].sort((a, b) => a.account.localeCompare(b.account)),
		};
		await writeStarterClaimsAtomic(file, payload);
	};

	const previous = writeQueue;
	let release: () => void = () => undefined;
	writeQueue = new Promise<void>((resolve) => {
		release = resolve;
	});

	try {
		await previous;
		await persist();
	} finally {
		release();
	}
}

export async function hasStarterCeremonyClaim(account: string | undefined | null): Promise<boolean> {
	const normalized = account ? normalizeHiveUsername(account) : '';
	if (!normalized) return false;
	await ensureStarterClaimsLoaded();
	return claims.has(normalized);
}

export async function setStarterCeremonyClaim(account: string, claimedAt = Date.now()): Promise<StarterClaimRecord> {
	const normalized = normalizeHiveUsername(account);
	if (!normalized) throw new Error('starter claim account required');
	await ensureStarterClaimsLoaded();
	const record: StarterClaimRecord = {
		account: normalized,
		claimedAt: Math.trunc(claimedAt),
	};
	claims.set(normalized, record);
	await saveStarterClaims();
	return record;
}

export function clearStarterCeremonyClaimsForTests(): void {
	loaded = true;
	claims.clear();
}

export function resetStarterClaimRegistryForTests(): void {
	loaded = false;
	loadPromise = null;
	claims.clear();
	writeQueue = Promise.resolve();
	writeSeq = 0;
}