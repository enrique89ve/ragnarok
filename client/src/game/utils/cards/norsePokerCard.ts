/**
 * Poker card visual helpers.
 *
 * Rune + symbol + color tables and the classic pip grid for the four
 * Norse suits. `<CardRankSuit>` is the only renderer.
 */

export type NorseSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export type PokerPip = {
	readonly x: number;
	readonly y: number;
	readonly flip?: boolean;
};

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
	spades:   '#1a2a22',
	hearts:   '#a31d1d',
	diamonds: '#6b440e',
	clubs:    '#1e2937',
};

export const NORSE_SUIT_FAQ: Record<NorseSuit, {
	readonly name: string;
	readonly runeName: string;
	readonly description: string;
}> = {
	spades: {
		name: 'Swords',
		runeName: 'Tiwaz',
		description: 'Poker suit, same as Spades.',
	},
	hearts: {
		name: 'Suns',
		runeName: 'Algiz',
		description: 'Poker suit, same as Hearts.',
	},
	diamonds: {
		name: 'Othala',
		runeName: 'Othala',
		description: 'Poker suit, same as Diamonds.',
	},
	clubs: {
		name: 'Hammers',
		runeName: 'Thurisaz',
		description: 'Poker suit, same as Clubs.',
	},
};

const L = 28;
const R = 72;
const C = 50;
const T = 14;
const UM = 32;
const M = 50;
const LM = 68;
const B = 86;

const pair = (y: number, flip?: boolean): readonly PokerPip[] => [
	{ x: L, y, flip },
	{ x: R, y, flip },
];

export const POKER_PIP_LAYOUT: Record<string, readonly PokerPip[]> = {
	A: [{ x: C, y: M }],
	'2': [{ x: C, y: T }, { x: C, y: B, flip: true }],
	'3': [{ x: C, y: T }, { x: C, y: M }, { x: C, y: B, flip: true }],
	'4': [...pair(T), ...pair(B, true)],
	'5': [...pair(T), { x: C, y: M }, ...pair(B, true)],
	'6': [...pair(T), ...pair(M), ...pair(B, true)],
	'7': [...pair(T), { x: C, y: UM }, ...pair(M), ...pair(B, true)],
	'8': [...pair(T), { x: C, y: UM }, ...pair(M), { x: C, y: LM, flip: true }, ...pair(B, true)],
	'9': [...pair(T), ...pair(UM), { x: C, y: M }, ...pair(LM, true), ...pair(B, true)],
	'10': [
		...pair(T),
		{ x: C, y: 23 },
		...pair(UM),
		...pair(LM, true),
		{ x: C, y: 77, flip: true },
		...pair(B, true),
	],
};

export function isFaceCard(value: string): boolean {
	return ['K', 'Q', 'J', 'A'].includes(value);
}

export function isCourtCard(value: string): boolean {
	return ['K', 'Q', 'J'].includes(value);
}

export function pipsForRank(value: string): readonly PokerPip[] | null {
	return POKER_PIP_LAYOUT[value] ?? null;
}
