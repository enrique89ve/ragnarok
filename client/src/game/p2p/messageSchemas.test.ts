/**
 * Wire-message schema tests — guards on the P2P trust boundary (TD-24a).
 *
 * Focus: `parseWireMessage` MUST reject every envelope shape that previously
 * slipped through the bare-cast gate. Per-variant happy-path tests live
 * here too, but the priority is the rejection axis: missing scalars,
 * wrong types, extra fields, unknown discriminators.
 */

import { describe, expect, it } from 'vitest';

import { encodePokerAction } from '@shared/p2p-wire/combat';
import { CHALLENGE_SIGNATURE_ALGORITHM } from '@shared/p2pAvailability';
import {
	CHESS_INTEGRITY_PROTOCOL_VERSION,
	CHESS_INTEGRITY_SCOPE,
} from '@shared/p2p-wire/integrity';

import { createSeededIdGen, createSeededRng } from '../utils/seededRng';
import { initializeGameSeeded } from '../utils/gameUtils';
import { parseWireMessage } from './messageSchemas';
import {
	GAME_STATE_WIRE_CODEC,
	decodeCompressedGameState,
	decodeWireGameState,
	encodeGameStateForWire,
} from './stateFrameCodec';

function buildInitialP2PState() {
	const seed = 'p2p-state-frame-codec-regression';
	return initializeGameSeeded({
		rng: createSeededRng(seed),
		playerIdGen: createSeededIdGen(seed, 'p1'),
		opponentIdGen: createSeededIdGen(seed, 'p2'),
	});
}

describe('parseWireMessage — non-message inputs', () => {
	it('rejects nullish payloads', () => {
		expect(parseWireMessage(null)).toBeNull();
		expect(parseWireMessage(undefined)).toBeNull();
	});

	it('rejects primitives', () => {
		expect(parseWireMessage(42)).toBeNull();
		expect(parseWireMessage('init')).toBeNull();
		expect(parseWireMessage(true)).toBeNull();
	});

	it('rejects arrays', () => {
		expect(parseWireMessage([])).toBeNull();
		expect(parseWireMessage([{ type: 'ping' }])).toBeNull();
	});

	it('rejects objects without a string `type` discriminator', () => {
		expect(parseWireMessage({})).toBeNull();
		expect(parseWireMessage({ type: 1 })).toBeNull();
		expect(parseWireMessage({ payload: 'ping' })).toBeNull();
	});

	it('rejects unknown discriminators', () => {
		expect(parseWireMessage({ type: 'malicious' })).toBeNull();
		expect(parseWireMessage({ type: 'CHESS_COMMAND' })).toBeNull(); // case-sensitive
	});
});

describe('parseWireMessage — game_command envelope (host-auth integrity)', () => {
	const validEnvelope = {
		type: 'game_command' as const,
		matchId: 'match-1234',
		seq: 7,
		commandId: 'cmd-abcdef-001',
		prevStateHash: '5:battle:player:30:30',
		command: { type: 'play_card', cardId: 'inst-42' },
	};

	it('accepts a well-formed play_card envelope', () => {
		const result = parseWireMessage(validEnvelope);
		expect(result).not.toBeNull();
		expect(result?.type).toBe('game_command');
	});

	it('accepts attack/end_turn/use_hero_power inner commands', () => {
		expect(parseWireMessage({ ...validEnvelope, command: { type: 'attack', attackerId: 'a1' } })).not.toBeNull();
		expect(parseWireMessage({ ...validEnvelope, command: { type: 'end_turn' } })).not.toBeNull();
		expect(parseWireMessage({ ...validEnvelope, command: { type: 'use_hero_power' } })).not.toBeNull();
	});

	it('rejects envelopes missing commandId — replay-protection field', () => {
		const { commandId: _, ...withoutCommandId } = validEnvelope;
		expect(parseWireMessage(withoutCommandId)).toBeNull();
	});

	it('rejects envelopes with empty-string commandId', () => {
		expect(parseWireMessage({ ...validEnvelope, commandId: '' })).toBeNull();
	});

	it('rejects envelopes missing prevStateHash — divergence detector', () => {
		const { prevStateHash: _, ...withoutPrev } = validEnvelope;
		expect(parseWireMessage(withoutPrev)).toBeNull();
	});

	it('rejects envelopes with non-string prevStateHash', () => {
		expect(parseWireMessage({ ...validEnvelope, prevStateHash: 0 })).toBeNull();
		expect(parseWireMessage({ ...validEnvelope, prevStateHash: null })).toBeNull();
	});

	it('rejects envelopes with negative or non-integer seq', () => {
		expect(parseWireMessage({ ...validEnvelope, seq: -1 })).toBeNull();
		expect(parseWireMessage({ ...validEnvelope, seq: 1.5 })).toBeNull();
		expect(parseWireMessage({ ...validEnvelope, seq: 'first' })).toBeNull();
	});

	it('rejects envelopes with empty matchId', () => {
		expect(parseWireMessage({ ...validEnvelope, matchId: '' })).toBeNull();
	});

	it('rejects play_card envelopes missing cardId', () => {
		expect(parseWireMessage({ ...validEnvelope, command: { type: 'play_card' } })).toBeNull();
	});

	it('rejects unknown inner command discriminators', () => {
		expect(parseWireMessage({ ...validEnvelope, command: { type: 'mulligan_swap', cardId: 'x' } })).toBeNull();
	});

	it('rejects play_card with extra fields (strict mode)', () => {
		expect(parseWireMessage({
			...validEnvelope,
			command: { type: 'play_card', cardId: 'x', injectedField: true },
		})).toBeNull();
	});

	it('rejects envelopes with extra top-level fields', () => {
		expect(parseWireMessage({ ...validEnvelope, smuggled: 'oops' })).toBeNull();
	});
});

describe('parseWireMessage — chess_command envelope (delegates to chess schema)', () => {
	const validChess = {
		type: 'chess_command' as const,
		matchId: 'match-chess-1',
		seq: 0,
		commandId: '11111111-2222-4333-8444-555555555555',
		prevChessStateHash: 'placeholder-chess',
		prevCardsStateHash: 'placeholder-cards',
		command: {
			type: 'chess_move' as const,
			pieceId: 'p-king-1',
			from: { row: 1, col: 0 },
			to: { row: 2, col: 0 },
		},
	};

	it('accepts a well-formed chess_move envelope', () => {
		expect(parseWireMessage(validChess)).not.toBeNull();
	});

	it('inherits chess refinement: from === to is rejected', () => {
		expect(parseWireMessage({
			...validChess,
			command: { ...validChess.command, to: validChess.command.from },
		})).toBeNull();
	});

	it('rejects non-uuid commandId (chess envelope is stricter)', () => {
		expect(parseWireMessage({ ...validChess, commandId: 'short' })).toBeNull();
	});
});

describe('parseWireMessage — handshake variants', () => {
	it('accepts seed_commit / seed_reveal with non-empty hashes', () => {
		expect(parseWireMessage({ type: 'seed_commit', commitment: 'abc123' })).not.toBeNull();
		expect(parseWireMessage({ type: 'seed_reveal', salt: 'salt-xyz' })).not.toBeNull();
		expect(parseWireMessage({ type: 'seed_reveal', salt: 'salt-xyz', hiveUsername: 'alice' })).not.toBeNull();
	});

	it('rejects seed_reveal with empty salt', () => {
		expect(parseWireMessage({ type: 'seed_reveal', salt: '' })).toBeNull();
	});

	it('accepts init with object gameState', () => {
		expect(parseWireMessage({ type: 'init', gameState: { turnNumber: 1 }, isHost: true })).not.toBeNull();
	});

	it('accepts compressed init and gameState payloads', () => {
		expect(parseWireMessage({
			type: 'init',
			stateCodec: GAME_STATE_WIRE_CODEC,
			compressedGameState: 'abc123_-',
			isHost: true,
		})).not.toBeNull();
		expect(parseWireMessage({
			type: 'gameState',
			stateCodec: GAME_STATE_WIRE_CODEC,
			compressedGameState: 'abc123_-',
		})).not.toBeNull();
	});

	it('round-trips a real initial P2P GameState through the compressed wire payload', () => {
		const gameState = buildInitialP2PState();
		const payload = encodeGameStateForWire(gameState);

		expect(payload.stateCodec).toBe(GAME_STATE_WIRE_CODEC);
		expect(payload.compressedGameState).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(parseWireMessage({ type: 'init', ...payload, isHost: true })).not.toBeNull();
		expect(parseWireMessage({ type: 'gameState', ...payload })).not.toBeNull();
		expect(decodeWireGameState(payload)).toEqual(gameState);
	});

	it('rejects init with non-object gameState (would crash flipGameState)', () => {
		expect(parseWireMessage({ type: 'init', gameState: 'not-an-object', isHost: true })).toBeNull();
		expect(parseWireMessage({ type: 'init', gameState: null, isHost: true })).toBeNull();
	});

	it('rejects compressed state with wrong codec or header-hostile data', () => {
		expect(parseWireMessage({
			type: 'init',
			stateCodec: 'json+gzip+base64url@0',
			compressedGameState: 'abc123',
			isHost: true,
		})).toBeNull();
		expect(parseWireMessage({
			type: 'gameState',
			stateCodec: GAME_STATE_WIRE_CODEC,
			compressedGameState: 'abc\nheader',
		})).toBeNull();
		expect(decodeCompressedGameState({
			stateCodec: GAME_STATE_WIRE_CODEC,
			compressedGameState: 'not-a-gzip-payload',
		})).toBeNull();
	});

	it('rejects init with non-boolean isHost', () => {
		expect(parseWireMessage({ type: 'init', gameState: {}, isHost: 'yes' })).toBeNull();
	});
});

describe('parseWireMessage — deck verification variants', () => {
	it('accepts source-aware deck claims', () => {
		const result = parseWireMessage({
			type: 'deck_verify',
			hiveAccount: 'alice',
			protocolVersion: 2,
			claims: [
				{ authority: 'starter-entitlement', cardId: 140 },
				{ authority: 'nft-custody', nftUid: 'nft-001', cardId: 20_001 },
			],
		});

		expect(result).not.toBeNull();
		expect(result?.type).toBe('deck_verify');
	});

	it('rejects v2 payloads without claims', () => {
		expect(parseWireMessage({
			type: 'deck_verify',
			hiveAccount: 'alice',
			protocolVersion: 2,
			claims: [],
		})).toBeNull();
	});

	it('rejects nftIds-only payloads', () => {
		expect(parseWireMessage({
			type: 'deck_verify',
			hiveAccount: 'alice',
			nftIds: ['nft-001'],
		})).toBeNull();
	});

	it('rejects deck_verify payloads with smuggled fields', () => {
		expect(parseWireMessage({
			type: 'deck_verify',
			hiveAccount: 'alice',
			protocolVersion: 2,
			claims: [{ authority: 'starter-entitlement', cardId: 140 }],
			nftIds: ['nft-001'],
		})).toBeNull();
	});

	it('rejects legacy deck_verify version fields on the P2P wire', () => {
		expect(parseWireMessage({
			type: 'deck_verify',
			hiveAccount: 'alice',
			protocolVersion: 2,
			version: 2,
			claims: [
				{ authority: 'starter-entitlement', cardId: 140 },
			],
		})).toBeNull();
	});

	it('rejects NFT claims with cardIdHint', () => {
		expect(parseWireMessage({
			type: 'deck_verify',
			hiveAccount: 'alice',
			protocolVersion: 2,
			claims: [
				{ authority: 'nft-custody', nftUid: 'nft-001', cardId: 20_001, cardIdHint: 20_001 },
			],
		})).toBeNull();
	});

	it('rejects NFT claims without cardId', () => {
		expect(parseWireMessage({
			type: 'deck_verify',
			hiveAccount: 'alice',
			protocolVersion: 2,
			claims: [
				{ authority: 'nft-custody', nftUid: 'nft-001' },
			],
		})).toBeNull();
	});
});

describe('parseWireMessage — integrity probes', () => {
	const root = 'a'.repeat(64);
	const intentHash = 'b'.repeat(64);
	const receipt = {
		type: 'transition_receipt_v1' as const,
		protocolVersion: CHESS_INTEGRITY_PROTOCOL_VERSION,
		scope: CHESS_INTEGRITY_SCOPE,
		matchId: 'match-integrity-1',
		seq: 0,
		commandId: '11111111-2222-4333-8444-555555555555',
		intentHash,
		status: 'applied' as const,
		prevRoot: root,
		nextRoot: root,
	};

	it('accepts a strict transition receipt and rejects hostile variants', () => {
		expect(parseWireMessage(receipt)).not.toBeNull();
		expect(parseWireMessage({ ...receipt, nextRoot: 'short' })).toBeNull();
		expect(parseWireMessage({ ...receipt, seq: -1 })).toBeNull();
		expect(parseWireMessage({ ...receipt, commandId: 'not-a-uuid' })).toBeNull();
		expect(parseWireMessage({ ...receipt, extra: true })).toBeNull();
	});

	it('accepts hash_check / hash_mismatch with non-empty hash + non-negative turn', () => {
		expect(parseWireMessage({ type: 'hash_check', stateHash: 'h', chessStateHash: 'c', chessMoveCount: 0, turnNumber: 0 })).not.toBeNull();
		expect(parseWireMessage({ type: 'hash_mismatch', turnNumber: 3, myHash: 'h' })).not.toBeNull();
	});

	it('rejects hash_check with empty stateHash', () => {
		expect(parseWireMessage({ type: 'hash_check', stateHash: '', chessStateHash: 'c', chessMoveCount: 0, turnNumber: 1 })).toBeNull();
	});

	it('accepts hash_check with empty chessStateHash (well-known race signal)', () => {
		// Per TD-27c-chess F3 policy: empty chessStateHash means the sender
		// has no chess phase active or hit a WASM-not-ready race; receiver
		// skips the chess check rather than rejecting the beacon.
		expect(parseWireMessage({ type: 'hash_check', stateHash: 'h', chessStateHash: '', chessMoveCount: -1, turnNumber: 1 })).not.toBeNull();
	});

	it('rejects hash_check missing chessStateHash field', () => {
		expect(parseWireMessage({ type: 'hash_check', stateHash: 'h', chessMoveCount: 0, turnNumber: 1 })).toBeNull();
	});

	it('rejects hash_check missing chessMoveCount field (TD-27c-chess F3 turn-gated compare)', () => {
		expect(parseWireMessage({ type: 'hash_check', stateHash: 'h', chessStateHash: 'c', turnNumber: 1 })).toBeNull();
	});

	it('accepts hash_check with chessMoveCount=-1 sentinel (no chess snapshot available)', () => {
		expect(parseWireMessage({ type: 'hash_check', stateHash: 'h', chessStateHash: '', chessMoveCount: -1, turnNumber: 0 })).not.toBeNull();
	});

	it('rejects hash_check with chessMoveCount < -1', () => {
		expect(parseWireMessage({ type: 'hash_check', stateHash: 'h', chessStateHash: 'c', chessMoveCount: -2, turnNumber: 0 })).toBeNull();
	});

	it('accepts version_check / wasm_hash_check with build hash', () => {
		expect(parseWireMessage({ type: 'version_check', buildHash: 'abc' })).not.toBeNull();
		expect(parseWireMessage({ type: 'wasm_hash_check', wasmHash: 'def' })).not.toBeNull();
	});
});

describe('parseWireMessage — poker action and clock variants', () => {
	const validPokerAction = {
		type: 'poker_action' as const,
		playerId: 'remote-piece',
		action: 'attack' as const,
		hpCommitment: 20,
		compact: encodePokerAction({ action: 'attack', hpCommitment: 20 }),
		turnId: 'combat-a:faith:remote-piece:0',
		decisionId: 'combat-a:faith:remote-piece:0:remote-piece:1',
		sentAtMs: 1_000,
	};

	it('accepts poker_action when legacy fields and compact tuple agree', () => {
		expect(parseWireMessage(validPokerAction)).not.toBeNull();
	});

	it('rejects poker_action without decisionId', () => {
		const { decisionId: _, ...withoutDecisionId } = validPokerAction;
		expect(parseWireMessage(withoutDecisionId)).toBeNull();
	});

	it('rejects poker_action with oversized legacy hpCommitment', () => {
		expect(parseWireMessage({
			...validPokerAction,
			hpCommitment: 501,
			compact: undefined,
		})).toBeNull();
	});

	it('rejects poker_action when compact tuple disagrees with legacy fields', () => {
		expect(parseWireMessage({
			...validPokerAction,
			action: 'brace',
		})).toBeNull();
	});

	it('accepts well-formed poker_turn_started for timed betting phases', () => {
		expect(parseWireMessage({
			type: 'poker_turn_started',
			combatId: 'combat-a',
			turnId: 'combat-a:faith:remote-piece:0',
			phase: 'faith',
			activePlayerId: 'remote-piece',
			actionsThisRound: 0,
			durationMs: 60_000,
			remainingMs: 52_000,
			sentAtMs: 1_000,
		})).not.toBeNull();
	});

	it('rejects poker_turn_started with zero, huge, or untimed duration/phase', () => {
		const validTurn = {
			type: 'poker_turn_started' as const,
			combatId: 'combat-a',
			turnId: 'combat-a:faith:remote-piece:0',
			phase: 'faith',
			activePlayerId: 'remote-piece',
			actionsThisRound: 0,
			durationMs: 60_000,
			remainingMs: 52_000,
			sentAtMs: 1_000,
		};

		expect(parseWireMessage({ ...validTurn, durationMs: 0 })).toBeNull();
		expect(parseWireMessage({ ...validTurn, durationMs: 600_000 })).toBeNull();
		expect(parseWireMessage({ ...validTurn, remainingMs: 600_000 })).toBeNull();
		expect(parseWireMessage({ ...validTurn, phase: 'spell_pet' })).toBeNull();
	});
});

describe('parseWireMessage — trivial variants', () => {
	it('accepts ping/pong/opponentDisconnected with no payload', () => {
		expect(parseWireMessage({ type: 'ping' })).not.toBeNull();
		expect(parseWireMessage({ type: 'pong' })).not.toBeNull();
		expect(parseWireMessage({ type: 'opponentDisconnected' })).not.toBeNull();
	});

	it('accepts heartbeat with non-negative integer t', () => {
		expect(parseWireMessage({ type: 'heartbeat', t: 0 })).not.toBeNull();
		expect(parseWireMessage({ type: 'heartbeat', t: 1_700_000_000_000 })).not.toBeNull();
	});

	it('rejects heartbeat without t', () => {
		expect(parseWireMessage({ type: 'heartbeat' })).toBeNull();
	});

	it('rejects ping with smuggled fields (strict mode)', () => {
		expect(parseWireMessage({ type: 'ping', smuggled: true })).toBeNull();
	});
});

describe('parseWireMessage — session_authorize challenge boundary', () => {
	const matchChallenge = {
		from: 'alice',
		to: 'bob',
		peerId: 'peer-1',
		timestamp: 1_000,
		expiresAt: 91_000,
		nonce: 'nonce_1234567890ab',
		sigAlg: CHALLENGE_SIGNATURE_ALGORITHM,
		serverSig: 'a'.repeat(64),
	};

	it('accepts a sanitized match challenge without relay ticket material', () => {
		expect(parseWireMessage({
			type: 'session_authorize',
			matchId: 'match-1',
			ephemeralPubkey: 'b'.repeat(64),
			hiveSig: 'c'.repeat(64),
			matchChallenge,
		})).not.toBeNull();
	});

	it('rejects relay match tickets inside session_authorize challenges', () => {
		expect(parseWireMessage({
			type: 'session_authorize',
			matchId: 'match-1',
			ephemeralPubkey: 'b'.repeat(64),
			hiveSig: 'c'.repeat(64),
			matchChallenge: {
				...matchChallenge,
				matchTicket: {
					token: `${'d'.repeat(24)}.${'e'.repeat(64)}`,
					roomId: 'room-1',
					peerId: 'peer-1',
					expiresAt: 100_000,
				},
			},
		})).toBeNull();
	});
});
