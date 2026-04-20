/**
 * Summon Effect Handler
 *
 * This handler implements the spellEffect:summon effect.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { getCardById } from '../../../data/cardManagement/cardRegistry';
import { isMinion, getHealth } from '../../../utils/cards/typeGuards';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';

export default function executeSummonSummon(
	context: GameContext,
	effect: SpellEffect,
	sourceCard: Card
): EffectResult {
	try {
		context.logGameEvent(`Executing spellEffect:summon for ${sourceCard.name}`);

		const summonCardId = effect.summonCardId;
		const count = effect.count || effect.value || 1;

		if (!summonCardId) {
			context.logGameEvent(`No summonCardId specified for summon effect`);
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

		let summoned = 0;

		for (let i = 0; i < count; i++) {
			if (context.currentPlayer.board.length >= MAX_BATTLEFIELD_SIZE) {
				context.logGameEvent(`Board is full, cannot summon more minions`);
				break;
			}

			const minionHealth = getHealth(cardToSummon);
			const summonedMinion: any = {
				instanceId: `summon-${summonCardId}-${Date.now()}-${i}`,
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
				summonedMinion.isTaunt = true;
			}
			if (cardToSummon.keywords?.includes('divine_shield')) {
				summonedMinion.hasDivineShield = true;
			}
			if (cardToSummon.keywords?.includes('rush')) {
				summonedMinion.hasRush = true;
				summonedMinion.canAttack = true;
			}
			if (cardToSummon.keywords?.includes('charge')) {
				summonedMinion.hasCharge = true;
				summonedMinion.canAttack = true;
				summonedMinion.isSummoningSick = false;
			}

			context.currentPlayer.board.push(summonedMinion);
			summoned++;
			context.logGameEvent(`Summoned ${cardToSummon.name} to the battlefield`);
		}

		return {
			success: true,
			additionalData: { summoned }
		};
	} catch (error) {
		debug.error(`Error executing spellEffect:summon:`, error);
		return {
			success: false,
			error: `Error executing spellEffect:summon: ${error instanceof Error ? error.message : String(error)}`
		};
	}
}
