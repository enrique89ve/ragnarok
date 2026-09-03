import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
	const mem = new Map<string, string>();
	(globalThis as { localStorage?: unknown }).localStorage = {
		getItem: (key: string) => mem.get(key) ?? null,
		setItem: (key: string, value: string) => {
			mem.set(key, value);
		},
		removeItem: (key: string) => {
			mem.delete(key);
		},
		clear: () => {
			mem.clear();
		},
		key: () => null,
		length: 0,
	};
});

import {
	appliedGameCommand,
	ignoredGameCommand,
	rejectedGameCommand,
} from '../../../../core/commands';
import { initializeGame } from '../../../../utils/gameUtils';
import {
	P2P_COMMAND_STATUS_REJECT_REASON,
	settleRemoteCommand,
} from './remoteCommandSettlement';
import { resolveP2PMatchPauseView } from '../../../../p2p/p2pMatchPauseView';

describe('useWireSync global dependency boundary', () => {
	it('does not reach the combat store through globalThis', () => {
		const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'useWireSync.ts');
		const source = readFileSync(sourcePath, 'utf8');

		expect(source).not.toContain('__ragnarokCombatStore');
		expect(source).not.toContain('globalThis.__ragnarokCombatStore');
	});

	it('serializes control-plane gameplay messages through the inbound wire queue', () => {
		const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'useWireSync.ts');
		const source = readFileSync(sourcePath, 'utf8');
		const controlStart = source.indexOf('const handleControlMessage');
		const controlEnd = source.indexOf('const handleMessageWrapper', controlStart);
		const controlHandler = source.slice(controlStart, controlEnd);

		expect(controlStart).toBeGreaterThanOrEqual(0);
		expect(controlEnd).toBeGreaterThan(controlStart);
		expect(controlHandler).toContain('handleMessage(message)');
		expect(controlHandler).toContain('handleMessage(data)');
		expect(controlHandler).not.toContain('processMessage(message)');
		expect(controlHandler).not.toContain('processMessage(data)');
	});

	it('freezes signed transcript envelopes with gameplay after integrity quarantine', () => {
		const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'useWireSync.ts');
		const source = readFileSync(sourcePath, 'utf8');
		const classificationStart = source.indexOf('function isGameplayWireMessage');
		const classificationEnd = source.indexOf('/**', classificationStart);
		const classification = source.slice(classificationStart, classificationEnd);

		expect(classificationStart).toBeGreaterThanOrEqual(0);
		expect(classification).toContain("data.type === 'game_command'");
		expect(classification).toContain("data.type === 'chess_command'");
		expect(classification).toContain("data.type === 'poker_action'");
		expect(classification).toContain("data.type === 'action_envelope'");
	});

	it('does not re-seed an already-resolved match on late handshake frames', () => {
		const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'useWireSync.ts');
		const source = readFileSync(sourcePath, 'utf8');
		const seedStart = source.indexOf("case 'seed_commit':");
		const seedEnd = source.indexOf("case 'cards_deck':", seedStart);
		const seedHandler = source.slice(seedStart, seedEnd);

		expect(seedStart).toBeGreaterThanOrEqual(0);
		expect(seedEnd).toBeGreaterThan(seedStart);
		expect(seedHandler).toContain("seedResolvedRef.current");
		expect(seedHandler).toContain('Dropped late seed_commit');
		expect(seedHandler).toContain('Dropped duplicate seed_reveal');
		expect(seedHandler).toContain('seed_commit_equivocation');
		expect(seedHandler).toContain('Duplicate seed_commit received');
		expect(seedHandler).toContain('theirCommitmentRef.current !== data.commitment');
	});

	it('retries an idempotent signed Poker gate after a short reconnect', () => {
		const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'useWireSync.ts');
		const source = readFileSync(sourcePath, 'utf8');

		expect(source).toContain('const pausePendingPokerActionGateTimeouts');
		expect(source).toContain('const retryPendingPokerActionGates');
		expect(source).toContain('controlMessage');
		expect(source).toContain('gameplayMessage');
		expect(source).toContain('retryPendingPokerActionGates();');
		expect(source).toContain('poker_action_gate_timeout');
	});

	it('retries unanswered chess receipts and cards applied gates after a short reconnect', () => {
		const wirePath = join(dirname(fileURLToPath(import.meta.url)), 'useWireSync.ts');
		const chessPath = join(dirname(fileURLToPath(import.meta.url)), '../../../../p2p/chessWireSender.ts');
		const wire = readFileSync(wirePath, 'utf8');
		const chess = readFileSync(chessPath, 'utf8');

		expect(wire).toContain('pausePendingChessReceiptTimeout');
		expect(wire).toContain('pausePendingCardsActionGateTimeouts');
		expect(wire).toContain('retryPendingCardsActionGates();');
		expect(wire).toContain('cards_action_applied_timeout');
		expect(wire).toContain('remote_chess_command_sequence_gap');
		expect(wire).toContain('cardsReceiptByCommandIdRef');
		expect(wire).toContain('PRE_BATTLE_CARDS_DELIVERY_ATTEMPTS = 3');
		expect(wire).toContain('send(pending.gameplayMessage)');
		expect(wire).toContain("p2p_pre_battle_action_retry");
		expect(wire).toContain("cards_action_applied_timeout");
		expect(chess).toContain('chess_transition_receipt_timeout');
		expect(chess).toContain('pausePendingChessReceiptTimeout');
	});

	it('starts competitive battle from an accepted piece move but not mine placement', () => {
		const wirePath = join(dirname(fileURLToPath(import.meta.url)), 'useWireSync.ts');
		const chessPath = join(dirname(fileURLToPath(import.meta.url)), '../../../../p2p/chessWireSender.ts');
		const wire = readFileSync(wirePath, 'utf8');
		const chess = readFileSync(chessPath, 'utf8');

		expect(wire).toContain("cmd.type !== 'chess_mine_placement'");
		expect(chess).toContain("envelope.command.type !== 'chess_mine_placement'");
		expect(wire).toContain('startP2PBattleFromAcceptedChessAction');
		expect(chess).toContain('startP2PBattleFromAcceptedChessAction');
	});

	it('reserves the blocking integrity overlay for an established battle', () => {
		const pauseViewPath = join(dirname(fileURLToPath(import.meta.url)), '../../../../p2p/p2pMatchPauseView.ts');
		const pauseView = readFileSync(pauseViewPath, 'utf8');

		expect(pauseView).toContain("if (input.competitionPhase !== 'battle') return null");
		expect(pauseView).toContain("P2P_SESSION_JSON_EXPORT_LABEL = 'Export diagnostics'");
		expect(resolveP2PMatchPauseView({
			competitionPhase: 'pre_battle',
			connectionState: 'connected',
			disconnectSide: null,
			integrityError: 'temporary setup failure',
			reconnectCountdown: 0,
			reconnectAttemptCount: 0,
		})).toBeNull();
	});
});

describe('settleRemoteCommand', () => {
	const baseState = initializeGame();

	it('runs only the applied settlement for an applied result', () => {
		const onApplied = vi.fn();
		const onUnapplied = vi.fn();

		settleRemoteCommand(appliedGameCommand(baseState, []), { onApplied, onUnapplied });

		expect(onApplied).toHaveBeenCalledTimes(1);
		expect(onUnapplied).not.toHaveBeenCalled();
	});

	it.each([
		['rejected', rejectedGameCommand(baseState, 'not player turn')],
		['ignored', ignoredGameCommand(baseState, 'card not found in hand')],
	] as const)('rejects an unapplied %s result without settling it', (_status, result) => {
		const onApplied = vi.fn();
		const onUnapplied = vi.fn();

		settleRemoteCommand(result, { onApplied, onUnapplied });

		expect(onApplied).not.toHaveBeenCalled();
		expect(onUnapplied).toHaveBeenCalledTimes(1);
		expect(onUnapplied).toHaveBeenCalledWith(P2P_COMMAND_STATUS_REJECT_REASON);
	});

	it('does not expose the engine rejection reason', () => {
		const onUnapplied = vi.fn();

		settleRemoteCommand(rejectedGameCommand(baseState, 'hero power already used'), {
			onApplied: vi.fn(),
			onUnapplied,
		});

		expect(onUnapplied).toHaveBeenCalledWith('p2p_command_status');
		expect(onUnapplied).not.toHaveBeenCalledWith('hero power already used');
	});
});
