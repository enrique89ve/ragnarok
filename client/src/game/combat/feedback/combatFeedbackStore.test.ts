import { afterEach, describe, expect, it, vi } from 'vitest';
import { FEEDBACK_PENDING_CAP, FEEDBACK_STAGGER_MS } from './combatFeedback';
import {
	occupyCinema,
	recordCombatFeedback,
	showStatus,
	useCombatFeedbackStore,
} from './combatFeedbackStore';
import { useGameLogStore } from '../../stores/gameLogStore';

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

		const errorId = showStatus('Connection lost', 'error', 1600);
		const pendingAfterError = useCombatFeedbackStore.getState().pending;
		expect(pendingAfterError).toHaveLength(FEEDBACK_PENDING_CAP);
		expect(pendingAfterError.at(-1)?.title).toBe('Connection lost');
		expect(showStatus('Connection lost', 'error', 1600)).toBe(errorId);
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
});
