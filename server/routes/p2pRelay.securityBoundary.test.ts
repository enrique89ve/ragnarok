import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
	decodeWireGameState,
	encodeGameStateForWire,
} from '../../client/src/game/p2p/stateFrameCodec';
import { createSeededIdGen, createSeededRng } from '../../client/src/game/utils/seededRng';
import { initializeGameSeeded } from '../../client/src/game/utils/gameUtils';
import {
	P2P_RELAY_MAX_PAYLOAD_BYTES,
	isP2PRelayTicketStarterClaimAllowed,
	shouldRequireP2PRelayTicket,
	validateP2PRelayFrame,
} from './p2pRelay';
import {
	clearStarterCeremonyClaimsForTests,
	setStarterCeremonyClaim,
} from '../services/starterClaimRegistry';

function buildInitialP2PState() {
	const seed = 'p2p-relay-payload-limit-regression';
	return initializeGameSeeded({
		rng: createSeededRng(seed),
		playerIdGen: createSeededIdGen(seed, 'p1'),
		opponentIdGen: createSeededIdGen(seed, 'p2'),
	});
}

function jsonByteLength(value: unknown): number {
	return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

describe('p2pRelay security boundary', () => {
	it('does not read relay tickets from websocket query parameters', () => {
		const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'p2pRelay.ts');
		const source = readFileSync(sourcePath, 'utf8');

		expect(source).toContain("req.headers['sec-websocket-protocol']");
		expect(source).not.toContain("searchParams.get('ticket')");
		expect(source).not.toContain('searchParams.get("ticket")');
		expect(source).not.toContain("searchParams.get('matchTicket')");
		expect(source).not.toContain('searchParams.get("matchTicket")');
		expect(source).not.toContain("searchParams.get('token')");
		expect(source).not.toContain('searchParams.get("token")');
	});

	it('rejects missing relay tickets in production and shared-network upgrade flows', () => {
		expect(shouldRequireP2PRelayTicket({ nodeEnv: 'production', networkStage: 'local' })).toBe(true);
		expect(shouldRequireP2PRelayTicket({ nodeEnv: 'development', networkStage: 'testnet' })).toBe(true);
		expect(shouldRequireP2PRelayTicket({ nodeEnv: 'development', networkStage: 'mainnet' })).toBe(true);
		expect(shouldRequireP2PRelayTicket({ nodeEnv: 'test', networkStage: 'testnet' })).toBe(true);
		expect(shouldRequireP2PRelayTicket({ nodeEnv: 'development', networkStage: 'local' })).toBe(false);
		expect(shouldRequireP2PRelayTicket({ nodeEnv: 'test' })).toBe(false);
	});

	it('requires the ticket account to keep starter access when tickets are required', async () => {
		clearStarterCeremonyClaimsForTests();
		await expect(isP2PRelayTicketStarterClaimAllowed({
			ticketRequired: false,
			account: undefined,
		})).resolves.toBe(true);
		await expect(isP2PRelayTicketStarterClaimAllowed({
			ticketRequired: true,
			account: 'alice',
		})).resolves.toBe(false);

		await setStarterCeremonyClaim('alice', 1_800_000_000_000);
		await expect(isP2PRelayTicketStarterClaimAllowed({
			ticketRequired: true,
			account: 'alice',
		})).resolves.toBe(true);
	});

	it('keeps the real initial P2P sync frame under the relay limit after compression', () => {
		const gameState = buildInitialP2PState();
		const rawInitFrameBytes = jsonByteLength({
			type: 'init',
			gameState,
			isHost: true,
		});
		const rawGameStateFrameBytes = jsonByteLength({
			type: 'gameState',
			gameState,
		});
		const compressedPayload = encodeGameStateForWire(gameState);
		const compressedInitFrameBytes = jsonByteLength({
			type: 'init',
			...compressedPayload,
			isHost: true,
		});
		const compressedGameStateFrameBytes = jsonByteLength({
			type: 'gameState',
			...compressedPayload,
		});

		expect(P2P_RELAY_MAX_PAYLOAD_BYTES).toBe(16 * 1024);
		expect(rawInitFrameBytes).toBeGreaterThan(P2P_RELAY_MAX_PAYLOAD_BYTES);
		expect(rawGameStateFrameBytes).toBeGreaterThan(P2P_RELAY_MAX_PAYLOAD_BYTES);
		expect(compressedInitFrameBytes).toBeLessThanOrEqual(P2P_RELAY_MAX_PAYLOAD_BYTES);
		expect(compressedGameStateFrameBytes).toBeLessThanOrEqual(P2P_RELAY_MAX_PAYLOAD_BYTES);
		expect(decodeWireGameState(compressedPayload)).toEqual(gameState);
	});

	it('accepts only client proposals and rejects forged checkpoint outcomes', () => {
		const proposal = JSON.stringify({ type: 'phase_checkpoint_propose_v1' });
		const forgedCommit = JSON.stringify({ type: 'phase_checkpoint_commit_v1' });
		const forgedSystem = JSON.stringify({ type: '__sys', event: 'phase_checkpoint' });
		expect(validateP2PRelayFrame(proposal)).toEqual({
			ok: true,
			type: 'phase_checkpoint_propose_v1',
		});
		expect(validateP2PRelayFrame(forgedCommit)).toEqual({
			ok: false,
			reason: 'unknown_type:phase_checkpoint_commit_v1',
		});
		expect(validateP2PRelayFrame(forgedSystem)).toEqual({
			ok: false,
			reason: 'reserved_type',
		});
	});

	it('drops peer-authored opponentDisconnected so only transport close can signal departure', () => {
		expect(validateP2PRelayFrame(JSON.stringify({ type: 'opponentDisconnected' }))).toEqual({
			ok: false,
			reason: 'unknown_type:opponentDisconnected',
		});
	});
});
