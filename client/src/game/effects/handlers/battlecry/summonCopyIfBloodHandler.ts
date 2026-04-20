/**
 * Summon Copy If Blood Price Paid Handler
 *
 * Summons a copy of the source card if the Blood Price was paid with health.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { getHealth } from '../../../utils/cards/typeGuards';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';

export default function executeSummonCopyIfBlood(
	context: GameContext,
	effect: BattlecryEffect,
	sourceCard: Card
): EffectResult {
	try {
		context.logGameEvent(`Executing battlecry:summon_copy_if_blood for ${sourceCard.name}`);

		const bloodPricePaid = effect.condition === 'blood_price_paid'
			? (context.currentPlayer as any).lastCardPaidWithBlood === true
			: true;

		if (!bloodPricePaid) {
			context.logGameEvent('Blood Price was not paid — no copy summoned');
			return { success: true, additionalData: { copied: false } };
		}

		const board = context.currentPlayer.board;
		if (board.length >= MAX_BATTLEFIELD_SIZE) {
			context.logGameEvent('Board is full — cannot summon copy');
			return { success: false, error: 'Board is full' };
		}

		const minionHealth = getHealth(sourceCard);
		const copy: any = {
			instanceId: `blood-copy-${Date.now()}`,
			card: { ...sourceCard },
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

		if (sourceCard.keywords?.includes('taunt')) copy.isTaunt = true;
		if (sourceCard.keywords?.includes('divine_shield')) copy.hasDivineShield = true;
		if (sourceCard.keywords?.includes('rush')) {
			copy.hasRush = true;
			copy.canAttack = true;
		}
		if (sourceCard.keywords?.includes('charge')) {
			copy.hasCharge = true;
			copy.canAttack = true;
			copy.isSummoningSick = false;
		}

		board.push(copy);
		context.logGameEvent(`Summoned a copy of ${sourceCard.name} (Blood Price paid)`);

		return { success: true, additionalData: { copied: true } };
	} catch (error) {
		debug.error('Error executing battlecry:summon_copy_if_blood:', error);
		return {
			success: false,
			error: `Error executing battlecry:summon_copy_if_blood: ${error instanceof Error ? error.message : String(error)}`
		};
	}
}
