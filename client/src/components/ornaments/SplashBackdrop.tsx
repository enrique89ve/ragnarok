/**
 * SplashBackdrop — ambient card art layered behind tile content.
 *
 * Picks N random card art paths from the rarity pool that matches the tile's
 * tier and crossfades between them on a slow timer. Sits at z-index 0 with
 * mix-blend overlay + low opacity so it reads as atmosphere, never competition.
 *
 * Respects `prefers-reduced-motion`: shows the first image static, no rotation.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { pickRandomCardArt, rarityForPackKey } from '../../game/utils/art/randomCardArt';

type Tier = 'standard' | 'premium' | 'mythic' | 'starter' | 'obsidian';

interface SplashBackdropProps {
	/** Pack key the surface represents. Drives the rarity pool we draw from. */
	packKey: string;
	/** Optional explicit tier override for non-pack contexts. */
	tier?: Tier;
	/** How many distinct images to crossfade between. Default 3. */
	count?: number;
	/** Crossfade interval in ms. Default 7000. */
	intervalMs?: number;
}

export function SplashBackdrop({ packKey, tier, count = 3, intervalMs = 7000 }: SplashBackdropProps) {
	// Pick once on mount + when pack changes. useMemo keeps the same set
	// across re-renders so the backdrop doesn't re-roll on every state tick.
	const arts = useMemo(
		() => pickRandomCardArt(rarityForPackKey(packKey), count),
		[packKey, count],
	);

	const [activeIdx, setActiveIdx] = useState(0);
	const reducedMotion = useReducedMotion();

	useEffect(() => {
		if (reducedMotion || arts.length <= 1) return;
		const id = window.setInterval(() => {
			setActiveIdx(prev => (prev + 1) % arts.length);
		}, intervalMs);
		return () => window.clearInterval(id);
	}, [reducedMotion, arts.length, intervalMs]);

	if (arts.length === 0) return null;

	const tierClass = tier ?? (packKey as Tier);

	return (
		<div className={`splash-backdrop splash-backdrop--${tierClass}`} aria-hidden="true">
			{arts.map((src, i) => (
				<div
					key={src}
					className="splash-backdrop-layer"
					data-active={i === activeIdx ? 'true' : 'false'}
					style={{ backgroundImage: `url(${src})` }}
				/>
			))}
			{/* Vignette overlay reins in the splash so content stays readable */}
			<div className="splash-backdrop-vignette" />
		</div>
	);
}
