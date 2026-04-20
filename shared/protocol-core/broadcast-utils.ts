/**
 * Broadcast Utilities — Patterns extracted from NFTLox protocol
 *
 * 1. BuildResult<T> — structured broadcast results with all errors/warnings
 * 2. Operation size estimation + auto-batch splitting
 * 3. Input sanitization (HTML entity stripping)
 * 4. Deterministic UID generation (anti-duplication)
 * 5. Structured transfer memos for L1 explorer readability
 */

import { sha256Hash } from './hash';

// ============================================================
// 1. BuildResult<T> — Structured broadcast result
// ============================================================

export interface ValidationError {
	field: string;
	message: string;
	code: 'required' | 'invalid' | 'too_long' | 'duplicate' | 'unauthorized' | 'supply_exceeded';
}

export interface BuildResult<T> {
	success: boolean;
	payload?: T;
	operation?: HiveCustomJsonOp;
	errors: ValidationError[];
	warnings: string[];
	generatedId?: string;
	estimatedBytes?: number;
}

export interface HiveCustomJsonOp {
	type: 'custom_json';
	id: string;
	json: string;
	requiredAuths: string[];
	requiredPostingAuths: string[];
}

export function buildSuccess<T>(payload: T, op?: HiveCustomJsonOp, extras?: { generatedId?: string; estimatedBytes?: number }): BuildResult<T> {
	return {
		success: true,
		payload,
		operation: op,
		errors: [],
		warnings: [],
		generatedId: extras?.generatedId,
		estimatedBytes: extras?.estimatedBytes,
	};
}

export function buildFailure<T>(errors: ValidationError[], warnings: string[] = []): BuildResult<T> {
	return { success: false, errors, warnings };
}

export function validationError(field: string, message: string, code: ValidationError['code'] = 'invalid'): ValidationError {
	return { field, message, code };
}

// ============================================================
// 2. Operation size estimation + auto-batch splitting
// ============================================================

const HIVE_MAX_CUSTOM_JSON_BYTES = 8192;
const JSON_ENVELOPE_OVERHEAD = 120; // {"required_auths":[],"required_posting_auths":[],"id":"ragnarok-cards","json":"..."}

/**
 * Estimate the byte size of a custom_json payload.
 * Uses TextEncoder for accurate UTF-8 byte measurement.
 */
export function estimatePayloadBytes(payload: Record<string, unknown>): number {
	const jsonStr = JSON.stringify(payload);
	// JSON is double-escaped inside the custom_json `json` field
	const escapedStr = JSON.stringify(jsonStr);
	return new TextEncoder().encode(escapedStr).byteLength + JSON_ENVELOPE_OVERHEAD;
}

/**
 * Check if a payload fits within Hive's custom_json size limit.
 */
export function validatePayloadSize(payload: Record<string, unknown>): { valid: boolean; bytes: number; maxBytes: number } {
	const bytes = estimatePayloadBytes(payload);
	return { valid: bytes <= HIVE_MAX_CUSTOM_JSON_BYTES, bytes, maxBytes: HIVE_MAX_CUSTOM_JSON_BYTES };
}

/**
 * Split an array of items into batches that fit within Hive tx size limits.
 * Each batch produces one custom_json op.
 *
 * @param items - Array of items to batch
 * @param wrapBatch - Function that wraps a batch into a full payload
 * @param maxBytesPerOp - Maximum bytes per custom_json op (default: 8KB)
 * @returns Array of batches, each containing items that fit in one op
 */
export function splitIntoBatches<T>(
	items: T[],
	wrapBatch: (batch: T[]) => Record<string, unknown>,
	maxBytesPerOp: number = HIVE_MAX_CUSTOM_JSON_BYTES,
): T[][] {
	if (items.length === 0) return [];

	const batches: T[][] = [];
	let currentBatch: T[] = [];

	for (const item of items) {
		const testBatch = [...currentBatch, item];
		const testPayload = wrapBatch(testBatch);
		const bytes = estimatePayloadBytes(testPayload);

		if (bytes > maxBytesPerOp && currentBatch.length > 0) {
			batches.push(currentBatch);
			currentBatch = [item];
		} else {
			currentBatch = testBatch;
		}
	}

	if (currentBatch.length > 0) {
		batches.push(currentBatch);
	}

	return batches;
}

/**
 * Estimate how many items can fit in a single batch.
 * Useful for progress UI ("batch 3 of ~12").
 */
export function estimateBatchCount<T>(
	items: T[],
	wrapBatch: (batch: T[]) => Record<string, unknown>,
	maxBytesPerOp: number = HIVE_MAX_CUSTOM_JSON_BYTES,
): number {
	return splitIntoBatches(items, wrapBatch, maxBytesPerOp).length;
}

// ============================================================
// 3. Input sanitization
// ============================================================

const HTML_ENTITY_RE = /[&<>"']/g;
const HTML_ENTITY_MAP: Record<string, string> = {
	'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;',
};

// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Sanitize a string for safe inclusion in custom_json payloads.
 * Strips HTML entities and control characters.
 */
export function sanitizeString(input: string): string {
	return input
		.replace(CONTROL_CHAR_RE, '')
		.replace(HTML_ENTITY_RE, (char) => HTML_ENTITY_MAP[char] || char)
		.trim();
}

/**
 * Sanitize all string values in an object (shallow, one level).
 */
export function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
	const clean: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(payload)) {
		if (typeof value === 'string') {
			clean[key] = sanitizeString(value);
		} else if (Array.isArray(value)) {
			clean[key] = value.map(v => typeof v === 'string' ? sanitizeString(v) : v);
		} else {
			clean[key] = value;
		}
	}
	return clean;
}

/**
 * Validate a Hive username format.
 */
export function isValidHiveUsername(username: string): boolean {
	return /^[a-z][a-z0-9.-]{2,15}$/.test(username);
}

// ============================================================
// 4. Deterministic UID generation (anti-duplication)
// ============================================================

/**
 * FNV-1a hash (32-bit, two-pass for 64-bit effective).
 * Deterministic, fast, non-cryptographic. Same as NFTLox.
 * Used for ID generation where collision avoidance (not security) matters.
 */
export function fnv1a(input: string): string {
	const FNV_OFFSET = 0x811c9dc5;
	const FNV_PRIME = 0x01000193;

	let h1 = FNV_OFFSET;
	let h2 = FNV_OFFSET ^ 0x6c62272e; // second seed for wider distribution

	for (let i = 0; i < input.length; i++) {
		const c = input.charCodeAt(i);
		h1 ^= c;
		h1 = Math.imul(h1, FNV_PRIME);
		h2 ^= c;
		h2 = Math.imul(h2, FNV_PRIME);
	}

	// Combine both halves for 64-bit effective distribution
	const hi = (h1 >>> 0).toString(16).padStart(8, '0');
	const lo = (h2 >>> 0).toString(16).padStart(8, '0');
	return hi + lo;
}

/**
 * Generate a deterministic card UID from mint parameters.
 * Same inputs always produce the same UID — prevents double-mint on retry.
 *
 * Format: "card_{fnv1a(collectionId:cardId:editionNumber)}"
 */
export function generateDeterministicCardUid(
	collectionId: string,
	cardId: number,
	editionNumber: number,
): string {
	const input = `ragnarok:card:${collectionId}:${cardId}:${editionNumber}`;
	return `card_${fnv1a(input)}`;
}

/**
 * Generate a deterministic pack UID.
 * Format: "pack_{fnv1a(collectionId:packType:mintIndex)}"
 */
export function generateDeterministicPackUid(
	collectionId: string,
	packType: string,
	mintIndex: number,
): string {
	const input = `ragnarok:pack:${collectionId}:${packType}:${mintIndex}`;
	return `pack_${fnv1a(input)}`;
}

/**
 * Generate deterministic origin DNA for a card design (genotype).
 * All copies of the same card design share this DNA.
 */
export async function generateOriginDna(collectionId: string, cardId: number): Promise<string> {
	const hash = await sha256Hash(`ragnarok:origin:${collectionId}:${cardId}`);
	return hash.slice(0, 16);
}

/**
 * Generate deterministic instance DNA for a specific copy (phenotype).
 * Unique per individual card instance.
 */
export async function generateInstanceDna(originDna: string, trxId: string, index: number): Promise<string> {
	const hash = await sha256Hash(`${originDna}:${trxId}:${index}`);
	return hash.slice(0, 16);
}

/**
 * Validate an artId / cardId deduplication key.
 * Max 14 chars, alphanumeric + hyphens only (NFTLox pattern).
 */
export function validateArtId(artId: string): boolean {
	return /^[a-zA-Z0-9-]{1,14}$/.test(artId);
}

// ============================================================
// 5. Structured transfer memos
// ============================================================

/**
 * Build a structured, parseable memo for L1 explorer visibility.
 * Format: "ragnarok:{action}:{uid}:{cardId}:{edition}:{instanceDna}"
 */
export function buildTransferMemo(params: {
	action: 'transfer' | 'gift' | 'trade' | 'pack_transfer';
	uid: string;
	cardId?: number;
	edition?: string;
	instanceDna?: string;
}): string {
	const parts = [
		'ragnarok',
		params.action,
		params.uid,
	];
	if (params.cardId !== undefined) parts.push(String(params.cardId));
	if (params.edition) parts.push(params.edition);
	if (params.instanceDna) parts.push(params.instanceDna.slice(0, 8));
	return parts.join(':');
}

/**
 * Parse a structured transfer memo back into fields.
 */
export function parseTransferMemo(memo: string): {
	protocol: string;
	action: string;
	uid: string;
	cardId?: number;
	edition?: string;
	dnaPrefix?: string;
} | null {
	const parts = memo.split(':');
	if (parts[0] !== 'ragnarok' || parts.length < 3) return null;
	return {
		protocol: parts[0],
		action: parts[1],
		uid: parts[2],
		cardId: parts[3] ? parseInt(parts[3], 10) : undefined,
		edition: parts[4],
		dnaPrefix: parts[5],
	};
}

// ============================================================
// 6. Mint session crash recovery
// ============================================================

export interface MintSessionBatch {
	batchNumber: number;
	status: 'pending' | 'broadcasting' | 'confirmed' | 'failed';
	cardCount: number;
	trxId?: string;
	error?: string;
	timestamp?: number;
}

export interface MintSession {
	sessionId: string;
	status: 'created' | 'genesis_pending' | 'minting' | 'sealing' | 'complete' | 'failed';
	createdAt: number;
	updatedAt: number;
	collectionId: string;
	totalCards: number;
	batches: MintSessionBatch[];
	genesisTrxId?: string;
	sealTrxId?: string;
}

const MINT_SESSION_KEY = 'ragnarok_mint_session';

/**
 * Save mint session to localStorage for crash recovery.
 */
export function saveMintSession(session: MintSession): void {
	try {
		localStorage.setItem(MINT_SESSION_KEY, JSON.stringify(session));
	} catch {
		// localStorage unavailable (SSR, quota)
	}
}

/**
 * Load a saved mint session (for crash recovery).
 */
export function loadMintSession(): MintSession | null {
	try {
		const raw = localStorage.getItem(MINT_SESSION_KEY);
		if (!raw) return null;
		return JSON.parse(raw) as MintSession;
	} catch {
		return null;
	}
}

/**
 * Clear the mint session (after successful completion).
 */
export function clearMintSession(): void {
	try {
		localStorage.removeItem(MINT_SESSION_KEY);
	} catch {
		// ignore
	}
}

/**
 * Get the next unfinished batch from a recovered session.
 */
export function getNextPendingBatch(session: MintSession): MintSessionBatch | null {
	return session.batches.find(b => b.status === 'pending' || b.status === 'broadcasting') || null;
}

/**
 * Count completed batches for progress reporting.
 */
export function getSessionProgress(session: MintSession): {
	completed: number;
	total: number;
	percentage: number;
} {
	const completed = session.batches.filter(b => b.status === 'confirmed').length;
	const total = session.batches.length;
	return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
}
