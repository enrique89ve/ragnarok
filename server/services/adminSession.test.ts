import { describe, expect, it } from 'vitest';
import {
	buildAdminSessionLoginMessage,
	buildAdminSessionLoginPayload,
} from '../../shared/protocol-core';
import type { RagnarokRuntimeConfig } from '../../shared/runtimeConfig';
import {
	ADMIN_SESSION_COOKIE_NAME,
	createAdminSessionManager,
} from './adminSession';

const runtime: RagnarokRuntimeConfig = {
	stage: 'testnet',
	executionMode: 'testnet',
	protocolId: 'rk_game_testnet',
	collectionId: 'ragnarok-testnet',
	adminAccount: 'ragnarok-admin',
	adminOperatorAccount: 'ragnarok-operator',
	genesisAccount: 'ragnarok-genesis',
	treasuryAccount: 'ragnarok-treasury',
	indexAccount: 'ragnarok-index',
	indexerUrl: '',
	artIndexerUrl: '',
	nftLoxProtocolId: 'nftlox_testnet',
	nftArtBaseUrl: 'https://example.com',
	externalUrlBase: 'https://example.com',
	resettable: true,
	economic: false,
	acceptsLegacyProtocolIds: false,
	seasonStart: '2026-05-19T00:00:00Z',
};

function createLoginFixture(now: number) {
	const payload = buildAdminSessionLoginPayload({
		adminAccount: runtime.adminAccount,
		protocolId: runtime.protocolId,
		stage: runtime.stage,
		nonce: now,
		issuedAt: now,
		expiresAt: now + 5 * 60 * 1000,
	});
	const message = buildAdminSessionLoginMessage(payload);
	return { payload, message };
}

function createTestManager(
	nowRef: { value: number },
	options: { readonly verifiedSignatures?: string[] } = {},
) {
	return createAdminSessionManager({
		now: () => nowRef.value,
		randomBytes: (size) => new Uint8Array(size).fill(7),
		verifyPostingSignature: async (account, message, signature) => {
			if (!message.includes('ragnarok-admin-session-login-v1')) return false;
			options.verifiedSignatures?.push(`${account}:${signature}`);
			return account === runtime.adminAccount && signature === 'admin-posting-signature';
		},
	});
}

describe('adminSession', () => {
	it('creates a server-side session from one admin Posting signature over an off-chain custom_json payload', async () => {
		const nowRef = { value: 1_000_000 };
		const verifiedSignatures: string[] = [];
		const manager = createTestManager(nowRef, { verifiedSignatures });
		const login = createLoginFixture(nowRef.value);

		const verified = await manager.verifyLogin({
			runtime,
			account: `@${runtime.adminAccount}`,
			nonce: login.payload.nonce,
			payload: login.payload,
			message: login.message,
			signature: 'admin-posting-signature',
		});

		expect(verified.success).toBe(true);
		if (!verified.success) return;
		expect(verified.session).toMatchObject({
			authenticated: true,
			account: runtime.adminAccount,
			adminOperatorAccount: runtime.adminOperatorAccount,
			loginSignature: true,
		});
		expect(verifiedSignatures).toEqual([`${runtime.adminAccount}:admin-posting-signature`]);

		const cookie = `${ADMIN_SESSION_COOKIE_NAME}=${encodeURIComponent(verified.token)}`;
		const read = manager.readSession({
			runtime,
			cookieHeader: cookie,
			touch: false,
		});
		expect(read.success).toBe(true);
	});

	it('rejects non-admin accounts', async () => {
		const nowRef = { value: 1_000_000 };
		const manager = createTestManager(nowRef);
		const login = createLoginFixture(nowRef.value);

		const verified = await manager.verifyLogin({
			runtime,
			account: 'ragnarok-operator',
			nonce: login.payload.nonce,
			payload: login.payload,
			message: login.message,
			signature: 'admin-posting-signature',
		});

		expect(verified).toEqual({
			success: false,
			status: 403,
			reason: 'Admin account mismatch',
		});
	});

	it('rejects a session when the client payload does not match the canonical custom_json message', async () => {
		const nowRef = { value: 1_000_000 };
		const manager = createTestManager(nowRef);
		const login = createLoginFixture(nowRef.value);

		const verified = await manager.verifyLogin({
			runtime,
			account: runtime.adminAccount,
			nonce: login.payload.nonce,
			payload: login.payload,
			message: `${login.message}:tampered`,
			signature: 'admin-posting-signature',
		});

		expect(verified).toEqual({
			success: false,
			status: 401,
			reason: 'Admin session payload mismatch',
		});
	});

	it('consumes a login payload after successful verification', async () => {
		const nowRef = { value: 1_000_000 };
		const manager = createTestManager(nowRef);
		const login = createLoginFixture(nowRef.value);

		const first = await manager.verifyLogin({
			runtime,
			account: runtime.adminAccount,
			nonce: login.payload.nonce,
			payload: login.payload,
			message: login.message,
			signature: 'admin-posting-signature',
		});
		expect(first.success).toBe(true);

		const replay = await manager.verifyLogin({
			runtime,
			account: runtime.adminAccount,
			nonce: login.payload.nonce,
			payload: login.payload,
			message: login.message,
			signature: 'admin-posting-signature',
		});
		expect(replay).toEqual({
			success: false,
			status: 401,
			reason: 'Admin session login already consumed',
		});
	});

	it('rejects sessions when the runtime admin/operator pair changes', async () => {
		const nowRef = { value: 1_000_000 };
		const manager = createTestManager(nowRef);
		const login = createLoginFixture(nowRef.value);
		const verified = await manager.verifyLogin({
			runtime,
			account: runtime.adminAccount,
			nonce: login.payload.nonce,
			payload: login.payload,
			message: login.message,
			signature: 'admin-posting-signature',
		});
		if (!verified.success) throw new Error('expected session');

		const changedRuntime = {
			...runtime,
			adminOperatorAccount: 'different-operator',
		};
		const cookie = `${ADMIN_SESSION_COOKIE_NAME}=${encodeURIComponent(verified.token)}`;
		expect(manager.readSession({
			runtime: changedRuntime,
			cookieHeader: cookie,
		})).toEqual({
			success: false,
			status: 401,
			reason: 'Admin session runtime mismatch',
		});
	});
});
