import type { BattleHistoryEntry, BattleHistoryState } from './types';

export type BattleMode = NonNullable<BattleHistoryEntry['mode']>;

export type BattleSessionIdentity = {
	sessionId: string;
	startedAt: number;
	mode: BattleMode;
};

type BattleSessionIdentityInput = {
	mode: BattleMode;
	startedAt: number;
	randomFraction: number;
};

const BATTLE_MODES: readonly BattleMode[] = ['pvp', 'pve', 'single', 'campaign'];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function normalizeBattleMode(mode: BattleHistoryEntry['mode']): BattleMode {
	return BATTLE_MODES.includes(mode as BattleMode) ? (mode as BattleMode) : 'pve';
}

export function createBattleSessionIdentity(input: BattleSessionIdentityInput): BattleSessionIdentity {
	if (!Number.isSafeInteger(input.startedAt) || input.startedAt < 0) {
		throw new Error('Battle session identity requires a non-negative integer timestamp.');
	}
	if (!Number.isFinite(input.randomFraction) || input.randomFraction < 0 || input.randomFraction >= 1) {
		throw new Error('Battle session identity requires randomFraction in [0, 1).');
	}

	const randomSuffix = input.randomFraction
		.toString(36)
		.slice(2, 8)
		.padEnd(6, '0')
		.slice(0, 6);

	return {
		sessionId: `battle_${input.startedAt}_${randomSuffix}_${input.mode}`,
		startedAt: input.startedAt,
		mode: input.mode,
	};
}

export function resolveBattleHistoryHydration(
	persistedState: unknown,
	currentState: BattleHistoryState,
): BattleHistoryState {
	if (!isRecord(persistedState) || !Array.isArray(persistedState.battles)) {
		return {
			battles: currentState.battles,
			currentBattleId: null,
		};
	}

	return {
		battles: persistedState.battles as BattleHistoryEntry[],
		currentBattleId: null,
	};
}
