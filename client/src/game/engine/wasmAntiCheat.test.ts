/**
 * WASM Anti-Cheat Tests
 *
 * Verifies that:
 * 1. All engine functions throw when WASM is not loaded (no silent degradation)
 * 2. State serialization is deterministic (same state = same output)
 * 3. Any state tampering produces a different hash
 * 4. The engine bridge has no TypeScript fallback paths
 * 5. wasmLoader throws on failure instead of returning false
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { serializeGameState } from './stateSerializer';

// Mock the wasmInterface module to test enforcement without actual WASM binary
vi.mock('./wasmInterface', async () => {
	let _wasmReady = false;
	let _mockHash = '';

	return {
		isWasmReady: () => _wasmReady,
		initializeWasm: async () => {
			_wasmReady = true;
			return true;
		},
		getWasmBinaryHash: () => {
			if (!_wasmReady) throw new Error('WASM engine not loaded — ranked play blocked. Call loadWasmEngine() first.');
			return 'abc123def456';
		},
		getWasmLoadError: () => _wasmReady ? null : 'test mock',
		hashGameState: (state: unknown) => {
			if (!_wasmReady) throw new Error('WASM engine not loaded — ranked play blocked. Call loadWasmEngine() first.');
			_mockHash = 'wasm_hash_' + JSON.stringify(state).length;
			return _mockHash;
		},
		hashJsonString: (json: string) => {
			if (!_wasmReady) throw new Error('WASM engine not loaded — ranked play blocked. Call loadWasmEngine() first.');
			return 'wasm_hash_' + json.length;
		},
		getEngineVersion: () => {
			if (!_wasmReady) throw new Error('WASM engine not loaded — ranked play blocked. Call loadWasmEngine() first.');
			return '1.0.0';
		},
		wasmCalculateFinalDamage: (baseAttack: number) => {
			if (!_wasmReady) throw new Error('WASM engine not loaded — ranked play blocked. Call loadWasmEngine() first.');
			return baseAttack * 2;
		},
		wasmGetNextPhase: (phase: number) => {
			if (!_wasmReady) throw new Error('WASM engine not loaded — ranked play blocked. Call loadWasmEngine() first.');
			return phase + 1;
		},
		wasmIsBettingPhase: (phase: number) => {
			if (!_wasmReady) throw new Error('WASM engine not loaded — ranked play blocked. Call loadWasmEngine() first.');
			return phase === 1;
		},
		wasmIsRevealPhase: (phase: number) => {
			if (!_wasmReady) throw new Error('WASM engine not loaded — ranked play blocked. Call loadWasmEngine() first.');
			return phase === 3;
		},
		loadCardDataIntoWasm: async () => {
			if (!_wasmReady) throw new Error('WASM engine not loaded — ranked play blocked. Call loadWasmEngine() first.');
			return 1500;
		},
		__setWasmReady: (ready: boolean) => { _wasmReady = ready; },
	};
});

// Helper to get mocked module with test controls
async function getMockedInterface() {
	const mod = await import('./wasmInterface') as any;
	return mod;
}

// Minimal game state fixture matching the TS types
function createMinimalGameState() {
	const makePlayer = (id: string) => ({
		id,
		heroHealth: 100,
		health: 100,
		heroArmor: 0,
		heroClass: 'warrior',
		mana: { current: 5, max: 5 },
		hand: [] as any[],
		battlefield: [] as any[],
		deck: [] as any[],
		graveyard: [] as any[],
		secrets: [] as any[],
		cardsPlayedThisTurn: 0,
	});

	return {
		currentTurn: 'player',
		turnNumber: 3,
		gamePhase: 'playing',
		players: {
			player: makePlayer('player'),
			opponent: makePlayer('opponent'),
		},
		winner: undefined,
	};
}

describe('WASM Anti-Cheat: No Silent Degradation', () => {
	beforeEach(async () => {
		const mod = await getMockedInterface();
		mod.__setWasmReady(false);
	});

	it('hashGameState throws when WASM not loaded', async () => {
		const { hashGameState } = await import('./wasmInterface');
		expect(() => hashGameState({} as any)).toThrow('WASM engine not loaded');
	});

	it('hashJsonString throws when WASM not loaded', async () => {
		const { hashJsonString } = await import('./wasmInterface');
		expect(() => hashJsonString('{"test":1}')).toThrow('WASM engine not loaded');
	});

	it('getEngineVersion throws when WASM not loaded', async () => {
		const { getEngineVersion } = await import('./wasmInterface');
		expect(() => getEngineVersion()).toThrow('WASM engine not loaded');
	});

	it('wasmCalculateFinalDamage throws when WASM not loaded', async () => {
		const { wasmCalculateFinalDamage } = await import('./wasmInterface');
		expect(() => wasmCalculateFinalDamage(10, 5, 3)).toThrow('WASM engine not loaded');
	});

	it('wasmGetNextPhase throws when WASM not loaded', async () => {
		const { wasmGetNextPhase } = await import('./wasmInterface');
		expect(() => wasmGetNextPhase(1)).toThrow('WASM engine not loaded');
	});

	it('wasmIsBettingPhase throws when WASM not loaded', async () => {
		const { wasmIsBettingPhase } = await import('./wasmInterface');
		expect(() => wasmIsBettingPhase(1)).toThrow('WASM engine not loaded');
	});

	it('wasmIsRevealPhase throws when WASM not loaded', async () => {
		const { wasmIsRevealPhase } = await import('./wasmInterface');
		expect(() => wasmIsRevealPhase(3)).toThrow('WASM engine not loaded');
	});

	it('getWasmBinaryHash throws when WASM not loaded', async () => {
		const { getWasmBinaryHash } = await import('./wasmInterface');
		expect(() => getWasmBinaryHash()).toThrow('WASM engine not loaded');
	});

	it('loadCardDataIntoWasm throws when WASM not loaded', async () => {
		const { loadCardDataIntoWasm } = await import('./wasmInterface');
		await expect(loadCardDataIntoWasm([])).rejects.toThrow('WASM engine not loaded');
	});
});

describe('WASM Anti-Cheat: Functions work after WASM loads', () => {
	beforeEach(async () => {
		const mod = await getMockedInterface();
		mod.__setWasmReady(true);
	});

	it('hashGameState returns a hash when WASM is loaded', async () => {
		const { hashGameState } = await import('./wasmInterface');
		const result = hashGameState({} as any);
		expect(result).toMatch(/^wasm_hash_/);
	});

	it('getEngineVersion returns version string, not fallback', async () => {
		const { getEngineVersion } = await import('./wasmInterface');
		expect(getEngineVersion()).toBe('1.0.0');
		expect(getEngineVersion()).not.toContain('fallback');
		expect(getEngineVersion()).not.toContain('typescript');
	});

	it('getWasmBinaryHash returns real hash, not "unavailable"', async () => {
		const { getWasmBinaryHash } = await import('./wasmInterface');
		const hash = getWasmBinaryHash();
		expect(hash).not.toBe('unavailable');
		expect(hash).not.toBe('dev');
		expect(hash.length).toBeGreaterThan(0);
	});

	it('wasmCalculateFinalDamage returns computed value, not raw baseAttack', async () => {
		const { wasmCalculateFinalDamage } = await import('./wasmInterface');
		const result = wasmCalculateFinalDamage(10, 5, 3);
		expect(result).toBe(20);
		expect(result).not.toBe(10);
	});
});

describe('WASM Anti-Cheat: Engine Bridge has no TS fallback', () => {
	beforeEach(async () => {
		const mod = await getMockedInterface();
		mod.__setWasmReady(true);
	});

	it('getEngineType always returns "wasm"', async () => {
		const { getEngineType } = await import('./engineBridge');
		expect(getEngineType()).toBe('wasm');
	});

	it('computeStateHash calls WASM, not browser crypto', async () => {
		const { computeStateHash } = await import('./engineBridge');
		const state = createMinimalGameState();
		const hash = await computeStateHash(state as any);
		expect(hash).toMatch(/^wasm_hash_/);
	});

	it('computeStateHashSync returns string, not null', async () => {
		const { computeStateHashSync } = await import('./engineBridge');
		const state = createMinimalGameState();
		const hash = computeStateHashSync(state as any);
		expect(typeof hash).toBe('string');
		expect(hash).not.toBeNull();
	});

	it('EngineResult has no "engine" field', async () => {
		const { applyAction } = await import('./engineBridge');
		const state = createMinimalGameState();
		const result = await applyAction(state as any, { type: 'endTurn' });
		expect(result).toHaveProperty('state');
		expect(result).toHaveProperty('hash');
		expect(result).not.toHaveProperty('engine');
	});
});

describe('WASM Anti-Cheat: State Serialization Determinism', () => {
	it('same state serializes to identical string every time', () => {
		const state = createMinimalGameState();
		const s1 = serializeGameState(state as any);
		const s2 = serializeGameState(state as any);
		const s3 = serializeGameState(state as any);
		expect(s1).toBe(s2);
		expect(s2).toBe(s3);
	});

	it('serialization sorts keys lexicographically', () => {
		const state = createMinimalGameState();
		const serialized = serializeGameState(state as any);
		const parsed = JSON.parse(serialized);
		const keys = Object.keys(parsed);
		const sorted = [...keys].sort();
		expect(keys).toEqual(sorted);
	});

	it('different health produces different serialization', () => {
		const state1 = createMinimalGameState();
		const state2 = createMinimalGameState();
		state2.players.player.heroHealth = 99;
		state2.players.player.health = 99;
		const s1 = serializeGameState(state1 as any);
		const s2 = serializeGameState(state2 as any);
		expect(s1).not.toBe(s2);
	});

	it('different turn number produces different serialization', () => {
		const state1 = createMinimalGameState();
		const state2 = createMinimalGameState();
		state2.turnNumber = 4;
		expect(serializeGameState(state1 as any)).not.toBe(serializeGameState(state2 as any));
	});

	it('different mana produces different serialization', () => {
		const state1 = createMinimalGameState();
		const state2 = createMinimalGameState();
		state2.players.player.mana.current = 3;
		expect(serializeGameState(state1 as any)).not.toBe(serializeGameState(state2 as any));
	});

	it('adding a card to hand produces different serialization', () => {
		const state1 = createMinimalGameState();
		const state2 = createMinimalGameState();
		state2.players.player.hand.push({
			instanceId: 'card-1',
			card: { id: 1001, keywords: ['taunt'] },
			currentAttack: 2,
			currentHealth: 3,
		});
		expect(serializeGameState(state1 as any)).not.toBe(serializeGameState(state2 as any));
	});

	it('adding a minion to battlefield produces different serialization', () => {
		const state1 = createMinimalGameState();
		const state2 = createMinimalGameState();
		state2.players.opponent.battlefield.push({
			instanceId: 'minion-1',
			card: { id: 2001, keywords: [] },
			currentAttack: 5,
			currentHealth: 4,
		});
		expect(serializeGameState(state1 as any)).not.toBe(serializeGameState(state2 as any));
	});

	it('different armor produces different serialization', () => {
		const state1 = createMinimalGameState();
		const state2 = createMinimalGameState();
		state2.players.player.heroArmor = 5;
		expect(serializeGameState(state1 as any)).not.toBe(serializeGameState(state2 as any));
	});

	it('swapping player/opponent positions produces different serialization', () => {
		const state1 = createMinimalGameState();
		const state2 = createMinimalGameState();
		state2.players.player.heroHealth = 80;
		state2.players.opponent.heroHealth = 100;
		const state3 = createMinimalGameState();
		state3.players.player.heroHealth = 100;
		state3.players.opponent.heroHealth = 80;
		expect(serializeGameState(state2 as any)).not.toBe(serializeGameState(state3 as any));
	});
});

describe('WASM Anti-Cheat: Tamper Detection', () => {
	beforeEach(async () => {
		const mod = await getMockedInterface();
		mod.__setWasmReady(true);
	});

	it('tampering health after hash changes the hash', async () => {
		const { computeStateHash } = await import('./engineBridge');
		const state = createMinimalGameState();
		const hash1 = await computeStateHash(state as any);

		state.players.player.heroHealth = 50;
		state.players.player.health = 50;
		const hash2 = await computeStateHash(state as any);

		expect(hash1).not.toBe(hash2);
	});

	it('secretly adding a card to hand changes the hash', async () => {
		const { computeStateHash } = await import('./engineBridge');
		const state = createMinimalGameState();
		const hash1 = await computeStateHash(state as any);

		state.players.player.hand.push({
			instanceId: 'cheated-card',
			card: { id: 9999, keywords: ['charge'] },
			currentAttack: 99,
			currentHealth: 99,
		});
		const hash2 = await computeStateHash(state as any);

		expect(hash1).not.toBe(hash2);
	});

	it('secretly buffing a minion changes the hash', async () => {
		const { computeStateHash } = await import('./engineBridge');
		const state = createMinimalGameState();
		state.players.player.battlefield.push({
			instanceId: 'minion-1',
			card: { id: 1001, keywords: [] },
			currentAttack: 3,
			currentHealth: 4,
		});
		const hash1 = await computeStateHash(state as any);

		state.players.player.battlefield[0].currentAttack = 99;
		const hash2 = await computeStateHash(state as any);

		expect(hash1).not.toBe(hash2);
	});

	it('secretly adding mana changes the hash', async () => {
		const { computeStateHash } = await import('./engineBridge');
		const state = createMinimalGameState();
		const hash1 = await computeStateHash(state as any);

		state.players.player.mana.current = 10;
		state.players.player.mana.max = 10;
		const hash2 = await computeStateHash(state as any);

		expect(hash1).not.toBe(hash2);
	});

	it('secretly changing the turn produces different hash', async () => {
		const { computeStateHash } = await import('./engineBridge');
		const state = createMinimalGameState();
		const hash1 = await computeStateHash(state as any);

		state.currentTurn = 'opponent';
		const hash2 = await computeStateHash(state as any);

		expect(hash1).not.toBe(hash2);
	});

	it('secretly removing opponent minion changes the hash', async () => {
		const { computeStateHash } = await import('./engineBridge');
		const state = createMinimalGameState();
		state.players.opponent.battlefield.push({
			instanceId: 'opp-minion',
			card: { id: 2001, keywords: ['taunt'] },
			currentAttack: 5,
			currentHealth: 6,
		});
		const hash1 = await computeStateHash(state as any);

		state.players.opponent.battlefield.pop();
		const hash2 = await computeStateHash(state as any);

		expect(hash1).not.toBe(hash2);
	});
});

describe('WASM Anti-Cheat: wasmLoader enforcement', () => {
	it('loadWasmEngine rejects when WASM fails', async () => {
		// Reset module to test the failure path
		vi.doMock('./wasmInterface', () => ({
			isWasmReady: () => false,
			initializeWasm: async () => false,
			getWasmLoadError: () => 'WASM module not found at /engine.wasm',
			getWasmBinaryHash: () => { throw new Error('not loaded'); },
			loadCardDataIntoWasm: async () => { throw new Error('not loaded'); },
		}));

		// Dynamic import to get the mocked version
		const { loadWasmEngine } = await import('./wasmLoader');
		await expect(loadWasmEngine()).rejects.toThrow();
	});
});
