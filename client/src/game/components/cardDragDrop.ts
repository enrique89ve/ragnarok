import type { Position } from '../types/Position';

export interface DropRect {
	readonly left: number;
	readonly right: number;
	readonly top: number;
	readonly bottom: number;
}

export type CardMagicCursor = 'neutral' | 'arcane' | 'ember' | 'frost' | 'verdant';

const CURSOR_KEYWORDS: Readonly<Record<Exclude<CardMagicCursor, 'neutral'>, readonly string[]>> = {
	arcane: ['choose_one', 'discover', 'fateweave', 'poker_spell', 'prophecy', 'quest', 'secret', 'spellburst'],
	ember: ['blood_echo', 'blood_price', 'charge', 'cleave', 'frenzy', 'overkill', 'rush', 'spell_damage'],
	frost: ['divine_shield', 'freeze', 'freeze_on_damage', 'frozen', 'taunt'],
	verdant: ['aura', 'lifesteal', 'magnetic', 'poisonous', 'reborn', 'recruit', 'windfury'],
};

export function resolveCardMagicCursor(keywords: readonly string[] | undefined): CardMagicCursor {
	const normalizedKeywords = new Set((keywords ?? []).map(keyword => keyword.trim().toLowerCase()));
	const priority: readonly Exclude<CardMagicCursor, 'neutral'>[] = ['arcane', 'ember', 'frost', 'verdant'];

	return priority.find(cursor => CURSOR_KEYWORDS[cursor].some(keyword => normalizedKeywords.has(keyword))) ?? 'neutral';
}

export function isPointInsideDropRect(position: Position, rect: DropRect): boolean {
	return position.x >= rect.left && position.x <= rect.right && position.y >= rect.top && position.y <= rect.bottom;
}

export function toCanvasDragOffset(screenOffset: Position, scale: Position): Position {
	return {
		x: screenOffset.x / (scale.x > 0 ? scale.x : 1),
		y: screenOffset.y / (scale.y > 0 ? scale.y : 1),
	};
}
