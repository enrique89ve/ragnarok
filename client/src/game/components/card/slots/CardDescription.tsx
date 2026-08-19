/**
 * <CardDescription> — slots: keyword row + optional text body.
 *
 * When `keywords` is non-empty, renders a row of keyword chips.
 * When `description` is set, renders the text body below.
 * The two slots stay as siblings so keyword layout never becomes part of the
 * description panel's width, height, or alignment contract.
 */

import React from 'react';
import {
	adaptCardKeywordsForPresentation,
	splitKeywordRows,
} from '../cardKeywordPresentationAdapter';
import type { CardPresentationSurface } from '../cardPresentationContract';
import { KEYWORD_ICON_MAP } from '../../ui/CardIconsSVG';
import { getKeywordChromeFaq } from '../cardChromeFaq';

export interface CardDescriptionProps {
	description?: string;
	keywords?: readonly string[];
	keywordLimit?: number | null;
	keywordLabelMode?: 'full' | 'compact';
	surface?: CardPresentationSurface;
}

type KeywordIconComponent = React.FC<React.SVGProps<SVGSVGElement>>;
type KeywordChipStyle = React.CSSProperties & { '--keyword-tone'?: string };

const keywordIconLookup: Readonly<Partial<Record<string, KeywordIconComponent>>> = KEYWORD_ICON_MAP;

const CardDescription: React.FC<CardDescriptionProps> = ({
	description,
	keywords,
	keywordLimit = null,
	keywordLabelMode = 'full',
	surface = 'collection',
}) => {
	const presentation = adaptCardKeywordsForPresentation({
		keywords,
		surface,
		limit: keywordLimit,
		labelMode: keywordLabelMode,
	});
	// Mulligan has one deliberate help surface: the anchored detail panel.
	// Native titles here would compete with it and expose a second copy of the
	// same explanation at an unpredictable browser-controlled position.
	const ownsContextualHelp = surface === 'pregame';
	const hasKeywords = presentation.totalCount > 0;
	if (!hasKeywords && !description) return null;
	const keywordRows = splitKeywordRows(presentation.entries);
	const usesTwoKeywordRows = keywordRows.length === 2;
	const fiveStackLabelMode = usesTwoKeywordRows ? 'compact' : keywordLabelMode;
	const stackVariant = description && hasKeywords
		? 'card-frame__description-stack--with-keywords'
		: description
			? 'card-frame__description-stack--description-only'
			: 'card-frame__description-stack--keywords-only';

	return (
		<div
			className={`card-frame__description-stack ${stackVariant}`}
			data-keyword-stack={usesTwoKeywordRows ? '2-3' : '1'}
		>
			{hasKeywords && (
				<div
					className="card-frame__keywords"
					data-keyword-label-mode={fiveStackLabelMode}
					data-keyword-count={presentation.entries.length}
					data-keyword-stack={usesTwoKeywordRows ? '2-3' : '1'}
				>
					{keywordRows.map((row, rowIndex) => (
						<div
							key={`keyword-row-${rowIndex}`}
							className="card-frame__keyword-row"
							data-keyword-row={rowIndex + 1}
						>
							{row.map((entry) => {
								const Icon = keywordIconLookup[entry.keyword];
								const showKeywordLabel =
									fiveStackLabelMode !== 'compact' || Icon === undefined;
								return (
									<span
										key={entry.keyword}
										className={`card-frame__keyword-chip${Icon ? ' card-frame__keyword-chip--with-icon' : ''}${!showKeywordLabel ? ' card-frame__keyword-chip--icon-only' : ''}`}
										data-keyword={entry.keyword}
										data-keyword-functions={entry.functions.join(' ')}
										data-keyword-gameplay={entry.gameplayImportance}
										data-keyword-pregame={entry.pregameImportance}
										data-tone={entry.tone}
										data-keyword-importance={entry.importance}
										style={{ '--keyword-tone': entry.accent } as KeywordChipStyle}
									aria-label={ownsContextualHelp ? undefined : entry.label}
									data-chrome-faq={ownsContextualHelp ? undefined : getKeywordChromeFaq(entry.keyword)}
									>
										{Icon && (
											<span className="card-frame__keyword-icon-mark" aria-hidden="true">
												<Icon className="card-frame__keyword-icon" focusable="false" />
											</span>
										)}
										{showKeywordLabel && (
											<span className="card-frame__keyword-label">{entry.displayLabel}</span>
										)}
									</span>
								);
							})}
							{!usesTwoKeywordRows &&
								rowIndex === keywordRows.length - 1 &&
								presentation.hiddenCount > 0 && (
								<span
									className="card-frame__keyword-chip card-frame__keyword-chip--overflow"
									data-keyword-summary={presentation.hiddenSummary}
									data-chrome-faq={ownsContextualHelp ? undefined : presentation.hiddenSummary}
								>
									+{presentation.hiddenCount}
								</span>
							)}
						</div>
					))}
				</div>
			)}
			{description && (
				<div className="card-frame__description">
					<p
						className="card-frame__description-text"
						data-layout-allow-truncate="card-description-preview"
						title={ownsContextualHelp ? undefined : description}
					>
						{description}
					</p>
				</div>
			)}
		</div>
	);
};

(CardDescription as React.FC & { displayName?: string }).displayName = 'CardDescription';

export default CardDescription;
