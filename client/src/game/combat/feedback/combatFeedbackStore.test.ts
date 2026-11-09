import { afterEach, describe, expect, it, vi } from 'vitest';
import { FEEDBACK_PENDING_CAP, FEEDBACK_STAGGER_MS } from './combatFeedback';
import {
	occupyCinema,
	recordCombatFeedback,
	showStatus,
	useCombatFeedbackStore,
} from './combatFeedbackStore';
import { useGameLogStore } from '../../stores/gameLogStore';

function enqueueNotice(title: string, tone: 'info' | 'warning' | 'error' = 'info', holdMs = 1_600): string {
	return useCombatFeedbackStore.getState().enqueueStack({
		lane: tone === 'error' ? 'error' : 'stack',
		title,
		tone,
		holdMs,
	});
}

describe('combat feedback cinema occupancy', () => {
	afterEach(() => {
		useCombatFeedbackStore.getState().reset();
		useGameLogStore.getState().clearLog();
		vi.useRealTimers();
	});

	it('keeps the stack waiting while cinema is occupied', () => {
		vi.useFakeTimers();
		occupyCinema('poker-cinema', 400);
		showStatus('Fate Peek', 'info', 1600);
		expect(useCombatFeedbackStore.getState().stack).toEqual([]);
		expect(useCombatFeedbackStore.getState().pending).toHaveLength(1);

		vi.advanceTimersByTime(400);
		expect(useCombatFeedbackStore.getState().cinemaHolders).toEqual([]);
		expect(useCombatFeedbackStore.getState().stack).toHaveLength(1);
		expect(useCombatFeedbackStore.getState().stack[0]?.title).toBe('Fate Peek');
	});

	it('routes blocked-attack copy to the stack, not cinema', () => {
		showStatus('Blocked by Taunt: must hit the frontline', 'warning', 1500);
		expect(useCombatFeedbackStore.getState().stack[0]?.lane).toBe('stack');
		expect(useCombatFeedbackStore.getState().cinemaHolders).toEqual([]);
	});

	it('shows only one readable chip and waits between queued messages', () => {
		vi.useFakeTimers();
		showStatus('First message', 'info', 1600);
		showStatus('Second message', 'info', 1600);
		showStatus('Third message', 'info', 1600);

		expect(useCombatFeedbackStore.getState().stack.map(chip => chip.title)).toEqual(['First message']);
		expect(useCombatFeedbackStore.getState().pending.map(chip => chip.title)).toEqual([
			'Second message',
			'Third message',
		]);

		vi.advanceTimersByTime(1600);
		expect(useCombatFeedbackStore.getState().stack).toEqual([]);
		expect(useCombatFeedbackStore.getState().pending).toHaveLength(2);

		vi.advanceTimersByTime(FEEDBACK_STAGGER_MS - 1);
		expect(useCombatFeedbackStore.getState().stack).toEqual([]);
		vi.advanceTimersByTime(1);
		expect(useCombatFeedbackStore.getState().stack.map(chip => chip.title)).toEqual(['Second message']);
		expect(useCombatFeedbackStore.getState().pending.map(chip => chip.title)).toEqual(['Third message']);
	});

	it('caps stale feedback while preserving a newer error and deduplicating repeats', () => {
		vi.useFakeTimers();
		showStatus('Visible', 'info', 1600);
		for (let index = 1; index <= FEEDBACK_PENDING_CAP + 1; index += 1) {
			showStatus(`Notice ${index}`, 'info', 1600);
		}

		const pendingBeforeError = useCombatFeedbackStore.getState().pending;
		expect(pendingBeforeError).toHaveLength(FEEDBACK_PENDING_CAP);
		expect(pendingBeforeError.map(chip => chip.title)).not.toContain('Notice 1');

		const errorId = enqueueNotice('Connection lost', 'error', 1600);
		const pendingAfterError = useCombatFeedbackStore.getState().pending;
		expect(pendingAfterError).toHaveLength(FEEDBACK_PENDING_CAP);
		expect(pendingAfterError.at(-1)?.title).toBe('Connection lost');
		expect(enqueueNotice('Connection lost', 'error', 1600)).toBe(errorId);
	});

	it('keeps every feedback event in the battle log with or without a toast', () => {
		recordCombatFeedback({
			log: {
				turn: 2,
				actor: 'opponent',
				type: 'damage',
				message: 'Opponent dealt 20 damage to your hero',
			},
		});
		recordCombatFeedback({
			log: {
				turn: 2,
				actor: 'player',
				type: 'spell',
				message: 'Player cast Fate Peek',
			},
			overlay: {
				lane: 'stack',
				title: 'Player cast Fate Peek',
				tone: 'info',
			},
		});

		expect(useGameLogStore.getState().entries.map(entry => entry.message)).toEqual([
			'Opponent dealt 20 damage to your hero',
			'Player cast Fate Peek',
		]);
		expect(useCombatFeedbackStore.getState().stack).toHaveLength(1);
	});

	it('clears cinema and pending feedback on reset without resurrecting a chip', () => {
		vi.useFakeTimers();
		occupyCinema('opening-cinema', 1_000);
		showStatus('Queued during cinema', 'info', 1_600);
		useCombatFeedbackStore.getState().reset();

		vi.advanceTimersByTime(2_000);
		expect(useCombatFeedbackStore.getState().cinemaHolders).toEqual([]);
		expect(useCombatFeedbackStore.getState().stack).toEqual([]);
		expect(useCombatFeedbackStore.getState().pending).toEqual([]);

		showStatus('After reset', 'info', 1_600);
		expect(useCombatFeedbackStore.getState().stack[0]?.title).toBe('After reset');
	});

	it('cancels a scheduled queue flush on reset and accepts new feedback', () => {
		vi.useFakeTimers();
		showStatus('Visible', 'info', 100);
		showStatus('Pending', 'info', 1_600);
		vi.advanceTimersByTime(100);
		useCombatFeedbackStore.getState().reset();

		vi.advanceTimersByTime(FEEDBACK_STAGGER_MS + 1_000);
		expect(useCombatFeedbackStore.getState().stack).toEqual([]);
		expect(useCombatFeedbackStore.getState().pending).toEqual([]);

		showStatus('Fresh feedback', 'info', 1_600);
		expect(useCombatFeedbackStore.getState().stack[0]?.title).toBe('Fresh feedback');
	});

	it('scopes feedback and timer callbacks to the current combat session', () => {
		vi.useFakeTimers();
		const endOldSession = useCombatFeedbackStore.getState().beginSession('combat-old');
		showStatus('Old visible notice', 'info', 100);
		occupyCinema('old-cinema', 1_000);
		showStatus('Old pending notice', 'info', 1_600);

		const endNewSession = useCombatFeedbackStore.getState().beginSession('combat-new');
		showStatus('New combat notice', 'info', 1_600);
		endOldSession();
		vi.advanceTimersByTime(1_000);

		expect(useCombatFeedbackStore.getState().sessionId).toBe('combat-new');
		expect(useCombatFeedbackStore.getState().stack.map(chip => chip.title)).toEqual(['New combat notice']);
		expect(useCombatFeedbackStore.getState().pending).toEqual([]);
		endNewSession();
		expect(useCombatFeedbackStore.getState().sessionId).toBeNull();
	});

	it('ignores an obsolete teardown after the same combat id is mounted again', () => {
		const endFirstMount = useCombatFeedbackStore.getState().beginSession('same-combat');
		endFirstMount();
		useCombatFeedbackStore.getState().beginSession('same-combat');
		showStatus('Fresh same-id notice', 'info', 1_600);

		endFirstMount();

		expect(useCombatFeedbackStore.getState().sessionId).toBe('same-combat');
		expect(useCombatFeedbackStore.getState().stack.map(chip => chip.title)).toEqual(['Fresh same-id notice']);
	});

	it('suspends a visible chip during overlapping cinema and resumes its full dwell once', () => {
		vi.useFakeTimers();
		useCombatFeedbackStore.getState().beginSession('combat-1');
		const firstId = enqueueNotice('Visible notice', 'info', 100);
		vi.advanceTimersByTime(40);

		occupyCinema('phase', 120);
		occupyCinema('announcement', 200);
		const repeatedId = enqueueNotice('Visible notice', 'info', 100);
		showStatus('Next notice', 'warning', 100);
		expect(repeatedId).toBe(firstId);
		expect(useCombatFeedbackStore.getState().stack).toEqual([]);
		expect(useCombatFeedbackStore.getState().suspended?.title).toBe('Visible notice');
		expect(useCombatFeedbackStore.getState().pending.map(chip => chip.title)).toEqual(['Next notice']);

		vi.advanceTimersByTime(200);
		expect(useCombatFeedbackStore.getState().cinemaHolders).toEqual([]);
		expect(useCombatFeedbackStore.getState().stack.map(chip => chip.title)).toEqual(['Visible notice']);
		vi.advanceTimersByTime(99);
		expect(useCombatFeedbackStore.getState().stack).toHaveLength(1);
		vi.advanceTimersByTime(1);
		expect(useCombatFeedbackStore.getState().stack).toEqual([]);
	});

	it('resumes the suspended chip ahead of pending feedback without reordering or duplication', () => {
		vi.useFakeTimers();
		showStatus('A', 'info', 100);
		showStatus('B', 'info', 100);
		showStatus('C', 'info', 100);
		occupyCinema('phase', 50);

		const duringCinema = useCombatFeedbackStore.getState();
		expect(duringCinema.stack).toEqual([]);
		expect(duringCinema.suspended?.title).toBe('A');
		expect(duringCinema.pending.map(chip => chip.title)).toEqual(['B', 'C']);
		vi.advanceTimersByTime(50);
		expect(useCombatFeedbackStore.getState().stack.map(chip => chip.title)).toEqual(['A']);

		vi.advanceTimersByTime(100);
		expect(useCombatFeedbackStore.getState().pending.map(chip => chip.title)).toEqual(['B', 'C']);
		vi.advanceTimersByTime(FEEDBACK_STAGGER_MS);
		expect(useCombatFeedbackStore.getState().stack.map(chip => chip.title)).toEqual(['B']);
		vi.advanceTimersByTime(100 + FEEDBACK_STAGGER_MS);
		expect(useCombatFeedbackStore.getState().stack.map(chip => chip.title)).toEqual(['C']);
	});

	it('keeps the pending cap while a visible chip is suspended by cinema', () => {
		vi.useFakeTimers();
		showStatus('Visible', 'info', 1_600);
		for (let index = 1; index <= FEEDBACK_PENDING_CAP + 1; index += 1) {
			showStatus(`Pending ${index}`, 'info', 1_600);
		}
		occupyCinema('phase', 500);

		const state = useCombatFeedbackStore.getState();
		expect(state.suspended?.title).toBe('Visible');
		expect(state.pending).toHaveLength(FEEDBACK_PENDING_CAP);
		expect(state.pending.map(chip => chip.title)).not.toContain('Pending 1');
		expect(state.pending.map(chip => chip.title)).toContain('Pending 5');
	});

	it('keeps a repeated cinema holder until its newest hold timer completes', () => {
		vi.useFakeTimers();
		occupyCinema('same-holder', 100);
		occupyCinema('same-holder', 400);
		vi.advanceTimersByTime(100);
		expect(useCombatFeedbackStore.getState().cinemaHolders).toEqual(['same-holder']);
		vi.advanceTimersByTime(300);
		expect(useCombatFeedbackStore.getState().cinemaHolders).toEqual([]);
	});
});
