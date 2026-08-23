export type GameEffectPriority = 'low' | 'normal' | 'high' | 'critical';

export interface GameEffectHandle {
	cancel(): void;
	onComplete?: Promise<void>;
}

export interface GameEffectSchedule {
	readonly owner: string;
	readonly lane: string;
	readonly key?: string;
	readonly priority: GameEffectPriority;
	readonly delayMs: number;
	readonly run: () => void;
	readonly onError?: (error: unknown) => void;
}

export interface GameEffectSequence {
	readonly owner: string;
	readonly lane: string;
	readonly key?: string;
	readonly priority: GameEffectPriority;
	readonly delaysMs: readonly number[];
	readonly run: (stepIndex: number) => void;
	readonly onError?: (error: unknown) => void;
}

export interface GameEffectCoordinatorOptions {
	readonly maxActiveEffects?: number;
	readonly maxDelayMs?: number;
	readonly maxSequenceSteps?: number;
}

const DEFAULT_OPTIONS: Required<GameEffectCoordinatorOptions> = {
	maxActiveEffects: 64,
	maxDelayMs: 5_000,
	maxSequenceSteps: 24,
};

const PRIORITY_WEIGHT: Record<GameEffectPriority, number> = {
	low: 0,
	normal: 1,
	high: 2,
	critical: 3,
};

interface ActiveEntry {
	readonly scheduleKey: string;
	readonly priority: GameEffectPriority;
	readonly timers: ReturnType<typeof setTimeout>[];
	cancelled: boolean;
	settled: boolean;
	resolveComplete: () => void;
}

function boundedDelay(delayMs: number, maxDelayMs: number): number {
	return Math.min(maxDelayMs, Math.max(0, delayMs));
}

function completeHandle(): GameEffectHandle {
	return {
		cancel() {},
		onComplete: Promise.resolve(),
	};
}

/**
 * Single client-side timing runtime for game effects. It owns scheduling only;
 * it does not know about React, DOM nodes, game state, or a particular art.
 */
export function createGameEffectCoordinator(
	options: GameEffectCoordinatorOptions = {},
): GameEffectCoordinator {
	const config = { ...DEFAULT_OPTIONS, ...options };
	const active = new Map<string, ActiveEntry>();
	let reducedMotion = false;

	const cancelEntry = (entry: ActiveEntry): void => {
		if (entry.cancelled) return;
		const mutableEntry = entry;
		mutableEntry.cancelled = true;
		for (const timer of entry.timers) clearTimeout(timer);
		settleEntry(entry);
	};

	const settleEntry = (entry: ActiveEntry): void => {
		if (entry.settled) return;
		const mutableEntry = entry;
		mutableEntry.settled = true;
		if (active.get(entry.scheduleKey) === entry) active.delete(entry.scheduleKey);
		entry.resolveComplete();
	};

	const canSchedule = (priority: GameEffectPriority): boolean => {
		if (active.size < config.maxActiveEffects) return true;
		return PRIORITY_WEIGHT[priority] >= PRIORITY_WEIGHT.high;
	};

	const scheduleSequence = (sequence: GameEffectSequence): GameEffectHandle => {
		const scheduleKey = `${sequence.owner}:${sequence.lane}:${sequence.key ?? 'default'}`;
		const existing = active.get(scheduleKey);
		if (existing) cancelEntry(existing);
		if (!canSchedule(sequence.priority)) return completeHandle();

		const timers: ReturnType<typeof setTimeout>[] = [];
		let resolveComplete!: () => void;
		const onComplete = new Promise<void>(resolve => {
			resolveComplete = resolve;
		});
		const entry: ActiveEntry = {
			scheduleKey,
			priority: sequence.priority,
			timers,
			cancelled: false,
			settled: false,
			resolveComplete,
		};
		active.set(scheduleKey, entry);

		const delays = sequence.delaysMs.slice(0, config.maxSequenceSteps);
		if (delays.length === 0) {
			settleEntry(entry);
			return { cancel: () => cancelEntry(entry), onComplete };
		}

		for (let index = 0; index < delays.length; index += 1) {
			const delay = reducedMotion ? 0 : boundedDelay(delays[index], config.maxDelayMs);
			timers.push(setTimeout(() => {
				if (entry.cancelled) return;
				try {
					sequence.run(index);
				} catch (error) {
					sequence.onError?.(error);
				}
				if (index === delays.length - 1) settleEntry(entry);
			}, delay));
		}

		return { cancel: () => cancelEntry(entry), onComplete };
	};

	const schedule = (task: GameEffectSchedule): GameEffectHandle =>
		scheduleSequence({
			owner: task.owner,
			lane: task.lane,
			key: task.key,
			priority: task.priority,
			delaysMs: [task.delayMs],
			run: task.run,
			onError: task.onError,
		});

	return {
		schedule,
		scheduleSequence,
		cancelOwner(owner) {
			for (const entry of [...active.values()]) {
				if (entry.scheduleKey.startsWith(`${owner}:`)) cancelEntry(entry);
			}
		},
		cancelLane(lane) {
			for (const entry of [...active.values()]) {
				if (entry.scheduleKey.includes(`:${lane}:`)) cancelEntry(entry);
			}
		},
		cancelOwnerLane(owner, lane) {
			for (const entry of [...active.values()]) {
				if (entry.scheduleKey.startsWith(`${owner}:${lane}:`)) cancelEntry(entry);
			}
		},
		cancelAll() {
			for (const entry of [...active.values()]) cancelEntry(entry);
		},
		setReducedMotion(enabled) {
			reducedMotion = enabled;
		},
		getActiveCount() {
			return active.size;
		},
	};
}

export interface GameEffectCoordinator {
	schedule(task: GameEffectSchedule): GameEffectHandle;
	scheduleSequence(sequence: GameEffectSequence): GameEffectHandle;
	cancelOwner(owner: string): void;
	cancelLane(lane: string): void;
	cancelOwnerLane(owner: string, lane: string): void;
	cancelAll(): void;
	setReducedMotion(enabled: boolean): void;
	getActiveCount(): number;
}

export const gameEffectCoordinator = createGameEffectCoordinator();
