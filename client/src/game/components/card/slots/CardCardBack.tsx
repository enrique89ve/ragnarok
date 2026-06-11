/**
 * <CardCardBack> — slot: norse poker card back.
 *
 * Renders the face-down variant of `<CardRankSuit>`. Four gold-tinted
 * corner runes (`ᚱ ᚦ ᛉ ᛟ`), a Yggdrasil `ᛇ` center glyph, and an
 * animated diagonal shimmer overlay. The diagonal shimmer respects
 * `prefers-reduced-motion: reduce`.
 *
 * DisplayName `'CardCardBack'` so the frame's NonArtChildren walker
 * places it in the art-layer (z:0) and skips the art-child slot.
 */

import React from 'react';

const CardCardBack: React.FC = () => {
	return (
		<div className="card-card-back" aria-label="Card face-down">
			<div className="card-back-border">
				<div className="corner-rune tl">ᚱ</div>
				<div className="corner-rune tr">ᚦ</div>
				<div className="corner-rune bl">ᛉ</div>
				<div className="corner-rune br">ᛟ</div>
				<div className="card-back-center">
					<div className="yggdrasil-symbol">ᛇ</div>
				</div>
				<div className="card-back-shimmer" />
			</div>
		</div>
	);
};

export default CardCardBack;
CardCardBack.displayName = 'CardCardBack';
