/**
 * UI presentation tokens per rarity tier.
 *
 * The keys mirror the canonical rarity set in `shared/schemas/rarity.ts`.
 * Adding a new tier means: (1) declaring it in `RARITY_TABLE` over there,
 * and (2) adding one entry here. TypeScript will mark missing entries as
 * compile errors via the `Record<Rarity, ...>` type.
 */
import type { Rarity } from '@shared/schemas/rarity';
import { tryAdaptRarity } from '@shared/schemas/rarity';

interface RarityUi {
	color: string;
	border: string;
	glow: string;
	background: string;
	bgColor: string;
}

const RARITY_UI: Record<Rarity, RarityUi> = {
	common: {
		color:      'text-gray-300',
		border:     'border-gray-500',
		glow:       'shadow-[0_0_30px_rgba(255,255,255,0.5)]',
		background: 'bg-linear-to-br from-gray-700 to-gray-800',
		bgColor:    'bg-gray-600/30',
	},
	rare: {
		color:      'text-blue-400',
		border:     'border-blue-500',
		glow:       'shadow-[0_0_40px_rgba(59,130,246,0.8)]',
		background: 'bg-linear-to-br from-blue-800 to-blue-900',
		bgColor:    'bg-blue-600/30',
	},
	epic: {
		color:      'text-purple-400',
		border:     'border-purple-500',
		glow:       'shadow-[0_0_50px_rgba(147,51,234,0.9)]',
		background: 'bg-linear-to-br from-purple-800 to-purple-900',
		bgColor:    'bg-purple-600/30',
	},
	mythic: {
		color:      'text-transparent bg-clip-text bg-linear-to-r from-pink-500 via-purple-500 to-cyan-500',
		border:     'border-pink-500',
		glow:       'shadow-[0_0_80px_rgba(236,72,153,1),0_0_120px_rgba(139,92,246,0.8)]',
		background: 'bg-linear-to-br from-pink-800 via-purple-800 to-cyan-800',
		bgColor:    'bg-linear-to-r from-pink-600/30 via-purple-600/30 to-cyan-600/30',
	},
};

const FALLBACK: RarityUi = RARITY_UI.common;

const resolve = (input: string): RarityUi => {
	const canon = tryAdaptRarity(input);
	return canon ? RARITY_UI[canon] : FALLBACK;
};

export const getRarityColor      = (r: string): string => resolve(r).color;
export const getRarityBorder     = (r: string): string => resolve(r).border;
export const getRarityGlow       = (r: string): string => resolve(r).glow;
export const getRarityBackground = (r: string): string => resolve(r).background;
export const getRarityBgColor    = (r: string): string => resolve(r).bgColor;

export function getTypeIcon(type: string): string {
	switch (type) {
		case 'minion': return '⚔️';
		case 'spell':  return '✨';
		case 'weapon': return '🗡️';
		case 'hero':   return '👑';
		default:       return '📜';
	}
}
