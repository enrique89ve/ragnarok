import { createHash, randomBytes } from 'crypto';
import type { RagnarokRuntimeConfig } from '../../shared/runtimeConfig';
import {
	ADMIN_SESSION_LOGIN_ACTION,
	ADMIN_SESSION_LOGIN_DOMAIN,
	buildAdminSessionLoginMessage,
	type AdminSessionLoginPayload,
} from '../../shared/protocol-core';
import { serverSignatureVerifier } from './hiveSignatureVerifier';

export const ADMIN_SESSION_COOKIE_NAME = 'ragnarok_admin_session';
export const ADMIN_SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const ADMIN_SESSION_LOGIN_TTL_MS = 5 * 60 * 1000;
const ADMIN_SESSION_FUTURE_SKEW_MS = 30_000;

type AdminSessionRecord = {
	readonly tokenHash: string;
	readonly adminAccount: string;
	readonly operatorAccount: string;
	readonly nonce: number;
	readonly loginMessage: string;
	readonly loginPayload: AdminSessionLoginPayload;
	readonly adminSignature: string;
	readonly createdAt: number;
	readonly expiresAt: number;
	readonly lastSeenAt: number;
};

export type AdminSessionPublic = {
	readonly authenticated: true;
	readonly account: string;
	readonly adminAccount: string;
	readonly adminOperatorAccount: string;
	readonly nonce: number;
	readonly createdAt: number;
	readonly expiresAt: number;
	readonly lastSeenAt: number;
	readonly loginSignature: true;
};

export type AdminSessionStatus =
	| AdminSessionPublic
	| {
		readonly authenticated: false;
		readonly adminAccount: string;
		readonly adminOperatorAccount: string;
		readonly reason?: string;
	};

export type AdminSessionVerifyResult =
	| {
		readonly success: true;
		readonly token: string;
		readonly session: AdminSessionPublic;
	}
	| { readonly success: false; readonly status: number; readonly reason: string };

export type AdminSessionReadResult =
	| { readonly success: true; readonly session: AdminSessionPublic; readonly token: string }
	| { readonly success: false; readonly status: number; readonly reason: string };

export type AdminSessionManager = ReturnType<typeof createAdminSessionManager>;

type AdminSessionManagerDeps = {
	readonly now: () => number;
	readonly randomBytes: (size: number) => Uint8Array;
	readonly verifyPostingSignature: (account: string, message: string, signatureHex: string) => Promise<boolean>;
};

type VerifyLoginInput = {
	readonly runtime: RagnarokRuntimeConfig;
	readonly account: string;
	readonly nonce: number;
	readonly payload: AdminSessionLoginPayload;
	readonly message: string;
	readonly signature: string;
};

function hashToken(token: string): string {
	return createHash('sha256').update(token, 'utf8').digest('hex');
}

function createSessionToken(bytes: Uint8Array): string {
	return Buffer.from(bytes).toString('base64url');
}

function sanitizeAccount(account: string): string {
	return account.trim().replace(/^@/, '');
}

function pruneExpired<T extends { readonly expiresAt: number }>(
	records: Map<string, T>,
	now: number,
): void {
	for (const [key, value] of records.entries()) {
		if (value.expiresAt <= now) records.delete(key);
	}
}

function toPublicSession(record: AdminSessionRecord): AdminSessionPublic {
	return {
		authenticated: true,
		account: record.adminAccount,
		adminAccount: record.adminAccount,
		adminOperatorAccount: record.operatorAccount,
		nonce: record.nonce,
		createdAt: record.createdAt,
		expiresAt: record.expiresAt,
		lastSeenAt: record.lastSeenAt,
		loginSignature: true,
	};
}

function pruneExpiredLoginMessages(
	records: Map<string, number>,
	now: number,
): void {
	for (const [key, expiresAt] of records.entries()) {
		if (expiresAt <= now) records.delete(key);
	}
}

function isAdminSessionLoginPayload(value: unknown): value is AdminSessionLoginPayload {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const body = value as Record<string, unknown>;
	return body.action === ADMIN_SESSION_LOGIN_ACTION
		&& body.version === 1
		&& body.domain === ADMIN_SESSION_LOGIN_DOMAIN
		&& typeof body.adminAccount === 'string'
		&& typeof body.protocolId === 'string'
		&& typeof body.stage === 'string'
		&& typeof body.nonce === 'number'
		&& Number.isSafeInteger(body.nonce)
		&& typeof body.issuedAt === 'number'
		&& Number.isSafeInteger(body.issuedAt)
		&& typeof body.expiresAt === 'number'
		&& Number.isSafeInteger(body.expiresAt);
}

function getCookieValue(cookieHeader: string | undefined, name: string): string | null {
	if (!cookieHeader) return null;
	for (const rawPart of cookieHeader.split(';')) {
		const part = rawPart.trim();
		const separatorIndex = part.indexOf('=');
		if (separatorIndex <= 0) continue;
		const key = part.slice(0, separatorIndex);
		if (key !== name) continue;
		try {
			return decodeURIComponent(part.slice(separatorIndex + 1));
		} catch {
			return null;
		}
	}
	return null;
}

export function createAdminSessionManager(deps: AdminSessionManagerDeps) {
	const sessions = new Map<string, AdminSessionRecord>();
	const consumedLoginMessages = new Map<string, number>();

	async function verifyLogin(
		input: VerifyLoginInput,
	): Promise<AdminSessionVerifyResult> {
		const account = sanitizeAccount(input.account);
		if (account !== input.runtime.adminAccount) {
			return { success: false, status: 403, reason: 'Admin account mismatch' };
		}
		if (!Number.isSafeInteger(input.nonce) || input.nonce <= 0) {
			return { success: false, status: 400, reason: 'Invalid admin session nonce' };
		}
		if (!isAdminSessionLoginPayload(input.payload)) {
			return { success: false, status: 400, reason: 'Invalid admin session payload' };
		}
		if (input.signature.length < 10) {
			return { success: false, status: 400, reason: 'Missing admin session signature' };
		}

		const now = deps.now();
		pruneExpired(sessions, now);
		pruneExpiredLoginMessages(consumedLoginMessages, now);

		if (input.payload.adminAccount !== input.runtime.adminAccount) {
			return { success: false, status: 403, reason: 'Admin session payload account mismatch' };
		}
		if (input.payload.protocolId !== input.runtime.protocolId) {
			return { success: false, status: 403, reason: 'Admin session payload protocol mismatch' };
		}
		if (input.payload.stage !== input.runtime.stage) {
			return { success: false, status: 403, reason: 'Admin session payload stage mismatch' };
		}
		if (input.payload.nonce !== input.nonce) {
			return { success: false, status: 400, reason: 'Admin session nonce mismatch' };
		}
		if (input.payload.issuedAt - now > ADMIN_SESSION_FUTURE_SKEW_MS) {
			return { success: false, status: 401, reason: 'Admin session nonce is too far in the future' };
		}
		if (input.payload.expiresAt <= now || now - input.payload.issuedAt > ADMIN_SESSION_LOGIN_TTL_MS) {
			return { success: false, status: 401, reason: 'Admin session login expired' };
		}
		if (input.payload.expiresAt - input.payload.issuedAt > ADMIN_SESSION_LOGIN_TTL_MS) {
			return { success: false, status: 400, reason: 'Admin session login window is too long' };
		}
		const expectedMessage = buildAdminSessionLoginMessage({
			adminAccount: input.runtime.adminAccount,
			protocolId: input.runtime.protocolId,
			stage: input.runtime.stage,
			nonce: input.payload.nonce,
			issuedAt: input.payload.issuedAt,
			expiresAt: input.payload.expiresAt,
		});
		if (input.message !== expectedMessage) {
			return { success: false, status: 401, reason: 'Admin session payload mismatch' };
		}
		if (consumedLoginMessages.has(input.message)) {
			return { success: false, status: 401, reason: 'Admin session login already consumed' };
		}

		const validAdminSignature = await deps.verifyPostingSignature(
			input.runtime.adminAccount,
			input.message,
			input.signature,
		);
		if (!validAdminSignature) {
			return { success: false, status: 401, reason: 'Admin Posting signature is invalid' };
		}

		const token = createSessionToken(deps.randomBytes(32));
		const tokenHash = hashToken(token);
		const session: AdminSessionRecord = {
			tokenHash,
			adminAccount: input.runtime.adminAccount,
			operatorAccount: input.runtime.adminOperatorAccount,
			nonce: input.payload.nonce,
			loginMessage: input.message,
			loginPayload: input.payload,
			adminSignature: input.signature,
			createdAt: now,
			expiresAt: now + ADMIN_SESSION_TTL_MS,
			lastSeenAt: now,
		};

		consumedLoginMessages.set(input.message, input.payload.expiresAt);
		sessions.set(tokenHash, session);
		return { success: true, token, session: toPublicSession(session) };
	}

	function readSession(input: {
		readonly runtime: RagnarokRuntimeConfig;
		readonly cookieHeader: string | undefined;
		readonly touch?: boolean;
	}): AdminSessionReadResult {
		const now = deps.now();
		pruneExpired(sessions, now);

		const token = getCookieValue(input.cookieHeader, ADMIN_SESSION_COOKIE_NAME);
		if (!token) return { success: false, status: 401, reason: 'Admin session required' };

		const tokenHash = hashToken(token);
		const session = sessions.get(tokenHash);
		if (!session) return { success: false, status: 401, reason: 'Admin session is invalid or expired' };
		if (session.expiresAt <= now) {
			sessions.delete(tokenHash);
			return { success: false, status: 401, reason: 'Admin session expired' };
		}
		if (
			session.adminAccount !== input.runtime.adminAccount
			|| session.operatorAccount !== input.runtime.adminOperatorAccount
		) {
			sessions.delete(tokenHash);
			return { success: false, status: 401, reason: 'Admin session runtime mismatch' };
		}

		const updated = input.touch === false
			? session
			: { ...session, lastSeenAt: now };
		if (updated !== session) sessions.set(tokenHash, updated);
		return { success: true, session: toPublicSession(updated), token };
	}

	function getStatus(input: {
		readonly runtime: RagnarokRuntimeConfig;
		readonly cookieHeader: string | undefined;
	}): AdminSessionStatus {
		const result = readSession({
			runtime: input.runtime,
			cookieHeader: input.cookieHeader,
			touch: true,
		});
		if (result.success) return result.session;
		return {
			authenticated: false,
			adminAccount: input.runtime.adminAccount,
			adminOperatorAccount: input.runtime.adminOperatorAccount,
			reason: result.reason,
		};
	}

	function destroySession(cookieHeader: string | undefined): void {
		const token = getCookieValue(cookieHeader, ADMIN_SESSION_COOKIE_NAME);
		if (!token) return;
		sessions.delete(hashToken(token));
	}

	function resetForTests(): void {
		sessions.clear();
		consumedLoginMessages.clear();
	}

	return {
		verifyLogin,
		readSession,
		getStatus,
		destroySession,
		resetForTests,
	};
}

export const adminSessionManager = createAdminSessionManager({
	now: () => Date.now(),
	randomBytes: (size) => randomBytes(size),
	verifyPostingSignature: (account, message, signatureHex) => {
		const verifyPosting = serverSignatureVerifier.verifyCurrentPostingKey;
		if (!verifyPosting) return Promise.resolve(false);
		return verifyPosting(account, message, signatureHex);
	},
});
