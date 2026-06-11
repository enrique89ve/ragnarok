/**
 * <CardMasteryBadge> — slot: mastery ribbon.
 *
 * Forward compatibility: slot exists so future call sites (e.g.
 * HeroDetailPopup) can drop the badge in without touching the
 * frame API. CollectionPage currently mounts the badge via its
 * own classes (`.mastery-badge`, `.mastery-tier-2/3` from
 * collection.css) and continues to do so until commit (d)
 * retires the legacy path.
 *
 * Renders null for now. Will be wired to the mastery store in
 * post-beta cleanup.
 */

import React from 'react';

export interface CardMasteryBadgeProps {
	tier: 0 | 1 | 2 | 3;
}

const CardMasteryBadge: React.FC<CardMasteryBadgeProps> = () => {
	return null;
};

export default CardMasteryBadge;
