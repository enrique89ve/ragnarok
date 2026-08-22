import {
	CARD_KEYWORD_SEMANTICS,
	getCardKeywordSemantics,
	isKnownCardKeyword,
	normalizeCardKeyword,
	type CardKeywordSemantics,
	type CardPresentationSurface,
} from './cardPresentationContract';
import { getCardKeywordAccent } from './cardKeywordPalette';
import { getKeywordIcon, type KeywordIconComponent } from '../ui/CardIconsSVG';

export type CardKeywordDictionaryEntry = CardKeywordSemantics & {
	readonly icon: KeywordIconComponent | null;
	readonly accent: string;
};

const DEFAULT_KEYWORD_SURFACE: CardPresentationSurface = 'collection';

export const getCardKeywordDictionaryEntry = (
	keywordValue: string,
	surface: CardPresentationSurface = DEFAULT_KEYWORD_SURFACE,
): CardKeywordDictionaryEntry => {
	const keyword = normalizeCardKeyword(keywordValue);
	const semantics = getCardKeywordSemantics(keyword);
	return {
		...semantics,
		icon: getKeywordIcon(keyword),
		accent: getCardKeywordAccent(keyword, 'combat', semantics[surface]),
	};
};

const buildCardKeywordDictionary = (): Readonly<Record<string, CardKeywordDictionaryEntry>> => {
	const dictionary: Record<string, CardKeywordDictionaryEntry> = {};
	for (const keyword of Object.keys(CARD_KEYWORD_SEMANTICS)) {
		dictionary[keyword] = getCardKeywordDictionaryEntry(keyword);
	}
	return dictionary;
};

/** Derived keyword view for UI consumers. Semantics remain authoritative in the presentation contract. */
export const CARD_KEYWORD_DICTIONARY = buildCardKeywordDictionary();

export const getKnownCardKeywordDictionaryEntry = (
	keywordValue: string,
	surface: CardPresentationSurface = DEFAULT_KEYWORD_SURFACE,
): CardKeywordDictionaryEntry | null => {
	if (!isKnownCardKeyword(keywordValue)) return null;
	return getCardKeywordDictionaryEntry(keywordValue, surface);
};
