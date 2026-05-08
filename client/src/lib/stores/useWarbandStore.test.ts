import { describe, it, expect, beforeEach } from 'vitest';
import { act } from 'react';
import {
	useWarbandStore,
	selectIsReady,
	selectArmy,
	selectDeckCardIds,
} from './useWarbandStore';
import type { ArmySelection } from '../../game/types/ChessTypes';

function makeHero(id: string, heroClass: string = 'warrior'): any {
	return {
		id,
		name: `Hero ${id}`,
		heroClass,
		description: '',
	};
}

function makeArmy(): ArmySelection {
	return {
		king: makeHero('king-1'),
		queen: makeHero('queen-1'),
		rook: makeHero('rook-1'),
		bishop: makeHero('bishop-1'),
		knight: makeHero('knight-1'),
	};
}

describe('useWarbandStore', () => {
	beforeEach(() => {
		act(() => {
			useWarbandStore.getState().clearWarband();
		});
	});

	it('starts in empty state', () => {
		const { warband } = useWarbandStore.getState();
		expect(warband.status).toBe('empty');
	});

	it('transitions to ready after setWarband with valid input', () => {
		const army = makeArmy();
		const deck = [1, 2, 3, 4, 5];

		act(() => {
			useWarbandStore.getState().setWarband(army, deck);
		});

		const { warband } = useWarbandStore.getState();
		expect(warband.status).toBe('ready');
		if (warband.status === 'ready') {
			expect(warband.army.king.id).toBe('king-1');
			expect(warband.deckCardIds).toEqual([1, 2, 3, 4, 5]);
		}
	});

	it('clearWarband returns to empty', () => {
		act(() => {
			useWarbandStore.getState().setWarband(makeArmy(), [1, 2, 3]);
		});
		expect(useWarbandStore.getState().warband.status).toBe('ready');

		act(() => {
			useWarbandStore.getState().clearWarband();
		});
		expect(useWarbandStore.getState().warband.status).toBe('empty');
	});

	it('throws if a piece slot is missing', () => {
		const broken = { ...makeArmy(), queen: undefined } as unknown as ArmySelection;
		expect(() => useWarbandStore.getState().setWarband(broken, [])).toThrow(
			/army\.queen/
		);
		expect(useWarbandStore.getState().warband.status).toBe('empty');
	});

	it('throws if a piece has empty id', () => {
		const army = makeArmy();
		(army.rook as { id: string }).id = '';
		expect(() => useWarbandStore.getState().setWarband(army, [])).toThrow(
			/army\.rook\.id/
		);
	});

	it('throws if deckCardIds contains a non-integer', () => {
		const army = makeArmy();
		expect(() =>
			useWarbandStore.getState().setWarband(army, [1, 2.5, 3] as ReadonlyArray<number>)
		).toThrow(/deckCardIds\[1\]/);
	});

	it('throws if deckCardIds contains a non-number', () => {
		const army = makeArmy();
		expect(() =>
			useWarbandStore
				.getState()
				.setWarband(army, [1, 'two' as unknown as number, 3])
		).toThrow(/deckCardIds\[1\]/);
	});

	it('preserves error cause chain when validation fails', () => {
		const broken = { ...makeArmy(), king: undefined } as unknown as ArmySelection;
		try {
			useWarbandStore.getState().setWarband(broken, []);
			expect.fail('expected throw');
		} catch (e) {
			expect(e).toBeInstanceOf(Error);
			expect((e as Error).message).toMatch(/setWarband: invalid warband/);
			const cause = (e as Error & { cause?: unknown }).cause;
			expect(cause).toBeInstanceOf(Error);
			expect((cause as Error).message).toMatch(/army\.king/);
		}
	});

	it('rejects mutation of stored deckCardIds (frozen)', () => {
		const army = makeArmy();
		act(() => {
			useWarbandStore.getState().setWarband(army, [10, 20, 30]);
		});
		const { warband } = useWarbandStore.getState();
		if (warband.status !== 'ready') throw new Error('expected ready');
		expect(Object.isFrozen(warband.deckCardIds)).toBe(true);
	});

	it('does not retain reference to caller deckCardIds array', () => {
		const army = makeArmy();
		const sourceDeck = [1, 2, 3];
		act(() => {
			useWarbandStore.getState().setWarband(army, sourceDeck);
		});
		sourceDeck.push(999);
		const { warband } = useWarbandStore.getState();
		if (warband.status !== 'ready') throw new Error('expected ready');
		expect(warband.deckCardIds.length).toBe(3);
	});

	describe('selectors', () => {
		it('selectIsReady reflects status', () => {
			expect(selectIsReady(useWarbandStore.getState())).toBe(false);
			act(() => {
				useWarbandStore.getState().setWarband(makeArmy(), []);
			});
			expect(selectIsReady(useWarbandStore.getState())).toBe(true);
		});

		it('selectArmy returns null when empty, army when ready', () => {
			expect(selectArmy(useWarbandStore.getState())).toBeNull();
			act(() => {
				useWarbandStore.getState().setWarband(makeArmy(), []);
			});
			expect(selectArmy(useWarbandStore.getState())?.king.id).toBe('king-1');
		});

		it('selectDeckCardIds returns empty when empty, list when ready', () => {
			expect(selectDeckCardIds(useWarbandStore.getState())).toEqual([]);
			act(() => {
				useWarbandStore.getState().setWarband(makeArmy(), [7, 8, 9]);
			});
			expect(selectDeckCardIds(useWarbandStore.getState())).toEqual([7, 8, 9]);
		});

		// Regression: zustand subscribers re-render whenever a selector returns
		// a new reference, even if the underlying state did not change. Returning
		// a fresh `[]` literal each call drove an infinite render loop in
		// RagnarokGameCoordinator (Maximum update depth exceeded) when arriving
		// at `/game/single` with no warband set. Both the empty and ready
		// branches of every array/object-returning selector must hand back the
		// same reference across calls when the state has not changed.
		it('selectDeckCardIds returns referentially stable empty value across calls', () => {
			useWarbandStore.getState().clearWarband();
			const a = selectDeckCardIds(useWarbandStore.getState());
			const b = selectDeckCardIds(useWarbandStore.getState());
			expect(a).toBe(b);
		});

		it('selectDeckCardIds returns referentially stable ready value across calls', () => {
			act(() => {
				useWarbandStore.getState().setWarband(makeArmy(), [1, 2, 3]);
			});
			const a = selectDeckCardIds(useWarbandStore.getState());
			const b = selectDeckCardIds(useWarbandStore.getState());
			expect(a).toBe(b);
		});
	});
});
