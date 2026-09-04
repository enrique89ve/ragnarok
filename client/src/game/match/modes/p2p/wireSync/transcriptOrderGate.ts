/**
 * Serialises the cards command stream with its additive signed transcript.
 *
 * A peer sends a `game_command` before WebCrypto has finished signing the
 * corresponding `action_envelope`. Without a gate, the receiving peer can
 * apply the command, take the next turn, and mint its own transcript leaf
 * before the previous leaf arrives. The two transcripts then fork even though
 * both game states applied the same commands.
 *
 * This is deliberately a small functional closure rather than a class. The
 * hook owns the lifecycle; this module owns only the pending sequence and its
 * waiters, making the race policy directly testable without React or a socket.
 */

import { GAME_COMMAND_TYPES } from '../../../../core/commands';
import type { WireGameCommand } from '../../../../hooks/p2pEnvelope';

export const P2P_TRANSCRIPT_ORDER_WAIT_TIMEOUT_MS = 8_000;
export const MAX_PENDING_TRANSCRIPT_ACTIONS = 64;

/**
 * Cards commands that have a matching signed `action_envelope`. Mulligan
 * commands intentionally stay out: their canonical action is represented by
 * the deterministic cards command itself and no additive envelope is sent.
 */
export function requiresSignedActionEnvelope(commandType: WireGameCommand['type']): boolean {
	switch (commandType) {
		case GAME_COMMAND_TYPES.playCard:
		case GAME_COMMAND_TYPES.attack:
		case GAME_COMMAND_TYPES.endTurn:
		case GAME_COMMAND_TYPES.useHeroPower:
		case GAME_COMMAND_TYPES.grantPokerHandRewards:
		case GAME_COMMAND_TYPES.frontlineAttack:
		case GAME_COMMAND_TYPES.norseHeroPower:
		case GAME_COMMAND_TYPES.weaponUpgrade:
		case GAME_COMMAND_TYPES.selectDiscoveryOption:
			return true;
		case GAME_COMMAND_TYPES.toggleMulliganCard:
		case GAME_COMMAND_TYPES.confirmMulligan:
		case GAME_COMMAND_TYPES.skipMulligan:
			return false;
	}
}

export type TranscriptOrderBlockReason = 'timeout' | 'connection_lost' | 'session_reset';

export type TranscriptOrderWaitResult =
	| Readonly<{ status: 'ready' }>
	| Readonly<{ status: 'blocked'; reason: TranscriptOrderBlockReason }>;

type Waiter = {
	readonly resolve: (result: TranscriptOrderWaitResult) => void;
	readonly timeout: ReturnType<typeof setTimeout>;
};

export type TranscriptOrderGate = Readonly<{
	expect: (transcriptLengthAtApply: number) => boolean;
	waitUntilReady: (transcriptLength: number) => Promise<TranscriptOrderWaitResult>;
	settle: (receivedSeq: number, transcriptLength: number) => boolean;
	reset: (reason: Exclude<TranscriptOrderBlockReason, 'timeout'>) => void;
	pendingExpectedSeq: () => number | null;
}>;

const READY: TranscriptOrderWaitResult = Object.freeze({ status: 'ready' });

function blocked(reason: TranscriptOrderBlockReason): TranscriptOrderWaitResult {
	return Object.freeze({ status: 'blocked', reason });
}

function assertTranscriptLength(value: number, field: string): void {
	if (!Number.isInteger(value) || value < 0) {
		throw new RangeError(`[transcriptOrderGate] ${field} must be a non-negative integer`);
	}
}

/**
 * Create a single outstanding remote-action barrier.
 *
 * Turn-based cards P2P has at most one remote turn with pending signed
 * transcript leaves. A conflicting/stale expectation is therefore a protocol
 * fault; returning `false` lets the caller quarantine the match at that boundary.
 */
export function createTranscriptOrderGate(
	timeoutMs = P2P_TRANSCRIPT_ORDER_WAIT_TIMEOUT_MS,
): TranscriptOrderGate {
	if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
		throw new RangeError('[transcriptOrderGate] timeoutMs must be a positive integer');
	}

	let expectedSeq: number | null = null;
	let pendingCount = 0;
	let blockedReason: TranscriptOrderBlockReason | null = null;
	const waiters = new Set<Waiter>();

	const resolveWaiters = (result: TranscriptOrderWaitResult): void => {
		for (const waiter of waiters) {
			clearTimeout(waiter.timeout);
			waiter.resolve(result);
		}
		waiters.clear();
	};

	const clearBarrier = (): void => {
		expectedSeq = null;
		pendingCount = 0;
		blockedReason = null;
	};

	const failTimedOutBarrier = (): void => {
		if (expectedSeq === null) return;
		// Keep the sequence outstanding after timeout. If the transport is already
		// reconnecting, a later signed replay must still be able to settle this
		// exact leaf; clearing it here would let a new local command fork first.
		blockedReason = 'timeout';
		resolveWaiters(blocked('timeout'));
	};

	return {
		expect: (transcriptLengthAtApply: number): boolean => {
			assertTranscriptLength(transcriptLengthAtApply, 'transcriptLengthAtApply');
			if (blockedReason !== null) return false;
			if (expectedSeq === null) {
				expectedSeq = transcriptLengthAtApply;
				pendingCount = 1;
				return true;
			}
			// More than one remote command can be applied in one turn before
			// WebCrypto publishes the corresponding envelopes. The next command
			// therefore advances the pending sequence, even while the transcript
			// length still points at the first missing leaf.
			if (pendingCount >= MAX_PENDING_TRANSCRIPT_ACTIONS
				|| transcriptLengthAtApply > expectedSeq + pendingCount) return false;
			pendingCount += 1;
			return true;
		},
		waitUntilReady: (transcriptLength: number): Promise<TranscriptOrderWaitResult> => {
			assertTranscriptLength(transcriptLength, 'transcriptLength');
			if (blockedReason !== null) return Promise.resolve(blocked(blockedReason));
			if (expectedSeq === null || transcriptLength >= expectedSeq + pendingCount) {
				clearBarrier();
				resolveWaiters(READY);
				return Promise.resolve(READY);
			}

			return new Promise<TranscriptOrderWaitResult>((resolve) => {
				const timeout = setTimeout(failTimedOutBarrier, timeoutMs);
				waiters.add({ resolve, timeout });
			});
		},
		settle: (receivedSeq: number, transcriptLength: number): boolean => {
			assertTranscriptLength(receivedSeq, 'receivedSeq');
			assertTranscriptLength(transcriptLength, 'transcriptLength');
			if (expectedSeq === null || receivedSeq !== expectedSeq || transcriptLength <= expectedSeq) {
				return false;
			}
			pendingCount -= 1;
			if (pendingCount === 0) {
				clearBarrier();
				resolveWaiters(READY);
			} else {
				expectedSeq += 1;
			}
			return true;
		},
		reset: (reason): void => {
			clearBarrier();
			resolveWaiters(blocked(reason));
		},
		pendingExpectedSeq: (): number | null => expectedSeq,
	};
}
