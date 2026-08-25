import type { GameOverSubPhase } from '../flow/round/types';
import { deriveCampaignMatch } from '../match/derived';
import type { MatchContext } from '../match/types';
import type { GameState } from '../types';
import { getInitialGameOverSubPhase } from './gameCoordinatorRules';

export const GAME_END_DELAY_MS = 1500;

export type MatchEndCommitMode = 'phase-checkpoint' | 'local';
export type MatchEndFromPhase = 'chess' | 'poker_combat';

export interface MatchEndRequest {
	readonly ctx: MatchContext | null;
	readonly iWon: boolean;
	readonly isDraw: boolean;
	readonly turnCount: number;
	readonly finalGameState?: GameState;
	readonly fromPhase: MatchEndFromPhase;
	readonly commitMode: MatchEndCommitMode;
	readonly delayMs: number;
	readonly abandoned?: boolean;
}

export interface MatchEndCommit {
	readonly request: MatchEndRequest;
	readonly initialSub: GameOverSubPhase;
}

export interface MatchEndControllerDependencies {
	readonly commit: (input: MatchEndCommit) => void;
}

export interface MatchEndController {
	readonly requestGameEnd: (request: MatchEndRequest) => boolean;
	readonly forceCommit: (request: MatchEndRequest) => void;
	readonly hasProcessed: () => boolean;
	readonly cancelPending: () => void;
	readonly reset: () => void;
}

export interface ForceGameEndOptions {
	readonly iWon?: boolean;
	readonly delayMs?: number;
}

function assertValidDelayMs(value: unknown): asserts value is number {
	if (
		typeof value !== 'number'
		|| !Number.isFinite(value)
		|| value < 0
	) {
		throw new Error('delayMs must be a non-negative finite number');
	}
}

export function parseForceGameEndInput(input: unknown): ForceGameEndOptions {
	if (input === undefined) return {};
	if (!input || typeof input !== 'object' || Array.isArray(input)) {
		throw new Error('forceGameEnd input must be an object');
	}

	const allowedKeys = new Set(['iWon', 'delayMs']);
	for (const key of Object.keys(input)) {
		if (!allowedKeys.has(key)) throw new Error(`unsupported key: ${key}`);
	}

	const options = input as Record<string, unknown>;
	const parsed: { iWon?: boolean; delayMs?: number } = {};

	if ('iWon' in options) {
		if (typeof options.iWon !== 'boolean') {
			throw new Error('iWon must be a boolean');
		}
		parsed.iWon = options.iWon;
	}

	if ('delayMs' in options) {
		assertValidDelayMs(options.delayMs);
		parsed.delayMs = options.delayMs;
	}

	return parsed;
}

export function resolveMatchEndSubPhase(request: MatchEndRequest): GameOverSubPhase {
	if (request.isDraw || request.abandoned) return 'result';
	const campaign = request.ctx ? deriveCampaignMatch(request.ctx) : null;
	return getInitialGameOverSubPhase({
		iWon: request.iWon,
		campaignData: campaign
			? { mission: campaign.mission, chapter: campaign.chapter }
			: null,
	});
}

export function matchEndCommitPlan(request: MatchEndRequest): {
	readonly runLifecycle: boolean;
	readonly markDailyQuests: boolean;
	readonly usePhaseCheckpoint: boolean;
} {
	const usePhaseCheckpoint = request.commitMode === 'phase-checkpoint';
	return {
		runLifecycle: usePhaseCheckpoint && request.ctx !== null && !request.isDraw,
		markDailyQuests: usePhaseCheckpoint,
		usePhaseCheckpoint,
	};
}

export function createMatchEndController(
	deps: MatchEndControllerDependencies,
): MatchEndController {
	let processed = false;
	let pendingTimer: ReturnType<typeof setTimeout> | null = null;

	const cancelPending = (): void => {
		if (pendingTimer === null) return;
		clearTimeout(pendingTimer);
		pendingTimer = null;
	};

	const run = (request: MatchEndRequest): void => {
		pendingTimer = null;
		deps.commit({
			request,
			initialSub: resolveMatchEndSubPhase(request),
		});
	};

	return {
		requestGameEnd(request) {
			if (processed) return false;
			processed = true;
			if (request.delayMs <= 0) {
				run(request);
				return true;
			}
			pendingTimer = setTimeout(() => run(request), request.delayMs);
			return true;
		},
		forceCommit(request) {
			cancelPending();
			processed = true;
			run(request);
		},
		hasProcessed() {
			return processed;
		},
		cancelPending,
		reset() {
			cancelPending();
			processed = false;
		},
	};
}
