import { canonicalStringify } from '@shared/protocol-core/hash';

import type {
	PlayerCombatState,
	PokerCard,
	PokerCombatState,
} from '../types/PokerCombatTypes';

type CanonicalRole = 'attacker' | 'defender';

export function canonicalPokerCard(card: PokerCard): readonly [string, string, number] {
	return [card.suit, card.value, card.numericValue];
}

function canonicalRoleForViewerSlot(
	viewerSlot: 'player' | 'opponent',
	playerRole: CanonicalRole,
): CanonicalRole {
	if (viewerSlot === 'player') return playerRole;
	return playerRole === 'attacker' ? 'defender' : 'attacker';
}

function canonicalPlayer(player: PlayerCombatState) {
	return {
		playerId: player.playerId,
		pet: {
			id: player.pet.id,
			rarity: player.pet.rarity,
			petClass: player.pet.petClass,
			stats: {
				maxHealth: player.pet.stats.maxHealth,
				currentHealth: player.pet.stats.currentHealth,
				maxStamina: player.pet.stats.maxStamina,
				currentStamina: player.pet.stats.currentStamina,
				attack: player.pet.stats.attack,
				level: player.pet.stats.level,
				element: player.pet.stats.element,
			},
			abilities: player.pet.abilities.map((ability) => ({
				id: ability.id,
				type: ability.type,
				staminaCost: ability.staminaCost ?? null,
				rageCost: ability.rageCost ?? null,
				cooldown: ability.cooldown ?? null,
				currentCooldown: ability.currentCooldown ?? null,
				effect: ability.effect,
			})).sort((left, right) => left.id.localeCompare(right.id)),
			equippedSpells: [...player.pet.equippedSpells].sort(),
		},
		holeCards: player.holeCards.map(canonicalPokerCard),
		currentAction: player.currentAction ?? null,
		hpCommitted: player.hpCommitted,
		preBlindHealth: player.preBlindHealth,
		heroArmor: player.heroArmor,
		statusEffects: player.statusEffects.map((effect) => ({
			type: effect.type,
			duration: effect.duration,
			value: effect.value ?? null,
			sourceId: effect.sourceId,
		})).sort((left, right) => canonicalStringify(left).localeCompare(canonicalStringify(right))),
		mana: player.mana,
		maxMana: player.maxMana,
		isReady: player.isReady,
		elementBuff: player.elementBuff ?? null,
	};
}

/** Remove viewer-relative poker slots and wall-clock/presentation fields. */
export function canonicalizePokerCombatState(state: PokerCombatState | null): unknown {
	if (!state) return null;
	const playerRole = state.deterministicPlayerRole;
	if (!playerRole || !state.deterministicDeckSeed) return null;
	const opponentRole: CanonicalRole = playerRole === 'attacker' ? 'defender' : 'attacker';
	const participants = playerRole === 'attacker'
		? { attacker: canonicalPlayer(state.player), defender: canonicalPlayer(state.opponent) }
		: { attacker: canonicalPlayer(state.opponent), defender: canonicalPlayer(state.player) };
	const winner = state.winner && state.winner !== 'draw'
		? canonicalRoleForViewerSlot(state.winner, playerRole)
		: state.winner ?? null;
	const foldWinner = state.foldWinner
		? canonicalRoleForViewerSlot(state.foldWinner, playerRole)
		: null;
	const activeRole = state.activePlayerId === null
		? null
		: state.activePlayerId === state.player.playerId
			? playerRole
			: state.activePlayerId === state.opponent.playerId
				? opponentRole
				: 'unknown';

	return {
		combatId: state.combatId,
		phase: state.phase,
		participants,
		communityCards: {
			faith: state.communityCards.faith.map(canonicalPokerCard),
			foresight: state.communityCards.foresight ? canonicalPokerCard(state.communityCards.foresight) : null,
			destiny: state.communityCards.destiny ? canonicalPokerCard(state.communityCards.destiny) : null,
		},
		currentBet: state.currentBet,
		pot: state.pot,
		turnId: state.turnId,
		actionHistory: state.actionHistory.map((action) => ({
			action: action.action,
			hpCommitment: action.hpCommitment ?? null,
		})),
		winner,
		minBet: state.minBet,
		opener: state.openerIsPlayer ? playerRole : opponentRole,
		preflopBetMade: state.preflopBetMade,
		foldWinner,
		activeRole,
		actionsThisRound: state.actionsThisRound,
		blindConfig: state.blindConfig,
		positions: {
			[playerRole]: state.playerPosition,
			[opponentRole]: state.opponentPosition,
		},
		blindsPosted: state.blindsPosted,
		isAllInShowdown: state.isAllInShowdown,
		firstStrike: state.firstStrike
			? {
				damage: state.firstStrike.damage,
				target: canonicalRoleForViewerSlot(state.firstStrike.target, playerRole),
				completed: state.firstStrike.completed,
			}
			: null,
		deterministicDeckSeed: state.deterministicDeckSeed,
	};
}
