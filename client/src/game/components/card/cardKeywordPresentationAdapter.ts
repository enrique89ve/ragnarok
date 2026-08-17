import {
	getCardKeywordsForSurface,
	getCardKeywordSemantics,
	type CardKeywordFunction,
	type CardPresentationSurface,
	type CardRenderImportance,
} from './cardPresentationContract';
import { getCardKeywordAccent } from './cardKeywordPalette';

export const CARD_KEYWORD_PREVIEW_LIMITS = {
	collection: 4,
	pregame: 3,
	gameplay: 2,
} satisfies Record<CardPresentationSurface, number>;

export type CardKeywordLabelMode = 'full' | 'compact';

export type CardKeywordTone =
	| 'choice'
	| 'combat'
	| 'filter'
	| 'poker'
	| 'progression'
	| 'resource'
	| 'state'
	| 'summon'
	| 'theme'
	| 'trigger';

export type CardKeywordPresentationEntry = {
	readonly keyword: string;
	readonly label: string;
	readonly compactLabel: string;
	readonly displayLabel: string;
	readonly description: string;
	readonly functions: readonly CardKeywordFunction[];
	readonly tone: CardKeywordTone;
	readonly accent: string;
	readonly importance: CardRenderImportance;
	readonly gameplayImportance: CardRenderImportance;
	readonly pregameImportance: CardRenderImportance;
};

export type CardKeywordPresentation = {
	readonly entries: readonly CardKeywordPresentationEntry[];
	readonly hiddenCount: number;
	readonly hiddenSummary: string;
	readonly totalCount: number;
};

export type AdaptCardKeywordsInput = {
	readonly keywords?: readonly string[];
	readonly surface: CardPresentationSurface;
	readonly limit?: number | null;
	readonly labelMode?: CardKeywordLabelMode;
};

const KEYWORD_FUNCTION_TONES = {
	filter: 'filter',
	trigger: 'trigger',
	'static-combat-rule': 'combat',
	'targeting-rule': 'combat',
	'state-rule': 'state',
	'resource-rule': 'resource',
	'choice-rule': 'choice',
	'progression-rule': 'progression',
	'summon-rule': 'summon',
	'card-generation': 'choice',
	'deck-construction': 'filter',
	'poker-rule': 'poker',
	'theme-marker': 'theme',
} satisfies Record<CardKeywordFunction, CardKeywordTone>;

const toneForFunctions = (functions: readonly CardKeywordFunction[]): CardKeywordTone => {
	const primaryFunction = functions[0];
	return primaryFunction === undefined ? 'filter' : KEYWORD_FUNCTION_TONES[primaryFunction];
};

const normalizeLimit = (limit: number | null | undefined, total: number): number => {
	if (limit === null || limit === undefined) return total;
	if (!Number.isFinite(limit)) return total;
	return Math.min(total, Math.max(0, Math.trunc(limit)));
};

export const adaptCardKeywordsForPresentation = ({
	keywords,
	surface,
	limit = CARD_KEYWORD_PREVIEW_LIMITS[surface],
	labelMode = surface === 'gameplay' ? 'compact' : 'full',
}: AdaptCardKeywordsInput): CardKeywordPresentation => {
	const orderedKeywords = getCardKeywordsForSurface(keywords, surface);
	const visibleCount = normalizeLimit(limit, orderedKeywords.length);
	const visibleKeywords = orderedKeywords.slice(0, visibleCount);
	const hiddenKeywords = orderedKeywords.slice(visibleCount);
	const entries = visibleKeywords.map((keywordValue): CardKeywordPresentationEntry => {
		const semantics = getCardKeywordSemantics(keywordValue);
		const tone = toneForFunctions(semantics.functions);
		const importance = semantics[surface];
		return {
			keyword: semantics.keyword,
			label: semantics.label,
			compactLabel: semantics.compactLabel,
			displayLabel: labelMode === 'compact' ? semantics.compactLabel : semantics.label,
			description: semantics.description,
			functions: semantics.functions,
			tone,
			accent: getCardKeywordAccent(keywordValue, tone, importance),
			importance,
			gameplayImportance: semantics.gameplay,
			pregameImportance: semantics.pregame,
		};
	});

	return {
		entries,
		hiddenCount: hiddenKeywords.length,
		hiddenSummary: hiddenKeywords
			.map((keywordValue) => getCardKeywordSemantics(keywordValue).label)
			.join(', '),
		totalCount: orderedKeywords.length,
	};
};
