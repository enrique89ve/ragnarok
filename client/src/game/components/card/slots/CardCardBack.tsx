/**
 * <CardCardBack> — slot: norse poker card back.
 *
 * Renders the face-down poker back: forest-green field, moss rim
 * (`.poker-face-down-surface`), and a centered Eihwaz `ᛇ` glyph.
 * Same chrome for community slots, hole cards, and opponent hand.
 *
 * DisplayName `'CardCardBack'` so the frame's NonArtChildren walker
 * places it in the art-layer (z:0) and skips the art-child slot.
 */

import React from 'react';

const CardCardBack: React.FC = () => {
	return (
		<div className="card-card-back poker-face-down-surface" aria-label="Card face-down">
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
