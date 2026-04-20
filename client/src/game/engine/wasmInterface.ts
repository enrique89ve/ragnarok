/**
 * wasmInterface.ts — Typed wrappers for the AssemblyScript WASM engine
 *
 * Loads engine.wasm, computes its SHA-256 hash for P2P verification,
 * and exposes typed functions for state hashing, poker evaluation,
 * betting, and card data loading.
 *
 * WASM is mandatory — no TypeScript fallbacks. If WASM fails to load,
 * ranked play is blocked and all engine functions throw.
 */

import type { GameState } from '../types';
import { serializeGameState } from './stateSerializer';
import { exportCardDataToWasm } from './cardDataExporter';
import type { WasmCardLoader } from './cardDataExporter';

let wasmExports: WasmExports | null = null;
let wasmBinaryHash: string | null = null;
let loadError: string | null = null;
let cardDataLoaded = false;

interface WasmExports extends WasmCardLoader {
	hashStateJson(json: string): string;
	getEngineVersion(): string;
	getResult(): string;
	getResultLength(): number;
	calculateFinalDamage(baseAttack: number, hpBet: number, handRank: number, extraDamage?: number): number;
	getNextPhase(currentPhase: number): number;
	getBettingRound(phase: number): number;
	isBettingPhase(phase: number): boolean;
	isRevealPhase(phase: number): boolean;
	getCommunityCardsToReveal(phase: number): number;
	getTotalCommunityCards(phase: number): number;
}

async function computeBinaryHash(bytes: ArrayBuffer): Promise<string> {
	const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
	const hashArray = new Uint8Array(hashBuffer);
	return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function initializeWasm(): Promise<boolean> {
	if (wasmExports) return true;

	try {
		const response = await fetch(import.meta.env.BASE_URL + 'engine.wasm');
		if (!response.ok) {
			loadError = 'WASM module not found at /engine.wasm';
			return false;
		}

		const bytes = await response.arrayBuffer();
		wasmBinaryHash = await computeBinaryHash(bytes);

		const adaptedImports = {
			env: Object.setPrototypeOf({
				abort(message: number, fileName: number, lineNumber: number, columnNumber: number) {
					throw new Error(`WASM abort at ${lineNumber}:${columnNumber}`);
				},
			}, Object.assign(Object.create(globalThis), {})),
		};

		const module = await WebAssembly.compile(bytes);
		const { exports } = await WebAssembly.instantiate(module, adaptedImports);
		const memory = exports.memory as WebAssembly.Memory;

		let dataview = new DataView(memory.buffer);

		function refreshDataView(): DataView {
			dataview = new DataView(memory.buffer);
			return dataview;
		}

		function liftString(pointer: number): string {
			if (!pointer) return '';
			const end = pointer + new Uint32Array(memory.buffer)[pointer - 4 >>> 2] >>> 1;
			const memoryU16 = new Uint16Array(memory.buffer);
			let start = pointer >>> 1;
			let result = '';
			while (end - start > 1024) result += String.fromCharCode(...memoryU16.subarray(start, start += 1024));
			return result + String.fromCharCode(...memoryU16.subarray(start, end));
		}

		function lowerString(value: string | null): number {
			if (value == null) return 0;
			const length = value.length;
			const newFn = exports.__new as (size: number, id: number) => number;
			const pointer = newFn(length << 1, 2) >>> 0;
			const memoryU16 = new Uint16Array(memory.buffer);
			for (let i = 0; i < length; ++i) memoryU16[(pointer >>> 1) + i] = value.charCodeAt(i);
			return pointer;
		}

		function getU32(pointer: number): number {
			try {
				return dataview.getUint32(pointer, true);
			} catch {
				return refreshDataView().getUint32(pointer, true);
			}
		}

		const pinFn = exports.__pin as (ptr: number) => number;
		const unpinFn = exports.__unpin as (ptr: number) => void;
		const rawExports = exports as Record<string, Function>;

		function notnull(): never {
			throw new TypeError('WASM: value must not be null');
		}

		wasmExports = {
			hashStateJson(json: string): string {
				const ptr = lowerString(json) || notnull();
				return liftString((rawExports.hashStateJson as Function)(ptr) >>> 0);
			},
			getEngineVersion(): string {
				return liftString((rawExports.getEngineVersion as Function)() >>> 0);
			},
			getResult(): string {
				return liftString((rawExports.getResult as Function)() >>> 0);
			},
			getResultLength(): number {
				return (rawExports.getResultLength as Function)();
			},
			calculateFinalDamage(baseAttack: number, hpBet: number, handRank: number, extraDamage?: number): number {
				return (rawExports.calculateFinalDamage as Function)(baseAttack, hpBet, handRank, extraDamage ?? 0);
			},
			getNextPhase(currentPhase: number): number {
				return (rawExports.getNextPhase as Function)(currentPhase);
			},
			getBettingRound(phase: number): number {
				return (rawExports.getBettingRound as Function)(phase);
			},
			isBettingPhase(phase: number): boolean {
				return (rawExports.isBettingPhase as Function)(phase) !== 0;
			},
			isRevealPhase(phase: number): boolean {
				return (rawExports.isRevealPhase as Function)(phase) !== 0;
			},
			getCommunityCardsToReveal(phase: number): number {
				return (rawExports.getCommunityCardsToReveal as Function)(phase);
			},
			getTotalCommunityCards(phase: number): number {
				return (rawExports.getTotalCommunityCards as Function)(phase);
			},
			beginCard(id: number, name: string, cardType: number, manaCost: number): void {
				const namePtr = lowerString(name) || notnull();
				(rawExports.beginCard as Function)(id, namePtr, cardType, manaCost);
			},
			setCardStats(attack: number, health: number, heroClass: number, overload: number, spellDamage: number): void {
				(rawExports.setCardStats as Function)(attack, health, heroClass, overload, spellDamage);
			},
			setCardMeta(rarity: string, race: string, heroId: string, armorSlot: string): void {
				const rPtr = lowerString(rarity) || notnull();
				const rcPtr = lowerString(race) || notnull();
				const hPtr = lowerString(heroId) || notnull();
				const aPtr = lowerString(armorSlot) || notnull();
				(rawExports.setCardMeta as Function)(rPtr, rcPtr, hPtr, aPtr);
			},
			addCardKeyword(keyword: string): void {
				const ptr = lowerString(keyword) || notnull();
				(rawExports.addCardKeyword as Function)(ptr);
			},
			setCardBattlecry(pattern: string, value: number, value2: number, targetType: string, condition: string, cardId: number, count: number): void {
				const pPtr = lowerString(pattern) || notnull();
				const tPtr = lowerString(targetType) || notnull();
				const cPtr = lowerString(condition) || notnull();
				(rawExports.setCardBattlecry as Function)(pPtr, value, value2, tPtr, cPtr, cardId, count);
			},
			setCardDeathrattle(pattern: string, value: number, value2: number, targetType: string, condition: string, cardId: number, count: number): void {
				const pPtr = lowerString(pattern) || notnull();
				const tPtr = lowerString(targetType) || notnull();
				const cPtr = lowerString(condition) || notnull();
				(rawExports.setCardDeathrattle as Function)(pPtr, value, value2, tPtr, cPtr, cardId, count);
			},
			setCardSpellEffect(pattern: string, value: number, value2: number, targetType: string, condition: string, cardId: number, count: number): void {
				const pPtr = lowerString(pattern) || notnull();
				const tPtr = lowerString(targetType) || notnull();
				const cPtr = lowerString(condition) || notnull();
				(rawExports.setCardSpellEffect as Function)(pPtr, value, value2, tPtr, cPtr, cardId, count);
			},
			commitCard(): void {
				(rawExports.commitCard as Function)();
			},
			clearCardData(): void {
				(rawExports.clearCardData as Function)();
			},
			getCardCount(): number {
				return (rawExports.getCardCount as Function)();
			},
		};

		return true;
	} catch (err) {
		loadError = err instanceof Error ? err.message : 'Failed to load WASM';
		return false;
	}
}

function requireWasm(): WasmExports {
	if (!wasmExports) {
		throw new Error(`WASM engine not loaded — ranked play blocked. ${loadError ?? 'Call loadWasmEngine() first.'}`);
	}
	return wasmExports;
}

export function getWasmBinaryHash(): string {
	return requireWasm(), wasmBinaryHash!;
}

export function isWasmReady(): boolean {
	return wasmExports !== null;
}

export function getWasmLoadError(): string | null {
	return loadError;
}

export function hashGameState(state: GameState): string {
	const canonical = serializeGameState(state);
	return requireWasm().hashStateJson(canonical);
}

export function hashJsonString(json: string): string {
	return requireWasm().hashStateJson(json);
}

export function getEngineVersion(): string {
	return requireWasm().getEngineVersion();
}

export function wasmCalculateFinalDamage(
	baseAttack: number, hpBet: number, handRank: number, extraDamage?: number,
): number {
	return requireWasm().calculateFinalDamage(baseAttack, hpBet, handRank, extraDamage);
}

export function wasmGetNextPhase(currentPhase: number): number {
	return requireWasm().getNextPhase(currentPhase);
}

export function wasmIsBettingPhase(phase: number): boolean {
	return requireWasm().isBettingPhase(phase);
}

export function wasmIsRevealPhase(phase: number): boolean {
	return requireWasm().isRevealPhase(phase);
}

export async function loadCardDataIntoWasm(cards: import('../types').CardData[]): Promise<number> {
	const wasm = requireWasm();
	if (cardDataLoaded) return wasm.getCardCount();
	const count = exportCardDataToWasm(cards, wasm);
	cardDataLoaded = true;
	return count;
}
