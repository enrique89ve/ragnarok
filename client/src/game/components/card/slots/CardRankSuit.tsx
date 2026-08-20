/**
 * <CardRankSuit> — poker face: mirrored rank indices + one Norse suit mark.
 *
 * Geometry is % / px inside the card box. GameViewport scales the
 * 1920×1080 board; this slot never uses rem, vw, or media queries.
 */

import React from 'react';
import { useCardFrame } from '../CardFrameContext';
import {
	SUIT_COLOR,
	isCourtCard,
	type NorseSuit,
} from '../../../utils/cards/norsePokerCard';
import { getPokerRankChromeFaq, getPokerSuitChromeFaq } from '../cardChromeFaq';
import NorseSuitEmblem from './NorseSuitEmblem';

export interface CardRankSuitProps {
	suit: NorseSuit;
	value: string;
}

const CardRankSuit: React.FC<CardRankSuitProps> = ({ suit, value }) => {
	const { size } = useCardFrame();
	const color = SUIT_COLOR[suit];
	const court = isCourtCard(value);
	const rankFaq = getPokerRankChromeFaq(value);
	const suitFaq = getPokerSuitChromeFaq(suit);

	return (
		<div
			className="card-rank-suit"
			data-size={size}
			data-suit={suit}
			data-rank={value}
			style={{ color }}
		>
			<CardIndex
				value={value}
				corner="tl"
				rankFaq={rankFaq}
			/>
			{court ? (
				<div className="card-court" data-chrome-faq={suitFaq} role="img" aria-label={suitFaq}>
					<NorseSuitEmblem suit={suit} className="card-court__emblem" />
				</div>
			) : (
				<div className="card-suit-emblem" data-chrome-faq={suitFaq} role="img" aria-label={suitFaq}>
					<NorseSuitEmblem suit={suit} className="card-suit-emblem__svg" />
				</div>
			)}
			<CardIndex
				value={value}
				corner="br"
				rankFaq={rankFaq}
			/>
		</div>
	);
};

function CardIndex({
	value,
	corner,
	rankFaq,
}: {
	value: string;
	corner: 'tl' | 'br';
	rankFaq: string;
}) {
	return (
		<div className={`card-index card-index--${corner}`}>
			<span className="card-index__rank" data-chrome-faq={rankFaq} aria-label={rankFaq}>
				{value}
			</span>
		</div>
	);
}

export default CardRankSuit;
CardRankSuit.displayName = 'CardRankSuit';
