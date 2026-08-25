import { create } from 'zustand';
import { useGameLogStore } from '../../stores/gameLogStore';
import {
	FEEDBACK_STACK_CAP,
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
	cinemaHolders: readonly string[];
	stack: readonly FeedbackChip[];
	pending: readonly FeedbackChip[];
	holdCinema: (holder: string) => void;
	releaseCinema: (holder: string) => void;
	enqueueStack: (chip: Omit<FeedbackChip, 'id' | 'holdMs'> & { holdMs?: number }) => string;
	dismiss: (id: string) => void;
	reset: () => void;
}

let chipSeq = 0;
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

function scheduleDismiss(id: string, holdMs: number, dismiss: (id: string) => void): void {
	const existing = dismissTimers.get(id);
	if (existing) existing.cancel();
	dismissTimers.set(id, gameEffectCoordinator.schedule({
		owner: 'feedback',
		lane: 'feedback',
		key: id,
		priority: 'normal',
		delayMs: holdMs,
		run: () => {
		dismissTimers.delete(id);
		dismiss(id);
		},
	}));
}

export const useCombatFeedbackStore = create<CombatFeedbackState>((set, get) => {
	const flushPending = () => {
		if (flushTimer) {
			flushTimer.cancel();
			flushTimer = null;
		}
		const state = get();
		if (isCinemaHeld(state.cinemaHolders) || state.pending.length === 0) return;
		const [next, ...rest] = state.pending;
		const visible = [...state.stack, next].slice(-FEEDBACK_STACK_CAP);
		set({ stack: visible, pending: rest });
		scheduleDismiss(next.id, next.holdMs, get().dismiss);
		if (rest.length > 0) {
			flushTimer = gameEffectCoordinator.schedule({
				owner: 'feedback',
				lane: 'feedback',
				key: 'flush',
				priority: 'normal',
				delayMs: FEEDBACK_STAGGER_MS,
				run: flushPending,
			});
		}
	};

	return {
		cinemaHolders: [],
		stack: [],
		pending: [],

		holdCinema: (holder) => {
			set((state) => (
				state.cinemaHolders.includes(holder)
					? state
					: { cinemaHolders: [...state.cinemaHolders, holder] }
			));
		},

		releaseCinema: (holder) => {
			set((state) => ({
				cinemaHolders: state.cinemaHolders.filter((id) => id !== holder),
			}));
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
			if (isCinemaHeld(state.cinemaHolders) || state.stack.length >= FEEDBACK_STACK_CAP) {
				set({ pending: [...state.pending, full] });
				return id;
			}
			set({ stack: [...state.stack, full] });
			scheduleDismiss(id, holdMs, get().dismiss);
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
				pending: state.pending.filter((chip) => chip.id !== id),
			}));
			flushPending();
		},

		reset: () => {
			dismissTimers.forEach((timer) => timer.cancel());
			dismissTimers.clear();
			cinemaHoldTimers.forEach((timer) => timer.cancel());
			cinemaHoldTimers.clear();
			if (flushTimer) {
				flushTimer.cancel();
				flushTimer = null;
			}
			set({ cinemaHolders: [], stack: [], pending: [] });
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
	cinemaHoldTimers.set(holder, gameEffectCoordinator.schedule({
		owner: 'feedback',
		lane: 'cinema-hold',
		key: holder,
		priority: 'critical',
		delayMs: Math.max(0, holdMs),
		run: () => {
			cinemaHoldTimers.delete(holder);
			useCombatFeedbackStore.getState().releaseCinema(holder);
		},
	}));
}
