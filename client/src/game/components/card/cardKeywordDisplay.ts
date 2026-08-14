import { getCardKeywordSemantics } from './cardPresentationContract';

export type CardKeywordDisplay = {
	label: string;
	compactLabel: string;
	description: string;
};

const displayFor = (keyword: string): CardKeywordDisplay => {
	const semantics = getCardKeywordSemantics(keyword);
	return {
		label: semantics.label,
		compactLabel: semantics.compactLabel,
		description: semantics.description,
	};
};

export const formatCardKeywordLabel = (keyword: string): string =>
	displayFor(keyword).label;

export const formatCardKeywordCompactLabel = (keyword: string): string =>
	displayFor(keyword).compactLabel;

export const getCardKeywordTooltipText = (keyword: string): string => {
	const display = displayFor(keyword);
	return `${display.label}: ${display.description}`;
};
