/**
 * UnifiedCardTooltip.tsx
 *
 * Card hover tooltip. Keyword meaning comes from cardPresentationContract.ts;
 * keyword SVGs come from CardIconsSVG.tsx through cardKeywordDictionary.ts.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GameIcon } from '../../utils/ui/GameIcon';
import {
	CARD_KEYWORD_DICTIONARY,
	getKnownCardKeywordDictionaryEntry,
	type CardKeywordDictionaryEntry,
} from '../card/cardKeywordDictionary';
import { normalizeCardKeyword } from '../card/cardPresentationContract';
import './UnifiedCardTooltip.css';

export interface TooltipCardData {
	id: number | string;
	name: string;
	manaCost: number;
	attack?: number;
	health?: number;
	description?: string;
	type: string;
	rarity?: string;
	tribe?: string;
	cardClass?: string;
	keywords?: string[];
	artPath?: string;
}

interface UnifiedCardTooltipProps {
	card: TooltipCardData | null;
	position: { x: number; y: number } | null;
	visible: boolean;
	placement?: 'above' | 'below' | 'left' | 'right' | 'auto';
}

type TooltipPlacement = NonNullable<UnifiedCardTooltipProps['placement']>;

const calculateTooltipPosition = (
	position: { x: number; y: number },
	placement: TooltipPlacement,
	viewport: { width: number; height: number },
): { left: number; top: number } => {
	const tooltipWidth = 280;
	const tooltipHeight = 200;
	const margin = 16;
	let left = position.x;
	let top = position.y;

	if (placement === 'auto' || placement === 'above') {
		top = position.y - tooltipHeight - margin;
		left = position.x - tooltipWidth / 2;
		if (top < margin) top = position.y + margin + 20;
	} else if (placement === 'below') {
		top = position.y + margin + 20;
		left = position.x - tooltipWidth / 2;
	} else if (placement === 'left') {
		left = position.x - tooltipWidth - margin;
		top = position.y - tooltipHeight / 2;
	} else if (placement === 'right') {
		left = position.x + margin + 20;
		top = position.y - tooltipHeight / 2;
	}

	return {
		left: Math.max(margin, Math.min(left, viewport.width - tooltipWidth - margin)),
		top: Math.max(margin, Math.min(top, viewport.height - tooltipHeight - margin)),
	};
};

const escapeRegExp = (value: string): string =>
	value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const KEYWORD_TEXT_ENTRIES = Object.values(CARD_KEYWORD_DICTIONARY)
	.flatMap((entry) => [
		{ text: entry.keyword.replace(/_/g, ' '), keyword: entry.keyword },
		{ text: entry.label.toLowerCase(), keyword: entry.keyword },
	])
	.sort((a, b) => b.text.length - a.text.length);

/** Extract explicit keywords and known keywords mentioned in the description. */
export function extractKeywords(card: TooltipCardData): CardKeywordDictionaryEntry[] {
	const foundKeywords: CardKeywordDictionaryEntry[] = [];
	const addedKeywords = new Set<string>();

	const addKeyword = (value: string): void => {
		const keyword = normalizeCardKeyword(value);
		if (addedKeywords.has(keyword)) return;
		const entry = getKnownCardKeywordDictionaryEntry(keyword);
		if (!entry) return;
		foundKeywords.push(entry);
		addedKeywords.add(keyword);
	};

	for (const keyword of card.keywords ?? []) addKeyword(keyword);

	const description = card.description?.toLowerCase();
	if (description) {
		for (const entry of Object.values(CARD_KEYWORD_DICTIONARY)) {
			const keywordText = entry.keyword.replace(/_/g, ' ');
			if (description.includes(keywordText) || description.includes(entry.label.toLowerCase())) {
				addKeyword(entry.keyword);
			}
		}
	}

	return foundKeywords.slice(0, 6);
}

function highlightKeywords(text: string): React.ReactNode[] {
	const pattern = new RegExp(
		`\\b(${KEYWORD_TEXT_ENTRIES.map(({ text: value }) => escapeRegExp(value)).join('|')})\\b`,
		'gi',
	);
	const parts: React.ReactNode[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = pattern.exec(text)) !== null) {
		if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
		const matchedTerm = match[1].toLowerCase();
		const matchedEntry = KEYWORD_TEXT_ENTRIES.find(({ text: value }) => value === matchedTerm);
		const entry = matchedEntry ? CARD_KEYWORD_DICTIONARY[matchedEntry.keyword] : undefined;
		if (entry) {
			parts.push(
				<span key={match.index} className="keyword-highlight" style={{ color: entry.accent, fontWeight: 600 }}>
					{match[1]}
				</span>,
			);
		} else {
			parts.push(match[1]);
		}
		lastIndex = pattern.lastIndex;
	}

	if (lastIndex < text.length) parts.push(text.slice(lastIndex));
	return parts;
}

export const UnifiedCardTooltip: React.FC<UnifiedCardTooltipProps> = ({
	card,
	position,
	visible,
	placement = 'auto',
}) => {
	const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

	useEffect(() => {
		if (!visible || !position || !card) return;

		const { left, top } = calculateTooltipPosition(position, placement, {
			width: window.innerWidth,
			height: window.innerHeight,
		});

		setTooltipStyle({
			left: `${left}px`,
			top: `${top}px`,
			width: '280px',
		});
	}, [visible, position, card, placement]);

	if (!visible || !card || !position) return null;

	const keywords = extractKeywords(card);
	const rarityClass = `rarity-${card.rarity?.toLowerCase() || 'common'}`;
	const typeLabel = card.type?.charAt(0).toUpperCase() + card.type?.slice(1) || 'Card';

	const tooltipContent = (
		<div className={`unified-card-tooltip ${rarityClass}`} style={tooltipStyle}>
			<div className="tooltip-header">
				<span className="tooltip-mana">{card.manaCost}</span>
				<span className="tooltip-name">{card.name}</span>
			</div>

			<div className="tooltip-type-row">
				<span className="tooltip-type">{typeLabel}</span>
				{card.tribe && <span className="tooltip-tribe">{card.tribe}</span>}
			</div>

			{(card.attack !== undefined || card.health !== undefined) && (
				<div className="tooltip-stats">
					{card.attack !== undefined && (
						<span className="tooltip-attack">
							<GameIcon name="swords" size={14} className="tooltip-stat-icon" aria-label="attack" />
							{card.attack}
						</span>
					)}
					{card.health !== undefined && (
						<span className="tooltip-health">
							<GameIcon name="heart" size={14} className="tooltip-stat-icon" aria-label="health" />
							{card.health}
						</span>
					)}
				</div>
			)}

			{card.description && <div className="tooltip-description">{highlightKeywords(card.description)}</div>}

			{keywords.length > 0 && (
				<div className="tooltip-keywords">
					{keywords.map((keyword) => {
						const Icon = keyword.icon;
						return (
							<div key={keyword.keyword} className="tooltip-keyword-item" style={{ borderColor: keyword.accent }}>
								<span className="keyword-icon" style={{ color: keyword.accent }}>
									{Icon && <Icon width="1em" height="1em" aria-label={keyword.label} />}
								</span>
								<div className="keyword-info">
									<span className="keyword-name" style={{ color: keyword.accent }}>{keyword.label}</span>
									<span className="keyword-desc">{keyword.description}</span>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);

	return createPortal(tooltipContent, document.body);
};

export default UnifiedCardTooltip;
