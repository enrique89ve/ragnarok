import { ELEMENT_BAND } from '../../utils/art/elementBand';
import type { NorseElement } from '../../types/NorseTypes';
import { getRarityLabel } from '../../utils/rarityUtils';
import type { Rarity } from '@shared/schemas/rarity';
import {
	NORSE_SUIT_FAQ,
	type NorseSuit,
} from '../../utils/cards/norsePokerCard';
import { getCardKeywordTooltipText } from './cardKeywordDisplay';

export const CARD_CHROME_FAQ_ATTR = 'data-chrome-faq';

const ELEMENT_MATCHUP: Record<NorseElement, string> = {
	fire: 'Strong against Earth. Weak to Water.',
	water: 'Strong against Fire. Weak to Wind.',
	grass: 'Strong against Wind. Weak to Fire.',
	electric: 'Strong against Water. Weak to Earth.',
	light: 'Strong against Shadow. Weak to Shadow.',
	dark: 'Strong against Holy. Weak to Holy.',
	ice: 'Ice stave. No core cycle bonus.',
	neutral: 'No elemental matchup.',
};

const PET_STAGE_LABEL: Record<number, string> = {
	1: 'I (Basic)',
	2: 'II (Adept)',
	3: 'III (Master)',
};

const PET_STAGE_DETAIL: Record<number, string> = {
	1: 'First form of a pet family.',
	2: 'Mid evolution. Playing it replaces the Basic pet.',
	3: 'Master form. Playing it replaces the Adept pet.',
};

const RARITY_DETAIL: Record<Rarity, string> = {
	common: 'Most frequent cards. Baseline power.',
	rare: 'Uncommon pull. Stronger than Common.',
	epic: 'Scarce pull. Stronger than Rare.',
	mythic: 'Rarest pull. Highest card power band.',
};

export const getElementChromeFaq = (element: NorseElement | string): string => {
	const band = ELEMENT_BAND[(element as NorseElement)] ?? ELEMENT_BAND.neutral;
	const matchup = ELEMENT_MATCHUP[(element as NorseElement)] ?? ELEMENT_MATCHUP.neutral;
	return `${band.label}: ${matchup}`;
};

export const getBloodPriceChromeFaq = (value: number): string =>
	`Blood Price ${value}: Play by paying ${value} health instead of mana.`;

export const getPetStageChromeFaq = (stage: number): string => {
	const label = PET_STAGE_LABEL[stage] ?? String(stage);
	const detail = PET_STAGE_DETAIL[stage] ?? 'Pet evolution stage.';
	return `Pet stage ${label}: ${detail}`;
};

export const getEvolutionChromeFaq = (level: number): string =>
	`Evolution ${level}: This card has evolved ${level} time${level === 1 ? '' : 's'}.`;

export const getRarityChromeFaq = (rarity: Rarity | string): string => {
	const label = getRarityLabel(rarity);
	const detail = RARITY_DETAIL[rarity as Rarity] ?? 'Card rarity mark.';
	return `${label}: ${detail}`;
};

export const getPokerRankChromeFaq = (value: string): string => {
	if (value === 'A') return 'Rank A: Ace. Highest poker rank.';
	if (value === 'K') return 'Rank K: King.';
	if (value === 'Q') return 'Rank Q: Queen.';
	if (value === 'J') return 'Rank J: Jack.';
	return `Rank ${value}: poker rank.`;
};

export const getPokerSuitChromeFaq = (suit: NorseSuit): string => {
	const entry = NORSE_SUIT_FAQ[suit];
	return `${entry.name} (${entry.runeName}): ${entry.description}`;
};

export const getKeywordChromeFaq = (keyword: string): string =>
	getCardKeywordTooltipText(keyword);
