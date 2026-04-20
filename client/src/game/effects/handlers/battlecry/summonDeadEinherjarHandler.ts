/**
 * Summon Dead Einherjar Handler
 *
 * Resummons all friendly minions with the 'einherjar' keyword
 * that have died this game.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { getHealth } from '../../../utils/cards/typeGuards';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';
import { hasKeyword } from '../../../utils/cards/keywordUtils';

export default function executeSummonDeadEinherjar(
	context: GameContext,
	effect: BattlecryEffect,
	sourceCard: Card
): EffectResult {
	try {
		context.logGameEvent(`Executing battlecry:summon_dead_einherjar for ${sourceCard.name}`);

		const graveyard = context.currentPlayer.graveyard || [];
		const deadEinherjar = graveyard.filter(
			(instance: any) => hasKeyword(instance, 'einherjar') && instance.card?.type === 'minion'
		);

		if (deadEinherjar.length === 0) {
			context.logGameEvent('No dead Einherjar found in graveyard');
			return { success: true, additionalData: { summonedCount: 0 } };
		}

		const board = context.currentPlayer.board;
		const availableSpaces = MAX_BATTLEFIELD_SIZE - board.length;
		const toSummon = deadEinherjar.slice(0, availableSpaces);

		const summoned: any[] = [];
		for (let i = 0; i < toSummon.length; i++) {
			if (board.length >= MAX_BATTLEFIELD_SIZE) break;

			const graveyardInstance = toSummon[i] as any;
			const cardData = graveyardInstance.card || graveyardInstance;
			const minionHealth = getHealth(cardData);
			const instance: any = {
				instanceId: `einherjar-resummon-${Date.now()}-${i}`,
				card: cardData,
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

			if (cardData.keywords?.includes('taunt')) instance.isTaunt = true;
			if (cardData.keywords?.includes('divine_shield')) instance.hasDivineShield = true;
			if (cardData.keywords?.includes('rush')) {
				instance.hasRush = true;
				instance.canAttack = true;
			}
			if (cardData.keywords?.includes('charge')) {
				instance.hasCharge = true;
				instance.canAttack = true;
				instance.isSummoningSick = false;
			}

			board.push(instance);
			summoned.push(instance);
			context.logGameEvent(`Resummoned ${cardData.name} from the graveyard`);
		}

		return { success: true, additionalData: { summonedCount: summoned.length } };
	} catch (error) {
		debug.error('Error executing battlecry:summon_dead_einherjar:', error);
		return {
			success: false,
			error: `Error executing battlecry:summon_dead_einherjar: ${error instanceof Error ? error.message : String(error)}`
		};
	}
}
