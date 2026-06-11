/**
 * <CardCountBadge> — slot: collection quantity.
 *
 * Small pill in the lower-right, hidden if count is 1 (singletons
 * don't need a counter — keeps the visual calm on owned cards).
 */

import React from 'react';

export interface CardCountBadgeProps {
	count: number;
}

const CardCountBadge: React.FC<CardCountBadgeProps> = ({ count }) => {
	if (count <= 1) return null;
	return (
		<div className="card-frame__count-badge" aria-label={`Owned ${count}`}>
			×{count}
		</div>
	);
};

export default CardCountBadge;
