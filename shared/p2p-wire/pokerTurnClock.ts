/**
 * Shared poker turn clock helpers.
 *
 * The browser interval is only a renderer. The protocol contract is a turn
 * window: `(turnId, startedAtMs, deadlineAtMs, durationMs)`. P2P peers can
 * announce the window over the wire, and each client derives its countdown from
 * the deadline instead of decrementing a mutable counter once per second.
 */

export const DEFAULT_POKER_TURN_DURATION_MS = 60_000;
export const POKER_TURN_TIMER_TICK_MS = 1_000;

const TIMED_POKER_PHASES = new Set(['pre_flop', 'faith', 'foresight', 'destiny']);

export type PokerTurnClock = Readonly<{
	turnId: string;
	startedAtMs: number;
	deadlineAtMs: number;
	durationMs: number;
}>;

export type PokerTurnIdentityInput = Readonly<{
	combatId: string;
	phase: string;
	activePlayerId: string | null;
	actionsThisRound: number;
}>;

export function isTimedPokerDecisionPhase(phase: string): boolean {
	return TIMED_POKER_PHASES.has(phase);
}

export function buildPokerTurnId(input: PokerTurnIdentityInput): string {
	const activePlayer = input.activePlayerId ?? 'none';
	return `${input.combatId}:${input.phase}:${activePlayer}:${input.actionsThisRound}`;
}

export function createPokerTurnClock(input: PokerTurnIdentityInput & {
	readonly nowMs: number;
	readonly durationMs?: number;
}): PokerTurnClock | null {
	if (!input.activePlayerId || !isTimedPokerDecisionPhase(input.phase)) return null;
	const durationMs = normalizeDurationMs(input.durationMs);
	const startedAtMs = normalizeTimestampMs(input.nowMs);
	return {
		turnId: buildPokerTurnId(input),
		startedAtMs,
		deadlineAtMs: startedAtMs + durationMs,
		durationMs,
	};
}

export function createReceivedPokerTurnClock(input: PokerTurnIdentityInput & {
	readonly receivedAtMs: number;
	readonly sentAtMs?: number;
	readonly remainingMs?: number;
	readonly durationMs?: number;
}): PokerTurnClock | null {
	if (!input.activePlayerId || !isTimedPokerDecisionPhase(input.phase)) return null;
	const durationMs = normalizeDurationMs(input.durationMs);
	const receivedAtMs = normalizeTimestampMs(input.receivedAtMs);
	if (input.remainingMs !== undefined) {
		const remainingMs = normalizeRemainingMs(input.remainingMs, durationMs);
		const deadlineAtMs = receivedAtMs + remainingMs;
		return {
			turnId: buildPokerTurnId(input),
			startedAtMs: deadlineAtMs - durationMs,
			deadlineAtMs,
			durationMs,
		};
	}
	const sentAtMs = input.sentAtMs === undefined
		? receivedAtMs
		: normalizeTimestampMs(input.sentAtMs);
	const elapsedMs = Math.min(durationMs, Math.max(0, receivedAtMs - sentAtMs));
	const startedAtMs = receivedAtMs - elapsedMs;
	return {
		turnId: buildPokerTurnId(input),
		startedAtMs,
		deadlineAtMs: startedAtMs + durationMs,
		durationMs,
	};
}

export function getPokerTurnRemainingMs(input: {
	readonly nowMs: number;
	readonly deadlineAtMs: number;
}): number {
	return Math.max(0, normalizeTimestampMs(input.deadlineAtMs) - normalizeTimestampMs(input.nowMs));
}

export function getPokerTurnRemainingSeconds(input: {
	readonly nowMs: number;
	readonly deadlineAtMs: number;
}): number {
	const remainingMs = getPokerTurnRemainingMs(input);
	return Math.ceil(remainingMs / 1_000);
}

function normalizeDurationMs(value: number | undefined): number {
	if (value === undefined) return DEFAULT_POKER_TURN_DURATION_MS;
	if (!Number.isFinite(value) || value <= 0) return DEFAULT_POKER_TURN_DURATION_MS;
	return Math.floor(value);
}

function normalizeTimestampMs(value: number): number {
	if (!Number.isFinite(value) || value < 0) return 0;
	return Math.floor(value);
}

function normalizeRemainingMs(value: number, durationMs: number): number {
	if (!Number.isFinite(value) || value < 0) return 0;
	return Math.min(durationMs, Math.floor(value));
}
