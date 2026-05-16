/**
 * UI presentation tokens per rarity tier.
 *
 * The keys mirror the canonical rarity set in `shared/schemas/rarity.ts`.
 * Adding a new tier means: (1) declaring it in `RARITY_TABLE` over there,
 * and (2) adding one entry here. TypeScript will mark missing entries as
 * compile errors via the `Record<Rarity, ...>` type.
 */
import type { Rarity } from '@shared/schemas/rarity';
import { RARITY_ORDER, tryAdaptRarity } from '@shared/schemas/rarity';

export interface RarityUi {
	key: Rarity;
	label: string;
	cssColor: string;
	cssBright: string;
	cssGlow: string;
	color: string;
	border: string;
	glow: string;
	background: string;
	bgColor: string;
}

export const RARITY_UI: Record<Rarity, RarityUi> = {
	common: {
		key:        'common',
		label:      'Common',
		cssColor:   'var(--rarity-common-color)',
		cssBright:  'var(--rarity-common-bright)',
		cssGlow:    'var(--rarity-common-glow)',
		color:      'text-[var(--rarity-common-bright)]',
		border:     'border-[var(--rarity-common-color)]',
		glow:       'shadow-[0_0_30px_var(--rarity-common-glow)]',
		background: 'bg-[color-mix(in_srgb,var(--rarity-common-deep)_70%,var(--obsidian-900))]',
		bgColor:    'bg-[color-mix(in_srgb,var(--rarity-common-color)_18%,transparent)]',
	},
	rare: {
		key:        'rare',
		label:      'Rare',
		cssColor:   'var(--rarity-rare-color)',
		cssBright:  'var(--rarity-rare-bright)',
		cssGlow:    'var(--rarity-rare-glow)',
		color:      'text-[var(--rarity-rare-bright)]',
		border:     'border-[var(--rarity-rare-color)]',
		glow:       'shadow-[0_0_40px_var(--rarity-rare-glow)]',
		background: 'bg-[color-mix(in_srgb,var(--rarity-rare-deep)_70%,var(--obsidian-900))]',
		bgColor:    'bg-[color-mix(in_srgb,var(--rarity-rare-color)_22%,transparent)]',
	},
	epic: {
		key:        'epic',
		label:      'Epic',
		cssColor:   'var(--rarity-epic-color)',
		cssBright:  'var(--rarity-epic-bright)',
		cssGlow:    'var(--rarity-epic-glow)',
		color:      'text-[var(--rarity-epic-bright)]',
		border:     'border-[var(--rarity-epic-color)]',
		glow:       'shadow-[0_0_50px_var(--rarity-epic-glow)]',
		background: 'bg-[color-mix(in_srgb,var(--rarity-epic-deep)_70%,var(--obsidian-900))]',
		bgColor:    'bg-[color-mix(in_srgb,var(--rarity-epic-color)_24%,transparent)]',
	},
	mythic: {
		key:        'mythic',
		label:      'Mythic',
		cssColor:   'var(--rarity-mythic-color)',
		cssBright:  'var(--rarity-mythic-bright)',
		cssGlow:    'var(--rarity-mythic-glow)',
		color:      'text-[var(--rarity-mythic-bright)]',
		border:     'border-[var(--rarity-mythic-color)]',
		glow:       'shadow-[0_0_64px_var(--rarity-mythic-glow)]',
		background: 'bg-[color-mix(in_srgb,var(--rarity-mythic-deep)_72%,var(--obsidian-900))]',
		bgColor:    'bg-[color-mix(in_srgb,var(--rarity-mythic-color)_26%,transparent)]',
	},
};

const FALLBACK: RarityUi = RARITY_UI.common;

export const normalizeRarityKey = (input?: string | null): Rarity => {
	if (!input) return 'common';
	const canon = tryAdaptRarity(input);
	return canon ?? 'common';
};

export const getRarityUi = (input?: string | null): RarityUi => {
	const canon = normalizeRarityKey(input);
	return RARITY_UI[canon] ?? FALLBACK;
};

export const getRarityColor      = (r: string): string => getRarityUi(r).color;
export const getRarityBorder     = (r: string): string => getRarityUi(r).border;
export const getRarityGlow       = (r: string): string => getRarityUi(r).glow;
export const getRarityBackground = (r: string): string => getRarityUi(r).background;
export const getRarityBgColor    = (r: string): string => getRarityUi(r).bgColor;
export const getRarityCssColor   = (r: string): string => getRarityUi(r).cssColor;
export const getRarityCssBright  = (r: string): string => getRarityUi(r).cssBright;
export const getRarityCssGlow    = (r: string): string => getRarityUi(r).cssGlow;
export const getRarityLabel      = (r: string): string => getRarityUi(r).label;
export const getRaritySortRank   = (r: string): number => {
	const canon = normalizeRarityKey(r);
	return -RARITY_ORDER[canon];
};

export function getTypeIcon(type: string): string {
	switch (type) {
		case 'minion': return '⚔️';
		case 'spell':  return '✨';
		case 'weapon': return '🗡️';
		case 'hero':   return '👑';
		default:       return '📜';
	}
}
