import type { CardInstance, GameState, Player } from '../../types';
import { MAX_HAND_SIZE } from '../../constants/gameConstants';
import { createCardInstance } from '../../utils/cards/cardUtils';
import { withCardsIdGen } from '../../utils/cardsCommandRng';
import { cryptoIdGen } from '../../utils/seededRng';
import {
	appliedGameCommand,
	ignoredGameCommand,
	rejectedGameCommand,
	type ApplyGameCommandResult,
} from './gameCommandResult';
import type { GrantPokerHandRewardsCommand } from './gameCommandTypes';

const MAX_MANA = 10;

export function applyPokerHandRewards(
	state: GameState,
	command: GrantPokerHandRewardsCommand,
	idGen: () => string = cryptoIdGen,
): ApplyGameCommandResult {
	return withCardsIdGen(idGen, () => applyPokerHandRewardsInScope(state, command));
}

function applyPokerHandRewardsInScope(
	state: GameState,
	command: GrantPokerHandRewardsCommand,
): ApplyGameCommandResult {
	const invalidReason = validateRewardCommand(command);
	if (invalidReason) return rejectedGameCommand(state, invalidReason);
	if (state.mulligan?.active) return rejectedGameCommand(state, 'card game mulligan still active');
	if (state.pokerRewardIds?.includes(command.rewardId)) {
		return ignoredGameCommand(state, 'poker reward already applied');
	}

	const player = applyPlayerReward(state.players.player, command.wagerDrawPlayer);
	const opponent = applyPlayerReward(state.players.opponent, command.wagerDrawOpponent);
	const playerWithWagers = applyRewardBattlefield(player, command.wagerAoeDamageOpponent, command.allInShowdown);
	const opponentWithWagers = applyRewardBattlefield(opponent, command.wagerAoeDamagePlayer, command.allInShowdown);
	const pokerRewardIds = [...(state.pokerRewardIds ?? []), command.rewardId];

	return appliedGameCommand({
		...state,
		pokerRewardIds,
		players: {
			...state.players,
			player: playerWithWagers,
			opponent: opponentWithWagers,
		},
	}, [{ type: 'play_sound', sound: 'card_draw' }]);
}

function validateRewardCommand(command: GrantPokerHandRewardsCommand): string | null {
	if (command.combatId.length === 0 || command.rewardId.length === 0) return 'invalid poker reward identity';
	if (!Number.isSafeInteger(command.handIndex) || command.handIndex < 0) return 'invalid poker reward hand index';
	const counts = [
		command.wagerDrawPlayer,
		command.wagerDrawOpponent,
		command.wagerAoeDamagePlayer,
		command.wagerAoeDamageOpponent,
	];
	if (counts.some(value => !Number.isSafeInteger(value) || value < 0)) return 'invalid poker reward values';
	return null;
}

function applyPlayerReward(player: Player, wagerDrawCount: number): Player {
	const hand = [...player.hand];
	const deck = [...player.deck];
	for (let index = 0; index < 1 + wagerDrawCount; index += 1) {
		if (deck.length === 0 || hand.length >= MAX_HAND_SIZE) break;
		const drawnCard = deck.pop();
		if (!drawnCard) break;
		hand.push(createCardInstance(drawnCard, 'poker-reward-card'));
	}

	const overloaded = player.mana.overloaded || 0;
	const max = Math.min(player.mana.max + 1, MAX_MANA);
	return {
		...player,
		hand,
		deck,
		mana: {
			...player.mana,
			max,
			current: Math.max(0, max - overloaded),
			overloaded,
			pendingOverload: player.mana.pendingOverload || 0,
		},
		battlefield: clearSummoningSickness(player.battlefield),
	};
}

function applyRewardBattlefield(player: Player, aoeDamage: number, allInShowdown: boolean): Player {
	const battlefield = allInShowdown ? applyAllInBuff(player.battlefield) : [...player.battlefield];
	return {
		...player,
		battlefield: applyAoeDamage(battlefield, aoeDamage),
	};
}

function applyAoeDamage(battlefield: readonly CardInstance[], amount: number): CardInstance[] {
	if (amount <= 0) return [...battlefield];
	return battlefield.map(card => ({
		...card,
		currentHealth: Math.max(0, (card.currentHealth ?? cardHealth(card)) - amount),
	}));
}

function applyAllInBuff(battlefield: readonly CardInstance[]): CardInstance[] {
	return battlefield.map(card => {
		if (card.card.type !== 'minion' || card.card.wagerEffect?.type !== 'all_in_buff_minions') return card;
		const bonus = card.card.wagerEffect.buffAttack || 0;
		return bonus > 0
			? { ...card, currentAttack: (card.currentAttack ?? card.card.attack ?? 0) + bonus }
			: card;
	});
}

function clearSummoningSickness(battlefield: readonly CardInstance[]): CardInstance[] {
	return battlefield.map(card => card.isSummoningSick
		? { ...card, isSummoningSick: false, canAttack: !card.isFrozen, attacksPerformed: 0 }
		: { ...card, attacksPerformed: 0 });
}

function cardHealth(card: CardInstance): number {
	return card.card.type === 'minion' ? card.card.health ?? 0 : 0;
}
