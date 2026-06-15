import fs from 'fs/promises';
import path from 'path';
import { normalizeHiveUsername } from '../../shared/p2pAvailability';

type StarterClaimRecord = {
	readonly account: string;
	readonly claimedAt: number;
};

type SerializedStarterClaims = {
	readonly version: 1;
	readonly claims: readonly StarterClaimRecord[];
};

const claims = new Map<string, StarterClaimRecord>();
let loaded = false;

function getStarterClaimsFile(): string {
	return process.env.RAGNAROK_STARTER_CLAIMS_FILE
		?? path.join(process.cwd(), 'data', 'starter-claims.json');
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
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
	if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.claims)) return null;
	const parsedClaims = value.claims
		.map(readStarterClaimRecord)
		.filter((claim): claim is StarterClaimRecord => claim !== null);
	return { version: 1, claims: parsedClaims };
}

async function ensureStarterClaimsLoaded(): Promise<void> {
	if (loaded) return;
	loaded = true;
	const file = getStarterClaimsFile();
	try {
		const parsed: unknown = JSON.parse(await fs.readFile(file, 'utf8'));
		const serialized = readSerializedStarterClaims(parsed);
		if (!serialized) return;
		claims.clear();
		for (const claim of serialized.claims) claims.set(claim.account, claim);
	} catch (error) {
		if (isRecord(error) && error.code === 'ENOENT') return;
		claims.clear();
	}
}

async function saveStarterClaims(): Promise<void> {
	if (process.env.NODE_ENV === 'test') return;
	const file = getStarterClaimsFile();
	const dir = path.dirname(file);
	await fs.mkdir(dir, { recursive: true });
	const payload: SerializedStarterClaims = {
		version: 1,
		claims: [...claims.values()].sort((a, b) => a.account.localeCompare(b.account)),
	};
	await fs.writeFile(file, `${JSON.stringify(payload, null, 2)}\n`);
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
