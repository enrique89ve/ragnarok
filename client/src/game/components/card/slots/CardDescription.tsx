/**
 * <CardDescription> — slot: keyword row + optional text body.
 *
 * When `keywords` is non-empty, renders a row of keyword chips.
 * When `description` is set, renders the text body below.
 * Both stack vertically inside the same container.
 */

import React from 'react';

export interface CardDescriptionProps {
	description?: string;
	keywords?: readonly string[];
}

const CardDescription: React.FC<CardDescriptionProps> = ({ description, keywords }) => {
	const hasKeywords = keywords !== undefined && keywords.length > 0;
	if (!hasKeywords && !description) return null;

	return (
		<div className="card-frame__description">
			{hasKeywords && (
				<div className="card-frame__keywords">
					{keywords!.map((k) => (
						<span key={k} className="card-frame__keyword-chip">{k}</span>
					))}
				</div>
			)}
			{description && <p className="card-frame__description-text">{description}</p>}
		</div>
	);
};

(CardDescription as React.FC & { displayName?: string }).displayName = 'CardDescription';

export default CardDescription;
