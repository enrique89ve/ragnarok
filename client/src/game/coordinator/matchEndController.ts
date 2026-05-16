import type { GameOverSubPhase } from '../flow/round/types';
import type { MatchEndContext } from '../match/onWinDispatch';
import type { MatchContext } from '../match/types';
import {
	getInitialGameOverSubPhase,
	type CampaignData,
} from './gameCoordinatorRules';

export interface MatchEndControllerDependencies {
	readonly dispatchGameEnded: (initialSub: GameOverSubPhase) => void;
	readonly runWinLifecycle: (ctx: MatchContext, end: MatchEndContext) => void;
}

export interface MatchEndRequest {
	readonly ctx: MatchContext;
	readonly iWon: boolean;
	readonly turnCount: number;
	readonly isCampaign: boolean;
	readonly campaignData: CampaignData;
	readonly delayMs: number;
}

export interface MatchEndController {
	readonly requestGameEnd: (request: MatchEndRequest) => boolean;
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
		const initialSub = getInitialGameOverSubPhase({
			iWon: request.iWon,
			isCampaign: request.isCampaign,
			campaignData: request.campaignData,
		});
		deps.runWinLifecycle(request.ctx, {
			iWon: request.iWon,
			turnCount: request.turnCount,
		});
		deps.dispatchGameEnded(initialSub);
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
