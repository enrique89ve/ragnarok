/**
 * <CardTribeLine> — slot: race/tribe text under the name banner.
 *
 * Renders a small italic caption between the art-layer and the
 * stat-gems. Skips when `tribe` is empty/null.
 */

import React from 'react';

export interface CardTribeLineProps {
	tribe?: string | null;
}

const CardTribeLine: React.FC<CardTribeLineProps> = ({ tribe }) => {
	if (!tribe) return null;
	return <div className="card-frame__tribe-line">{tribe}</div>;
};

(CardTribeLine as React.FC & { displayName?: string }).displayName = 'CardTribeLine';

export default CardTribeLine;
