import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	occupyCinema,
	showStatus,
	useCombatFeedbackStore,
} from './combatFeedbackStore';

describe('combat feedback cinema occupancy', () => {
	afterEach(() => {
		useCombatFeedbackStore.getState().reset();
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
});
