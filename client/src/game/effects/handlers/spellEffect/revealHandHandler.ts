/**
 * Reveal Hand Handler
 *
 * Reveals the opponent's hand to the current player.
 * Optionally copies a random card from the revealed hand.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';

export default function executeRevealHand(
	context: GameContext,
	effect: SpellEffect,
	sourceCard: Card
): EffectResult {
	try {
		context.logGameEvent(`Executing spellEffect:reveal_hand for ${sourceCard.name}`);

		const opponentHand = context.opponentPlayer.hand || [];

		if (opponentHand.length === 0) {
			context.logGameEvent('Opponent hand is empty — nothing to reveal');
			return { success: true, additionalData: { revealed: 0 } };
		}

		const cardNames = opponentHand.map((c: any) => c.card?.name || c.name || 'Unknown');
		context.logGameEvent(`Revealed opponent's hand: ${cardNames.join(', ')}`);

		const copyCount = (effect as any).copyCount || 0;
		const copiedCards: any[] = [];
		if (copyCount > 0 && opponentHand.length > 0) {
			for (let i = 0; i < copyCount && i < opponentHand.length; i++) {
				if (context.currentPlayer.hand.length >= MAX_HAND_SIZE) {
					context.logGameEvent('Hand full — cannot copy more cards');
					break;
				}
				const randomIdx = Math.floor(Math.random() * opponentHand.length);
				const cardToCopy = opponentHand[randomIdx];
				const cardData = cardToCopy.card || cardToCopy;

				const copyInstance: any = {
					instanceId: `reveal-copy-${Date.now()}-${i}`,
					card: { ...cardData },
					canAttack: false,
					isPlayed: false,
					isSummoningSick: false,
					attacksPerformed: 0,
				};

				context.currentPlayer.hand.push(copyInstance);
				copiedCards.push(cardData.name || 'Unknown');
				context.logGameEvent(`Copied ${cardData.name} from opponent's hand`);
			}
		}

		return {
			success: true,
			additionalData: {
				revealed: opponentHand.length,
				copiedCards
			}
		};
	} catch (error) {
		debug.error('Error executing spellEffect:reveal_hand:', error);
		return {
			success: false,
			error: `Error executing spellEffect:reveal_hand: ${error instanceof Error ? error.message : String(error)}`
		};
	}
}
