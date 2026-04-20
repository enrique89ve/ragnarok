/**
 * stateSerializer.ts — Canonical state serialization (TypeScript side)
 *
 * Produces deterministic JSON strings for game state hashing.
 * Keys are lexicographically sorted, UI-only fields are excluded.
 * The output must match the WASM serializer exactly for hash agreement.
 */

import type { GameState, Player, CardInstance } from '../types';

const EXCLUDED_FIELDS = new Set([
	'gameLog', 'animations', 'targetingState', 'discovery',
	'mulligan', 'mulliganCompleted', 'id',
]);

function sortedKeys(obj: Record<string, unknown>): string[] {
	return Object.keys(obj).filter(k => !EXCLUDED_FIELDS.has(k)).sort();
}

function canonicalValue(val: unknown): string {
	if (val === null || val === undefined) return 'null';
	if (typeof val === 'number') return Number.isFinite(val) ? String(val) : '0';
	if (typeof val === 'boolean') return val ? 'true' : 'false';
	if (typeof val === 'string') return escapeJsonString(val);
	if (Array.isArray(val)) {
		const items = val.map(v => canonicalValue(v));
		return '[' + items.join(',') + ']';
	}
	if (typeof val === 'object') {
		const obj = val as Record<string, unknown>;
		const keys = sortedKeys(obj);
		const pairs = keys.map(k => escapeJsonString(k) + ':' + canonicalValue(obj[k]));
		return '{' + pairs.join(',') + '}';
	}
	return 'null';
}

function escapeJsonString(s: string): string {
	let result = '"';
	for (let i = 0; i < s.length; i++) {
		const c = s.charCodeAt(i);
		if (c === 0x22) result += '\\"';
		else if (c === 0x5c) result += '\\\\';
		else if (c === 0x08) result += '\\b';
		else if (c === 0x0c) result += '\\f';
		else if (c === 0x0a) result += '\\n';
		else if (c === 0x0d) result += '\\r';
		else if (c === 0x09) result += '\\t';
		else if (c < 0x20) {
			result += '\\u' + c.toString(16).padStart(4, '0');
		} else {
			result += s[i];
		}
	}
	return result + '"';
}

function serializeCardInstance(card: CardInstance): string {
	const parts: string[] = [];
	const cardId = typeof card.card?.id === 'number' ? card.card.id : 0;
	parts.push('"cardId":' + cardId);
	if (card.currentAttack !== undefined) parts.push('"currentAttack":' + card.currentAttack);
	if (card.currentHealth !== undefined) parts.push('"currentHealth":' + card.currentHealth);
	parts.push('"instanceId":' + escapeJsonString(card.instanceId));
	const keywords = card.card?.keywords ?? [];
	if (keywords.length > 0) {
		parts.push('"keywords":[' + keywords.map((k: string) => escapeJsonString(k)).join(',') + ']');
	}
	return '{' + parts.sort().join(',') + '}';
}

function serializePlayer(player: Player): string {
	const parts: string[] = [];
	parts.push('"battlefield":[' + player.battlefield.map(c => serializeCardInstance(c)).join(',') + ']');
	parts.push('"cardsPlayedThisTurn":' + (player.cardsPlayedThisTurn ?? 0));
	parts.push('"deck":' + canonicalValue(player.deck.map(d => typeof d === 'object' && d !== null && 'id' in d ? (d as { id: number }).id : 0)));
	parts.push('"graveyard":[' + player.graveyard.map(c => serializeCardInstance(c)).join(',') + ']');
	parts.push('"hand":[' + player.hand.map(c => serializeCardInstance(c)).join(',') + ']');
	parts.push('"health":' + (player.heroHealth ?? player.health ?? 100));
	parts.push('"heroArmor":' + (player.heroArmor ?? 0));
	parts.push('"heroClass":' + escapeJsonString(player.heroClass ?? 'neutral'));
	parts.push('"id":' + escapeJsonString(player.id ?? ''));
	parts.push('"mana":{"current":' + (player.mana?.current ?? 0) + ',"max":' + (player.mana?.max ?? 0) + '}');
	parts.push('"secrets":[' + player.secrets.map(c => serializeCardInstance(c)).join(',') + ']');
	return '{' + parts.sort().join(',') + '}';
}

export function serializeGameState(state: GameState): string {
	const parts: string[] = [];
	parts.push('"currentTurn":' + escapeJsonString(state.currentTurn));
	parts.push('"gamePhase":' + escapeJsonString(state.gamePhase));
	parts.push('"opponent":' + serializePlayer(state.players.opponent));
	parts.push('"player":' + serializePlayer(state.players.player));
	parts.push('"turnNumber":' + state.turnNumber);
	if (state.winner !== undefined && state.winner !== null) {
		parts.push('"winner":' + escapeJsonString(state.winner));
	}
	return '{' + parts.sort().join(',') + '}';
}
