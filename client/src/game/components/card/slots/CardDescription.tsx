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
	formatCardKeywordCompactLabel,
	formatCardKeywordLabel,
} from '../cardKeywordDisplay';
import { getCardKeywordSemantics } from '../cardPresentationContract';
import { KEYWORD_ICON_MAP } from '../../ui/CardIconsSVG';

export interface CardDescriptionProps {
	description?: string;
	keywords?: readonly string[];
	keywordLimit?: number | null;
	keywordLabelMode?: 'full' | 'compact';
}

type KeywordIconComponent = React.FC<React.SVGProps<SVGSVGElement>>;

const keywordIconLookup: Readonly<Partial<Record<string, KeywordIconComponent>>> = KEYWORD_ICON_MAP;

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
	const visibleKeywordEntries = visibleKeywords.map((keyword) => ({
		keyword,
		Icon: keywordIconLookup[keyword],
		label: formatCardKeywordLabel(keyword),
		semantics: getCardKeywordSemantics(keyword),
	}));
	const stackVariant = description && hasKeywords
		? 'card-frame__description-stack--with-keywords'
		: description
			? 'card-frame__description-stack--description-only'
			: 'card-frame__description-stack--keywords-only';

	return (
		<div className={`card-frame__description-stack ${stackVariant}`}>
			{hasKeywords && (
				<div className="card-frame__keywords" data-keyword-label-mode={keywordLabelMode}>
					{visibleKeywordEntries.map(({ keyword, Icon, label, semantics }) => (
						<span
							key={keyword}
							className={`card-frame__keyword-chip${Icon ? ' card-frame__keyword-chip--icon' : ''}`}
							data-keyword={keyword}
							data-keyword-functions={semantics.functions.join(' ')}
							data-keyword-gameplay={semantics.gameplay}
							data-keyword-pregame={semantics.pregame}
							aria-label={label}
							title={label}
						>
							{Icon ? (
								<Icon className="card-frame__keyword-icon" focusable="false" aria-hidden="true" />
							) : (
								formatKeyword(keyword)
							)}
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
			{description && (
				<div className="card-frame__description">
					<p
						className="card-frame__description-text"
						data-layout-allow-truncate="card-description-preview"
						title={description}
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
