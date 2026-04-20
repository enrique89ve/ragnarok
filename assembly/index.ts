/**
 * WASM Engine Entry Point
 *
 * This is the main module exported to the browser via WebAssembly.
 * All game-mechanical state transitions are computed here.
 *
 * Exports:
 *  - applyAction(stateJson, actionJson) → resultJson
 *  - getStateHash(stateJson) → hashHex
 *  - Card data loading helpers (beginCard, setCardStats, commitCard, etc.)
 *  - Poker hand evaluation (evaluateHand, compareHands)
 *  - Betting engine (processBet)
 */

// Re-export card lookup helpers for the TypeScript bridge to call
export {
	beginCard,
	setCardStats,
	setCardMeta,
	addCardKeyword,
	setCardBattlecry,
	setCardDeathrattle,
	setCardSpellEffect,
	commitCard,
	getCardCount,
	clearCardData,
} from './util/cardLookup';

// Poker exports
export {
	evaluateFiveCardHand,
	findBestHand,
	compareHands,
	calculateHandStrength,
} from './poker/handEvaluator';

export {
	processBettingAction,
	initializeBettingState,
	resetForNewRound,
	calculateCallAmount,
	calculateMinRaise,
} from './poker/bettingEngine';

export {
	getNextPhase,
	getBettingRound,
	isBettingPhase,
	isRevealPhase,
	getCommunityCardsToReveal,
	getTotalCommunityCards,
} from './poker/phaseManager';

export {
	calculateFinalDamage,
	createPokerDeck,
} from './types/PokerTypes';

// Engine exports
import {
	applyAction as _applyAction,
	computeStateHash as _computeStateHash,
} from './engine/actionProcessor';

import {
	GameState,
	Player,
	CardInstance,
	EngineAction,
	EngineResult,
	ManaPool,
	HeroPower,
	ACTION_PLAY_CARD,
	ACTION_ATTACK,
	ACTION_END_TURN,
	ACTION_HERO_POWER,
	PLAYER_SELF,
	PLAYER_OPPONENT,
	PHASE_PLAYING,
} from './types/GameState';

import { serializeGameState } from './engine/stateSerializer';
import { sha256 } from './util/sha256';
import { SeededRng } from './util/seededRng';

// ============================================================
// String buffer for passing results back to TypeScript
// ============================================================

let resultBuffer: string = '';

/** Get the last result (called by TS bridge after applyGameAction) */
export function getResult(): string {
	return resultBuffer;
}

/** Get result length in bytes (for memory allocation) */
export function getResultLength(): i32 {
	return resultBuffer.length;
}

// ============================================================
// High-level API (JSON string boundary)
// ============================================================

/**
 * Compute SHA-256 hash of a game state JSON string.
 * Used for state verification between P2P peers.
 */
export function hashStateJson(stateJson: string): string {
	return sha256(stateJson);
}

/**
 * Compute canonical state hash from internal GameState.
 * The TypeScript bridge deserializes JSON → calls engine → reads hash.
 */
export function computeCanonicalHash(state: GameState): string {
	const serialized = serializeGameState(state);
	return sha256(serialized);
}

// ============================================================
// Engine version
// ============================================================

export function getEngineVersion(): string {
	return '1.0.0';
}

// ============================================================
// Initialization
// ============================================================

export function _start(): void {
	// Called on module instantiation. No-op for now.
}

// ============================================================
// Expose types for the TypeScript bridge to construct
// ============================================================

export function createGameState(): GameState {
	return new GameState();
}

export function createPlayer(id: i32): Player {
	return new Player(id);
}

export function createManaPool(current: i32, max: i32): ManaPool {
	return new ManaPool(current, max);
}

export function createHeroPower(name: string, cost: i32): HeroPower {
	return new HeroPower(name, cost);
}

export function createCardInstance(instanceId: string, cardId: i32): CardInstance {
	return new CardInstance(instanceId, cardId);
}

export function createEngineAction(actionType: i32): EngineAction {
	return new EngineAction(actionType);
}

// ============================================================
// Direct action API (avoids JSON serialization overhead)
// The TypeScript bridge can build state in WASM memory directly.
// ============================================================

/**
 * Apply an action to a GameState and return the result.
 * This is the primary entry point for the P2P verification flow.
 */
export function applyGameAction(state: GameState, action: EngineAction): EngineResult {
	return _applyAction(state, action);
}

/**
 * Get the canonical state hash for a GameState.
 */
export function getStateHash(state: GameState): string {
	return _computeStateHash(state);
}
