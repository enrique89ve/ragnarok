import { create } from 'zustand';
import { useGameLogStore } from '../../stores/gameLogStore';
import {
	FEEDBACK_STACK_CAP,
	FEEDBACK_PENDING_CAP,
	FEEDBACK_STAGGER_MS,
	overlayHoldMs,
	type FeedbackLane,
	type FeedbackTone,
	type GameLogDraft,
} from './combatFeedback';
import {
	gameEffectCoordinator,
	type GameEffectHandle,
} from '@/game/effects/core/gameEffectCoordinator';

export type { FeedbackLane, FeedbackTone, GameLogDraft };

export interface FeedbackChip {
	readonly id: string;
	readonly lane: Exclude<FeedbackLane, 'floater' | 'cinema'>;
	readonly title: string;
	readonly subtitle?: string;
	readonly tone: FeedbackTone;
	readonly holdMs: number;
}

interface CombatFeedbackState {
	sessionId: string | null;
	cinemaHolders: readonly string[];
	stack: readonly FeedbackChip[];
	suspended: FeedbackChip | null;
	pending: readonly FeedbackChip[];
	beginSession: (sessionId: string) => () => void;
	endSession: (sessionId: string, generation: number) => void;
	holdCinema: (holder: string) => void;
	releaseCinema: (holder: string) => void;
	enqueueStack: (chip: Omit<FeedbackChip, 'id' | 'holdMs'> & { holdMs?: number }) => string;
	dismiss: (id: string) => void;
	reset: () => void;
}

let chipSeq = 0;
let sessionGeneration = 0;
const dismissTimers = new Map<string, GameEffectHandle>();
const cinemaHoldTimers = new Map<string, GameEffectHandle>();
let flushTimer: GameEffectHandle | null = null;

function nextChipId(): string {
	chipSeq += 1;
	return `feedback-${chipSeq}`;
}

function isCinemaHeld(holders: readonly string[]): boolean {
	return holders.length > 0;
}

function cancelFlushTimer(): void {
	if (!flushTimer) return;
	flushTimer.cancel();
	flushTimer = null;
}

function cancelDismissTimer(id: string): void {
	const existing = dismissTimers.get(id);
	if (!existing) return;
	existing.cancel();
	dismissTimers.delete(id);
}

function scheduleDismiss(
	id: string,
	holdMs: number,
	generation: number,
	dismiss: (id: string) => void,
): void {
	cancelDismissTimer(id);
	let handle: GameEffectHandle;
	handle = gameEffectCoordinator.schedule({
		owner: 'feedback',
		lane: 'feedback',
		key: id,
		priority: 'normal',
		delayMs: holdMs,
		run: () => {
			if (dismissTimers.get(id) !== handle) return;
			dismissTimers.delete(id);
			if (generation !== sessionGeneration) return;
			dismiss(id);
		},
	});
	dismissTimers.set(id, handle);
}

function sameChip(left: FeedbackChip, right: FeedbackChip): boolean {
	return left.title === right.title
		&& left.subtitle === right.subtitle
		&& left.tone === right.tone;
}

function enqueuePendingChip(pending: readonly FeedbackChip[], chip: FeedbackChip): readonly FeedbackChip[] {
	if (pending.some(existing => sameChip(existing, chip))) return pending;

	const next = [...pending, chip];
	if (next.length <= FEEDBACK_PENDING_CAP) return next;

	const removableIndex = next.findIndex(existing => existing.tone !== 'error');
	if (removableIndex >= 0) return next.filter((_, index) => index !== removableIndex);
	return next.slice(1);
}

export const useCombatFeedbackStore = create<CombatFeedbackState>((set, get) => {
	const clearTransientState = () => {
		sessionGeneration += 1;
		dismissTimers.forEach((timer) => timer.cancel());
		dismissTimers.clear();
		cinemaHoldTimers.forEach((timer) => timer.cancel());
		cinemaHoldTimers.clear();
		cancelFlushTimer();
		return sessionGeneration;
	};

	const flushPending = () => {
		const state = get();
		if (
			isCinemaHeld(state.cinemaHolders)
			|| state.stack.length >= FEEDBACK_STACK_CAP
			|| (!state.suspended && state.pending.length === 0)
		) return;
		const next = state.suspended ?? state.pending[0];
		const pending = state.suspended ? state.pending : state.pending.slice(1);
		set({ stack: [next], suspended: null, pending });
		scheduleDismiss(next.id, next.holdMs, sessionGeneration, get().dismiss);
	};

	const schedulePendingFlush = (delayMs = FEEDBACK_STAGGER_MS) => {
		cancelFlushTimer();
		const generation = sessionGeneration;
		flushTimer = gameEffectCoordinator.schedule({
			owner: 'feedback',
			lane: 'feedback',
			key: 'flush',
			priority: 'normal',
			delayMs,
			run: () => {
				if (generation !== sessionGeneration) return;
				flushTimer = null;
				flushPending();
			},
		});
	};

	return {
		sessionId: null,
		cinemaHolders: [],
		stack: [],
		suspended: null,
		pending: [],

		beginSession: (sessionId) => {
			const current = get();
			let generation: number;
			if (current.sessionId === sessionId) {
				generation = sessionGeneration;
			} else {
				generation = clearTransientState();
				set({ sessionId, cinemaHolders: [], stack: [], suspended: null, pending: [] });
			}
			return () => get().endSession(sessionId, generation);
		},

		endSession: (sessionId, generation) => {
			const current = get();
			if (current.sessionId !== sessionId || generation !== sessionGeneration) return;
			clearTransientState();
			set({ sessionId: null, cinemaHolders: [], stack: [], suspended: null, pending: [] });
		},

		holdCinema: (holder) => {
			const state = get();
			if (state.cinemaHolders.includes(holder)) return;
			if (state.cinemaHolders.length === 0 && state.stack.length > 0) {
				const [visible] = state.stack;
				cancelDismissTimer(visible.id);
				set({
					cinemaHolders: [...state.cinemaHolders, holder],
					stack: [],
					suspended: visible,
				});
				return;
			}
			set({ cinemaHolders: [...state.cinemaHolders, holder] });
		},

		releaseCinema: (holder) => {
			const state = get();
			if (!state.cinemaHolders.includes(holder)) return;
			const cinemaHolders = state.cinemaHolders.filter((id) => id !== holder);
			set({ cinemaHolders });
			flushPending();
		},

		enqueueStack: (chip) => {
			const id = nextChipId();
			const title = chip.title;
			const holdMs = chip.holdMs ?? overlayHoldMs([title, chip.subtitle].filter(Boolean).join(' '));
			const full: FeedbackChip = {
				id,
				lane: chip.lane,
				title,
				subtitle: chip.subtitle,
				tone: chip.tone,
				holdMs,
			};
			const state = get();
			const existing = [...state.stack, ...(state.suspended ? [state.suspended] : []), ...state.pending]
				.find(candidate => sameChip(candidate, full));
			if (existing) return existing.id;
			if (isCinemaHeld(state.cinemaHolders) || state.stack.length >= FEEDBACK_STACK_CAP || state.pending.length > 0) {
				set({ pending: enqueuePendingChip(state.pending, full) });
				return id;
			}
			set({ stack: [...state.stack, full] });
			scheduleDismiss(id, holdMs, sessionGeneration, get().dismiss);
			return id;
		},

		dismiss: (id) => {
			const timer = dismissTimers.get(id);
			if (timer) {
				timer.cancel();
				dismissTimers.delete(id);
			}
			set((state) => ({
				stack: state.stack.filter((chip) => chip.id !== id),
				suspended: state.suspended?.id === id ? null : state.suspended,
				pending: state.pending.filter((chip) => chip.id !== id),
			}));
			const state = get();
			if (!isCinemaHeld(state.cinemaHolders) && state.stack.length === 0 && (state.suspended || state.pending.length > 0)) {
				schedulePendingFlush();
			}
		},

		reset: () => {
			clearTransientState();
			set({ sessionId: null, cinemaHolders: [], stack: [], suspended: null, pending: [] });
		},
	};
});

export function recordCombatFeedback(input: {
	readonly log: GameLogDraft;
	readonly overlay?: {
		readonly lane: Exclude<FeedbackLane, 'floater' | 'cinema'>;
		readonly title: string;
		readonly subtitle?: string;
		readonly tone?: FeedbackTone;
	};
}): void {
	useGameLogStore.getState().addEntry(input.log);
	if (!input.overlay) return;
	useCombatFeedbackStore.getState().enqueueStack({
		lane: input.overlay.lane,
		title: input.overlay.title,
		subtitle: input.overlay.subtitle,
		tone: input.overlay.tone ?? 'info',
		holdMs: overlayHoldMs([input.overlay.title, input.overlay.subtitle].filter(Boolean).join(' ')),
	});
}

export function showStatus(
	text: string,
	type: FeedbackTone = 'info',
	duration?: number,
): void {
	useCombatFeedbackStore.getState().enqueueStack({
		lane: type === 'error' ? 'error' : 'stack',
		title: text,
		tone: type,
		holdMs: duration ?? overlayHoldMs(text),
	});
}

/** Cinema occupancy for GSAP slams so the stack waits on the same pixel. */
export function occupyCinema(holder: string, holdMs: number): void {
	const store = useCombatFeedbackStore.getState();
	store.holdCinema(holder);
	cinemaHoldTimers.get(holder)?.cancel();
	const generation = sessionGeneration;
	let handle: GameEffectHandle;
	handle = gameEffectCoordinator.schedule({
		owner: 'feedback',
		lane: 'cinema-hold',
		key: holder,
		priority: 'critical',
		delayMs: Math.max(0, holdMs),
		run: () => {
			if (cinemaHoldTimers.get(holder) !== handle) return;
			cinemaHoldTimers.delete(holder);
			if (generation !== sessionGeneration) return;
			useCombatFeedbackStore.getState().releaseCinema(holder);
		},
	});
	cinemaHoldTimers.set(holder, handle);
}
