/**
 * Gain Armor Handler
 *
 * Grants the current player armor equal to effect.value.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeGainArmor(
	context: GameContext,
	effect: BattlecryEffect,
	sourceCard: Card
): EffectResult {
	try {
		context.logGameEvent(`Executing battlecry:gain_armor for ${sourceCard.name}`);

		const armorValue = effect.value || 0;
		if (armorValue <= 0) {
			return { success: false, error: 'No armor value specified' };
		}

		const player = context.currentPlayer;
		player.armor += armorValue;

		context.logGameEvent(`${sourceCard.name} granted ${armorValue} armor`);
		return { success: true, additionalData: { armorGained: armorValue } };
	} catch (error) {
		debug.error('Error executing battlecry:gain_armor:', error);
		return {
			success: false,
			error: `Error executing battlecry:gain_armor: ${error instanceof Error ? error.message : String(error)}`
		};
	}
}
