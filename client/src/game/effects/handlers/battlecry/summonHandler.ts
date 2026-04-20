/**
 * Summon Effect Handler
 *
 * This handler implements the battlecry:summon effect.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { getCardById } from '../../../data/cardManagement/cardRegistry';
import { isMinion, getHealth } from '../../../utils/cards/typeGuards';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';

export default function executeSummonSummon(
	context: GameContext,
	effect: BattlecryEffect,
	sourceCard: Card
): EffectResult {
	try {
		context.logGameEvent(`Executing battlecry:summon for ${sourceCard.name}`);

		const summonCardId = effect.summonCardId;
		const count = effect.summonCount || effect.count || 1;
		const summonForOpponent = effect.summonForOpponent || false;
		const adjacent = effect.adjacent === true;

		if (!summonCardId) {
			context.logGameEvent(`Summon failed: No summonCardId specified`);
			return { success: false, error: 'No summonCardId specified' };
		}

		const cardToSummon = getCardById(Number(summonCardId));
		if (!cardToSummon) {
			context.logGameEvent(`Card with ID ${summonCardId} not found`);
			return { success: false, error: `Card with ID ${summonCardId} not found` };
		}

		if (!isMinion(cardToSummon)) {
			context.logGameEvent(`Card with ID ${summonCardId} is not a minion`);
			return { success: false, error: `Card with ID ${summonCardId} is not a minion` };
		}

		const board = summonForOpponent ? context.opponentPlayer.board : context.currentPlayer.board;

		if (board.length >= MAX_BATTLEFIELD_SIZE) {
			context.logGameEvent(`Summon failed: Board is full`);
			return { success: false, error: 'Board is full' };
		}

		const availableSpaces = MAX_BATTLEFIELD_SIZE - board.length;
		const actualCount = Math.min(count, availableSpaces);

		let summonPosition = board.length;
		if (adjacent && !summonForOpponent) {
			const sourcePosition = context.currentPlayer.board.findIndex(
				minion => minion.card.id === sourceCard.id
			);
			if (sourcePosition >= 0) {
				summonPosition = sourcePosition + 1;
			}
		}

		const summonedCards: any[] = [];

		for (let i = 0; i < actualCount; i++) {
			if (board.length >= MAX_BATTLEFIELD_SIZE) break;

			const minionHealth = getHealth(cardToSummon);
			const summonedInstance: any = {
				instanceId: `summoned-${Date.now()}-${i}`,
				card: cardToSummon,
				currentHealth: minionHealth,
				maxHealth: minionHealth,
				canAttack: false,
				isPlayed: true,
				isSummoningSick: true,
				attacksPerformed: 0,
				hasDivineShield: false,
				isFrozen: false,
				isSilenced: false,
			};

			if (cardToSummon.keywords?.includes('taunt')) {
				summonedInstance.isTaunt = true;
			}
			if (cardToSummon.keywords?.includes('divine_shield')) {
				summonedInstance.hasDivineShield = true;
			}
			if (cardToSummon.keywords?.includes('rush')) {
				summonedInstance.hasRush = true;
				summonedInstance.canAttack = true;
			}
			if (cardToSummon.keywords?.includes('charge')) {
				summonedInstance.hasCharge = true;
				summonedInstance.canAttack = true;
				summonedInstance.isSummoningSick = false;
			}

			if (adjacent && !summonForOpponent) {
				board.splice(summonPosition + i, 0, summonedInstance);
			} else {
				board.push(summonedInstance);
			}

			summonedCards.push(summonedInstance);
			context.logGameEvent(`Summoned ${cardToSummon.name} to the battlefield`);
		}

		return {
			success: true,
			additionalData: {
				summonedCount: summonedCards.length,
				summonedCards
			}
		};
	} catch (error) {
		debug.error(`Error executing battlecry:summon:`, error);
		return {
			success: false,
			error: `Error executing battlecry:summon: ${error instanceof Error ? error.message : String(error)}`
		};
	}
}
