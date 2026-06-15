/**
 * <CardDescription> — slot: keyword row + optional text body.
 *
 * When `keywords` is non-empty, renders a row of keyword chips.
 * When `description` is set, renders the text body below.
 * Both stack vertically inside the same container.
 */

import React from 'react';
import {
	formatCardKeywordCompactLabel,
	formatCardKeywordLabel,
} from '../cardKeywordDisplay';

export interface CardDescriptionProps {
	description?: string;
	keywords?: readonly string[];
	keywordLimit?: number | null;
	keywordLabelMode?: 'full' | 'compact';
}

const CardDescription: React.FC<CardDescriptionProps> = ({
	description,
	keywords,
	keywordLimit = null,
	keywordLabelMode = 'full',
}) => {
	const keywordList = keywords ?? [];
	const hasKeywords = keywordList.length > 0;
	if (!hasKeywords && !description) return null;

	const maxKeywords = keywordLimit === null ? keywordList.length : Math.max(0, keywordLimit);
	const visibleKeywords = keywordList.slice(0, maxKeywords);
	const hiddenKeywords = keywordList.slice(maxKeywords);
	const hiddenKeywordSummary = hiddenKeywords.map(formatCardKeywordLabel).join(', ');
	const formatKeyword = keywordLabelMode === 'compact'
		? formatCardKeywordCompactLabel
		: formatCardKeywordLabel;

	return (
		<div className="card-frame__description">
			{hasKeywords && (
				<div className="card-frame__keywords">
					{visibleKeywords.map((keyword) => (
						<span
							key={keyword}
							className="card-frame__keyword-chip"
							data-keyword={keyword}
						>
							{formatKeyword(keyword)}
						</span>
					))}
					{hiddenKeywords.length > 0 && (
						<span
							className="card-frame__keyword-chip card-frame__keyword-chip--overflow"
							data-keyword-summary={hiddenKeywordSummary}
						>
							+{hiddenKeywords.length}
						</span>
					)}
				</div>
			)}
			{description && <p className="card-frame__description-text">{description}</p>}
		</div>
	);
};

(CardDescription as React.FC & { displayName?: string }).displayName = 'CardDescription';

export default CardDescription;
