/**
 * State serializer — canonical JSON for hashing.
 * Produces deterministic output with sorted keys.
 * Excludes UI-only fields.
 */

import {
	GameState,
	Player,
	CardInstance,
	ManaPool,
	HeroPower,
} from '../types/GameState';
import { escapeJsonString } from '../util/stableStringify';

/**
 * Serialize GameState to canonical JSON string for hashing.
 * Keys are sorted lexicographically. UI-only fields excluded.
 */
export function serializeGameState(state: GameState): string {
	let s = '{';
	s += '"currentTurn":' + state.currentTurn.toString();
	s += ',"gamePhase":' + state.gamePhase.toString();
	s += ',"instanceCounter":' + state.instanceCounter.toString();
	s += ',"opponent":' + serializePlayer(state.opponent);
	s += ',"player":' + serializePlayer(state.player);
	s += ',"rngState":' + state.rngState.toString();
	s += ',"turnNumber":' + state.turnNumber.toString();
	s += ',"winner":' + state.winner.toString();
	s += '}';
	return s;
}

function serializePlayer(p: Player): string {
	let s = '{';
	s += '"attacksPerformedThisTurn":' + p.attacksPerformedThisTurn.toString();
	s += ',"battlefield":' + serializeCardArray(p.battlefield);
	s += ',"cardsPlayedThisTurn":' + p.cardsPlayedThisTurn.toString();
	s += ',"deck":' + serializeDeck(p.deck);
	s += ',"fatigueCounter":' + p.fatigueCounter.toString();
	s += ',"graveyard":' + serializeCardArray(p.graveyard);
	s += ',"hand":' + serializeCardArray(p.hand);
	s += ',"health":' + p.health.toString();
	s += ',"heroArmor":' + p.heroArmor.toString();
	s += ',"heroClass":' + p.heroClass.toString();
	s += ',"heroHealth":' + p.heroHealth.toString();
	s += ',"heroId":' + escapeJsonString(p.heroId);
	s += ',"heroPower":' + serializeHeroPower(p.heroPower);
	s += ',"id":' + p.id.toString();
	s += ',"mana":' + serializeMana(p.mana);
	s += ',"maxHealth":' + p.maxHealth.toString();
	s += ',"name":' + escapeJsonString(p.name);
	s += ',"secrets":' + serializeCardArray(p.secrets);
	s += ',"weapon":' + (p.weapon != null ? serializeCard(p.weapon!) : 'null');
	s += '}';
	return s;
}

function serializeCard(c: CardInstance): string {
	let s = '{';
	s += '"attacksPerformed":' + c.attacksPerformed.toString();
	s += ',"canAttack":' + (c.canAttack ? 'true' : 'false');
	s += ',"cardId":' + c.cardId.toString();
	s += ',"currentAttack":' + c.currentAttack.toString();
	s += ',"currentDurability":' + c.currentDurability.toString();
	s += ',"currentHealth":' + c.currentHealth.toString();
	s += ',"evolutionLevel":' + c.evolutionLevel.toString();
	s += ',"hasAttacked":' + (c.hasAttacked ? 'true' : 'false');
	s += ',"hasCharge":' + (c.hasCharge ? 'true' : 'false');
	s += ',"hasDivineShield":' + (c.hasDivineShield ? 'true' : 'false');
	s += ',"hasLifesteal":' + (c.hasLifesteal ? 'true' : 'false');
	s += ',"hasMegaWindfury":' + (c.hasMegaWindfury ? 'true' : 'false');
	s += ',"hasPoisonous":' + (c.hasPoisonous ? 'true' : 'false');
	s += ',"hasWindfury":' + (c.hasWindfury ? 'true' : 'false');
	s += ',"instanceId":' + escapeJsonString(c.instanceId);
	s += ',"isBleeding":' + (c.isBleeding ? 'true' : 'false');
	s += ',"isFrozen":' + (c.isFrozen ? 'true' : 'false');
	s += ',"isMarked":' + (c.isMarked ? 'true' : 'false');
	s += ',"isParalyzed":' + (c.isParalyzed ? 'true' : 'false');
	s += ',"isPlayerOwned":' + (c.isPlayerOwned ? 'true' : 'false');
	s += ',"isPoisonedDoT":' + (c.isPoisonedDoT ? 'true' : 'false');
	s += ',"isRush":' + (c.isRush ? 'true' : 'false');
	s += ',"isStealth":' + (c.isStealth ? 'true' : 'false');
	s += ',"isSummoningSick":' + (c.isSummoningSick ? 'true' : 'false');
	s += ',"isTaunt":' + (c.isTaunt ? 'true' : 'false');
	s += ',"isVulnerable":' + (c.isVulnerable ? 'true' : 'false');
	s += ',"isWeakened":' + (c.isWeakened ? 'true' : 'false');
	s += ',"maxHealth":' + c.maxHealth.toString();
	s += ',"silenced":' + (c.silenced ? 'true' : 'false');
	s += '}';
	return s;
}

function serializeCardArray(arr: CardInstance[]): string {
	let s = '[';
	for (let i = 0; i < arr.length; i++) {
		if (i > 0) s += ',';
		s += serializeCard(arr[i]);
	}
	s += ']';
	return s;
}

function serializeDeck(deck: i32[]): string {
	let s = '[';
	for (let i = 0; i < deck.length; i++) {
		if (i > 0) s += ',';
		s += deck[i].toString();
	}
	s += ']';
	return s;
}

function serializeMana(m: ManaPool): string {
	let s = '{';
	s += '"current":' + m.current.toString();
	s += ',"max":' + m.max.toString();
	s += ',"overloaded":' + m.overloaded.toString();
	s += ',"pendingOverload":' + m.pendingOverload.toString();
	s += '}';
	return s;
}

function serializeHeroPower(hp: HeroPower): string {
	let s = '{';
	s += '"cost":' + hp.cost.toString();
	s += ',"name":' + escapeJsonString(hp.name);
	s += ',"used":' + (hp.used ? 'true' : 'false');
	s += '}';
	return s;
}
