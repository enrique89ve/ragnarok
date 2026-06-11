/**
 * Poker card visual helpers.
 *
 * Rune + symbol + color tables for the four norse suits. Single source
 * of truth — `PlayingCard.tsx` had these inline, the new
 * `<CardRankSuit>` slot reads from here. Trivial pure functions, no
 * React, no DOM.
 */

export type NorseSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export const NORSE_SUITS: readonly NorseSuit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export const NORSE_RUNE: Record<NorseSuit, string> = {
	spades:   'ᛏ',
	hearts:   'ᛉ',
	diamonds: 'ᛟ',
	clubs:    'ᚦ',
};

export const NORSE_SYMBOL: Record<NorseSuit, string> = {
	spades:   '⚔',
	hearts:   '❂',
	diamonds: '◆',
	clubs:    '⚒',
};

export const SUIT_COLOR: Record<NorseSuit, string> = {
	spades:   '#2d4a3d',
	hearts:   '#8b3a3a',
	diamonds: '#5c4a2a',
	clubs:    '#3a4a5c',
};

export function isFaceCard(value: string): boolean {
	return ['K', 'Q', 'J', 'A'].includes(value);
}
