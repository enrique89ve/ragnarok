/**
 * wasmLoader.ts - WASM module loader with hash verification
 *
 * Loads the deterministic game engine WASM module, initializes it with
 * card data, and verifies its hash. Both P2P players must have matching
 * WASM hashes to ensure deterministic gameplay.
 *
 * WASM is mandatory. If it fails to load, loadWasmEngine() throws.
 */

import {
	initializeWasm,
	getWasmBinaryHash,
	isWasmReady,
	getWasmLoadError as getInterfaceError,
	loadCardDataIntoWasm,
} from './wasmInterface';

let initPromise: Promise<void> | null = null;
let cardCount = 0;

export async function loadWasmEngine(): Promise<void> {
	if (isWasmReady()) return;
	if (initPromise) return initPromise;

	initPromise = (async () => {
		const success = await initializeWasm();
		if (!success) {
			initPromise = null;
			throw new Error(`WASM engine failed to load: ${getInterfaceError() ?? 'unknown error'}`);
		}

		const { cardRegistry } = await import('../data/cardRegistry');
		cardCount = await loadCardDataIntoWasm(cardRegistry);
	})();

	return initPromise;
}

export function getWasmHash(): string {
	return getWasmBinaryHash();
}

declare const __BUILD_HASH__: string;

export function getWasmLoadError(): string | null {
	return getInterfaceError();
}

export function getLoadedCardCount(): number {
	return cardCount;
}
