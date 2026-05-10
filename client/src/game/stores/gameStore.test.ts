import { describe, it, expect, beforeEach, vi } from 'vitest';

// `gameStore` transitively imports `useGame` which touches `localStorage`
// at module-load time. The default vitest env is `node`, so we install a
// synchronous stub via `vi.hoisted` (runs before any `import`).
vi.hoisted(() => {
	const mem = new Map<string, string>();
	(globalThis as { localStorage?: unknown }).localStorage = {
		getItem: (key: string) => mem.get(key) ?? null,
		setItem: (key: string, value: string) => {
			mem.set(key, value);
		},
		removeItem: (key: string) => {
			mem.delete(key);
		},
		clear: () => {
			mem.clear();
		},
		key: () => null,
		length: 0,
	};
});

import { useGameStore, selectPlayerHand, EMPTY_HAND } from './gameStore';
import { initializeGame } from '../utils/gameUtils';
import type { GameState } from '../types';

describe('selectPlayerHand', () => {
	beforeEach(() => {
		useGameStore.setState({ gameState: initializeGame() });
	});

	// Regression: zustand subscribers re-render whenever a selector returns
	// a new reference, even if the underlying state did not change. Returning
	// a fresh `[]` literal each call drives an infinite render loop in
	// `useSyncExternalStore` (Maximum update depth exceeded). Both the empty
	// and ready branches of every array/object-returning selector must hand
	// back the same reference across calls when the state has not changed.
	// Same fix shape as `useWarbandStore.selectDeckCardIds` (commit f829952).
	it('returns referentially stable empty fallback across calls when gameState is missing', () => {
		useGameStore.setState({ gameState: undefined as unknown as GameState });
		const a = selectPlayerHand(useGameStore.getState());
		const b = selectPlayerHand(useGameStore.getState());
		expect(a).toBe(b);
		expect(a).toBe(EMPTY_HAND);
	});

	it('returns referentially stable hand reference across calls when gameState is ready', () => {
		const a = selectPlayerHand(useGameStore.getState());
		const b = selectPlayerHand(useGameStore.getState());
		expect(a).toBe(b);
	});

	it('returns the actual hand array (not the empty fallback) when gameState is ready', () => {
		const hand = selectPlayerHand(useGameStore.getState());
		expect(hand).not.toBe(EMPTY_HAND);
		expect(Array.isArray(hand)).toBe(true);
	});
});
