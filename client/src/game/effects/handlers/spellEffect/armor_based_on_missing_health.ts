/**
 * Armor Based On Missing Health Effect Handler
 * Grants armor equal to the hero's missing health.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeArmorBasedOnMissingHealth(
	context: GameContext,
	effect: SpellEffect,
	sourceCard: Card
): EffectResult {
	try {
		const hero = context.currentPlayer.hero;
		const maxHealth = hero.card.health ?? 100;
		const currentHealth = hero.currentHealth ?? maxHealth;
		const missingHealth = Math.max(0, maxHealth - currentHealth);

		const multiplier = (effect as any).multiplier ?? 1;
		const armorGain = Math.floor(missingHealth * multiplier);

		if (armorGain > 0) {
			context.currentPlayer.armor = (context.currentPlayer.armor || 0) + armorGain;
			context.logGameEvent(`${sourceCard.name} grants ${armorGain} armor (${missingHealth} missing health).`);
		} else {
			context.logGameEvent(`${sourceCard.name} grants no armor — hero is at full health.`);
		}

		return { success: true };
	} catch (error) {
		debug.error('Error executing armor_based_on_missing_health:', error);
		return {
			success: false,
			error: `Error executing armor_based_on_missing_health: ${error instanceof Error ? error.message : String(error)}`
		};
	}
}
