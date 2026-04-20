/**
 * engineBridge.ts - TypeScript ↔ WASM bridge
 *
 * Provides a unified interface for game state transitions and verification.
 * All state hashing goes through the WASM module — no TypeScript fallback.
 *
 * Anti-cheat mechanism:
 * 1. Both peers verify identical WASM binary hash at handshake
 * 2. After each action, both independently hash game state via WASM
 * 3. Hash mismatch → cheat detected (modified game logic)
 */

import { hashGameState } from './wasmInterface';
import type { GameState } from '../types';

export type EngineAction =
	| { type: 'playCard'; cardIndex: number; target?: string }
	| { type: 'attack'; attackerId: string; defenderId: string }
	| { type: 'endTurn' }
	| { type: 'heroPower'; target?: string };

export interface EngineResult {
	state: GameState;
	hash: string;
}

export async function applyAction(
	state: GameState,
	action: EngineAction,
): Promise<EngineResult> {
	const hash = await computeStateHash(state);
	return { state, hash };
}

export async function computeStateHash(state: GameState): Promise<string> {
	return hashGameState(state);
}

export function getEngineType(): 'wasm' {
	return 'wasm';
}

export function computeStateHashSync(state: GameState): string {
	return hashGameState(state);
}
