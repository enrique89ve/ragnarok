/**
 * stateSerializer.ts — Canonical state serialization (TypeScript side)
 *
 * Produces deterministic JSON strings for game state hashing.
 * Keys are lexicographically sorted, UI-only fields are excluded. The WASM
 * boundary hashes these exact bytes; it does not reinterpret the object.
 */

import type { GameState, Player, CardInstance } from '../types';

const EXCLUDED_FIELDS = new Set([
	'gameLog', 'animations', 'targetingState', 'discovery',
	'mulligan', 'mulliganCompleted',
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
	parts.push('"cardId":' + canonicalValue(card.card?.id ?? 0));
	parts.push('"canAttack":' + (card.canAttack ? 'true' : 'false'));
	if (card.currentAttack !== undefined) parts.push('"currentAttack":' + card.currentAttack);
	if (card.currentDurability !== undefined) parts.push('"currentDurability":' + card.currentDurability);
	if (card.currentHealth !== undefined) parts.push('"currentHealth":' + card.currentHealth);
	parts.push('"attacksPerformed":' + (card.attacksPerformed ?? 0));
	parts.push('"evolutionLevel":' + (card.evolutionLevel ?? 0));
	if (card.enrageAttackBonus !== undefined) parts.push('"enrageAttackBonus":' + card.enrageAttackBonus);
	parts.push('"hasAttacked":' + (card.hasAttacked ? 'true' : 'false'));
	parts.push('"hasCharge":' + (card.hasCharge ? 'true' : 'false'));
	parts.push('"hasDivineShield":' + (card.hasDivineShield ? 'true' : 'false'));
	parts.push('"hasLifesteal":' + (card.hasLifesteal ? 'true' : 'false'));
	parts.push('"hasPoisonous":' + (card.hasPoisonous ? 'true' : 'false'));
	parts.push('"hasRush":' + (card.hasRush ? 'true' : 'false'));
	parts.push('"hasWindfury":' + (card.hasWindfury ? 'true' : 'false'));
	parts.push('"instanceId":' + escapeJsonString(card.instanceId));
	parts.push('"isFrozen":' + (card.isFrozen ? 'true' : 'false'));
	parts.push('"isPlayerOwned":' + (card.isPlayerOwned ? 'true' : 'false'));
	parts.push('"isPoisonedDoT":' + (card.isPoisonedDoT ? 'true' : 'false'));
	parts.push('"isRush":' + (card.isRush ? 'true' : 'false'));
	parts.push('"isStealth":' + (card.isStealth ? 'true' : 'false'));
	parts.push('"isSummoningSick":' + (card.isSummoningSick ? 'true' : 'false'));
	parts.push('"isTaunt":' + (card.isTaunt ? 'true' : 'false'));
	parts.push('"isVulnerable":' + (card.isVulnerable ? 'true' : 'false'));
	parts.push('"isWeakened":' + (card.isWeakened ? 'true' : 'false'));
	parts.push('"silenced":' + (card.silenced || card.isSilenced ? 'true' : 'false'));
	const keywords = card.card?.keywords ?? [];
	if (keywords.length > 0) {
		parts.push('"keywords":[' + keywords.map((k: string) => escapeJsonString(k)).join(',') + ']');
	}
	return '{' + parts.sort().join(',') + '}';
}

function serializePlayer(player: Player, fatigueCounter: number): string {
	const parts: string[] = [];
	const extendedPlayer = player as Player & {
		heroPowerUpgraded?: boolean;
	};
	parts.push('"attacksPerformedThisTurn":' + (player.attacksPerformedThisTurn ?? 0));
	parts.push('"battlefield":[' + player.battlefield.map(c => serializeCardInstance(c)).join(',') + ']');
	parts.push('"cardsPlayedThisTurn":' + (player.cardsPlayedThisTurn ?? 0));
	parts.push('"deck":' + canonicalValue(player.deck.map(d => typeof d === 'object' && d !== null && 'id' in d ? (d as { id: number | string }).id : 0)));
	parts.push('"fatigueCounter":' + fatigueCounter);
	parts.push('"graveyard":[' + player.graveyard.map(c => serializeCardInstance(c)).join(',') + ']');
	parts.push('"hand":[' + player.hand.map(c => serializeCardInstance(c)).join(',') + ']');
	parts.push('"health":' + (player.heroHealth ?? player.health ?? 100));
	parts.push('"heroArmor":' + (player.heroArmor ?? 0));
	parts.push('"heroClass":' + escapeJsonString(player.heroClass ?? 'neutral'));
	parts.push('"id":' + escapeJsonString(player.id ?? ''));
	parts.push('"mana":{"current":' + (player.mana?.current ?? 0) + ',"max":' + (player.mana?.max ?? 0) + ',"overloaded":' + (player.mana?.overloaded ?? 0) + ',"pendingOverload":' + (player.mana?.pendingOverload ?? 0) + '}');
	parts.push('"maxHealth":' + (player.maxHealth ?? 100));
	parts.push('"secrets":[' + player.secrets.map(c => serializeCardInstance(c)).join(',') + ']');
	parts.push('"heroPower":{"cost":' + (player.heroPower?.cost ?? 0) + ',"isUpgraded":' + (player.heroPower?.isUpgraded ? 'true' : 'false') + ',"name":' + escapeJsonString(player.heroPower?.name ?? '') + ',"used":' + (player.heroPower?.used ? 'true' : 'false') + '}');
	parts.push('"heroPowerUpgraded":' + (extendedPlayer.heroPowerUpgraded ? 'true' : 'false'));
	parts.push('"hero":' + canonicalValue(player.hero ?? null));
	parts.push('"tempStats":' + canonicalValue(player.tempStats ?? {}));
	parts.push('"artifact":' + (player.artifact ? serializeCardInstance(player.artifact) : 'null'));
	parts.push('"artifactState":' + canonicalValue(player.artifactState ?? null));
	parts.push('"weapon":' + (player.weapon ? serializeCardInstance(player.weapon) : 'null'));
	return '{' + parts.sort().join(',') + '}';
}

export function serializeGameState(state: GameState): string {
	const parts: string[] = [];
	parts.push('"currentTurn":' + escapeJsonString(state.currentTurn));
	parts.push('"gamePhase":' + escapeJsonString(state.gamePhase));
	parts.push('"activeRealm":' + canonicalValue(state.activeRealm ?? null));
	parts.push('"opponent":' + serializePlayer(state.players.opponent, state.fatigueCount?.opponent ?? 0));
	parts.push('"player":' + serializePlayer(state.players.player, state.fatigueCount?.player ?? 0));
	parts.push('"prophecies":' + canonicalValue(state.prophecies ?? []));
	parts.push('"realmsVisited":' + canonicalValue(state.realmsVisited ?? []));
	parts.push('"turnNumber":' + state.turnNumber);
	if (state.pokerRewardIds && state.pokerRewardIds.length > 0) {
		parts.push('"pokerRewardIds":' + canonicalValue([...state.pokerRewardIds].sort()));
	}
	if (state.winner !== undefined && state.winner !== null) {
		parts.push('"winner":' + escapeJsonString(state.winner));
	}
	return '{' + parts.sort().join(',') + '}';
}
