import { hasKeyword } from './keywordUtils';

/**
 * Determines if a minion card needs the player to choose a board position.
 * Returns true for cards with adjacent/positional mechanics:
 * - Magnetic (Runic Bond): can attach to Automaton OR place at specific position
 * - Cleave: attacks hit adjacent enemies, so board position matters
 * - buff_adjacent battlecry: buffs neighbors on play
 */
export function needsPositionChoice(card: any): boolean {
	if (!card) return false;

	const cardData = card.card || card;
	if (cardData.type !== 'minion') return false;

	if (hasKeyword(card, 'magnetic')) return true;
	if (hasKeyword(card, 'cleave')) return true;

	const battlecry = cardData.battlecry;
	if (battlecry?.type === 'buff_adjacent') return true;
	if (battlecry?.targetType === 'adjacent_minions') return true;

	return false;
}
