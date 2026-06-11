/**
 * <CardRankSuit> — slot: norse poker card face.
 *
 * Renders the rank+suit visual that used to live in `PlayingCard.tsx`:
 * four corner runes, top-left + bottom-right value/rune pairs, and a
 * large center symbol (or stacked face-card symbol for K/Q/J/A).
 *
 * Suit color comes from `suitColors.ts`. Size scales automatically
 * from the parent frame's `data-size` attribute (set by CardFrame).
 *
 * The slot fills the frame's art-layer (z:0) and renders ABOVE the
 * PNG layer (z:3) when a rarity chrome is present, so the rank stays
 * legible regardless of frame PNG opacity. The frame's
 * NonArtChildren walker extracts this slot by displayName.
 */

import React from 'react';
import { useCardFrame } from '../CardFrameContext';
import {
	NORSE_RUNE,
	NORSE_SYMBOL,
	SUIT_COLOR,
	isFaceCard,
	type NorseSuit,
} from '../../../utils/cards/norsePokerCard';

export interface CardRankSuitProps {
	suit: NorseSuit;
	value: string;
}

const CardRankSuit: React.FC<CardRankSuitProps> = ({ suit, value }) => {
	const { size } = useCardFrame();
	const rune = NORSE_RUNE[suit];
	const symbol = NORSE_SYMBOL[suit];
	const color = SUIT_COLOR[suit];
	const face = isFaceCard(value);
	const large = size === 'large' || size === 'preview';

	return (
		<div className="card-rank-suit" data-size={size}>
			<div className="norse-border">
				<div className="corner-rune top-left">ᚱ</div>
				<div className="corner-rune top-right">ᚱ</div>
				<div className="corner-rune bottom-left">ᚱ</div>
				<div className="corner-rune bottom-right">ᚱ</div>
			</div>
			<div className="card-inner" style={{ color }}>
				<div className="card-corner top-left">
					<span className="card-value">{value}</span>
					<span className="card-rune">{rune}</span>
				</div>
				<div className="card-center">
					{face ? (
						<div className="face-card-symbol">
							<span className="norse-symbol-large">{symbol}</span>
							<span className="face-rune">{rune}</span>
						</div>
					) : (
						<span className="norse-symbol-large">{symbol}</span>
					)}
				</div>
				<div className="card-corner bottom-right">
					<span className="card-value">{value}</span>
					<span className="card-rune">{rune}</span>
				</div>
			</div>
			{large && <span className="card-rank-suit__size-hint" aria-hidden="true" />}
		</div>
	);
};

export default CardRankSuit;
CardRankSuit.displayName = 'CardRankSuit';
