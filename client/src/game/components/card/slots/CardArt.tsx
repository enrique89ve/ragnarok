/**
 * <CardArt> — slot: card illustration.
 *
 * Render first child, fill the art-layer, z-index 0. If `src` is
 * missing the fallback panel renders instead so cards never look
 * broken. Lazy / async decode to keep grid pages cheap (R3 risk
 * from session plan: 30+ static PNGs on screen at once).
 */

import React from 'react';
import { useCardFrame } from '../CardFrameContext';

export interface CardArtProps {
	src?: string;
	alt: string;
}

const CardArt: React.FC<CardArtProps> = ({ src, alt }) => {
	const { shape } = useCardFrame();

	if (!src) {
		return (
			<div className="card-frame__art-fallback" data-shape={shape}>
				<span>{alt}</span>
			</div>
		);
	}

	return (
		<img
			className="card-frame__art"
			src={src}
			alt={alt}
			loading="lazy"
			decoding="async"
		/>
	);
};

export default CardArt;
CardArt.displayName = 'CardArt';
