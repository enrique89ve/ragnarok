import { gzipSync, gunzipSync, strFromU8, strToU8 } from 'fflate';

import type { GameState } from '../types';

export const GAME_STATE_WIRE_CODEC = 'json+gzip+base64url@1';
export const MAX_COMPRESSED_GAME_STATE_BASE64URL_CHARS = 16 * 1024;
export const MAX_DECOMPRESSED_GAME_STATE_BYTES = 128 * 1024;

export type UncompressedGameStatePayload = {
	readonly gameState: GameState;
};

export type CompressedGameStatePayload = {
	readonly stateCodec: typeof GAME_STATE_WIRE_CODEC;
	readonly compressedGameState: string;
};

export type GameStateWirePayload = UncompressedGameStatePayload | CompressedGameStatePayload;

function utf8ByteLength(value: string): number {
	return new TextEncoder().encode(value).byteLength;
}

function bytesToBase64(bytes: Uint8Array): string {
	if (typeof btoa === 'function') {
		return btoa(strFromU8(bytes, true));
	}
	if (typeof Buffer !== 'undefined') {
		return Buffer.from(bytes).toString('base64');
	}
	throw new Error('No base64 encoder available');
}

function bytesToBase64Url(bytes: Uint8Array): string {
	return bytesToBase64(bytes)
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/g, '');
}

function base64UrlToBytes(input: string): Uint8Array | null {
	if (!/^[A-Za-z0-9_-]+$/.test(input)) return null;
	const base64 = input
		.replace(/-/g, '+')
		.replace(/_/g, '/');
	const padded = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), '=');
	try {
		if (typeof atob === 'function') {
			const binary = atob(padded);
			return Uint8Array.from(binary, char => char.charCodeAt(0));
		}
		if (typeof Buffer !== 'undefined') {
			return new Uint8Array(Buffer.from(padded, 'base64'));
		}
		return null;
	} catch {
		return null;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGameStateLike(value: unknown): value is GameState {
	if (!isRecord(value)) return false;
	if (!isRecord(value.players)) return false;
	if (!isRecord(value.players.player) || !isRecord(value.players.opponent)) return false;
	if (value.currentTurn !== 'player' && value.currentTurn !== 'opponent') return false;
	if (typeof value.turnNumber !== 'number' || !Number.isInteger(value.turnNumber)) return false;
	if (value.gamePhase !== 'mulligan' && value.gamePhase !== 'playing' && value.gamePhase !== 'ended' && value.gamePhase !== 'game_over') return false;
	if (!Array.isArray(value.gameLog)) return false;
	return true;
}

export function encodeGameStateForWire(gameState: GameState): CompressedGameStatePayload {
	const json = JSON.stringify(gameState);
	const compressed = gzipSync(strToU8(json), { level: 6 });
	return {
		stateCodec: GAME_STATE_WIRE_CODEC,
		compressedGameState: bytesToBase64Url(compressed),
	};
}

export function decodeCompressedGameState(payload: CompressedGameStatePayload): GameState | null {
	if (payload.stateCodec !== GAME_STATE_WIRE_CODEC) return null;
	if (payload.compressedGameState.length > MAX_COMPRESSED_GAME_STATE_BASE64URL_CHARS) return null;
	const bytes = base64UrlToBytes(payload.compressedGameState);
	if (!bytes) return null;
	let json: string;
	try {
		json = strFromU8(gunzipSync(bytes));
	} catch {
		return null;
	}
	if (utf8ByteLength(json) > MAX_DECOMPRESSED_GAME_STATE_BYTES) return null;
	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		return null;
	}
	return isGameStateLike(parsed) ? parsed : null;
}

export function decodeWireGameState(payload: GameStateWirePayload): GameState | null {
	if ('gameState' in payload) return payload.gameState;
	return decodeCompressedGameState(payload);
}
