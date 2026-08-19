/**
 * <CardRankSuit> — poker face: index corners + pip grid or court mark.
 *
 * Geometry is % / px inside the card box. GameViewport scales the
 * 1920×1080 board; this slot never uses rem, vw, or media queries.
 */

import React from 'react';
import { useCardFrame } from '../CardFrameContext';
import {
	NORSE_SYMBOL,
	SUIT_COLOR,
	isCourtCard,
	pipsForRank,
	type NorseSuit,
	type PokerPip,
} from '../../../utils/cards/norsePokerCard';
import { getPokerRankChromeFaq, getPokerSuitChromeFaq } from '../cardChromeFaq';

export interface CardRankSuitProps {
	suit: NorseSuit;
	value: string;
}

const CardRankSuit: React.FC<CardRankSuitProps> = ({ suit, value }) => {
	const { size } = useCardFrame();
	const symbol = NORSE_SYMBOL[suit];
	const color = SUIT_COLOR[suit];
	const court = isCourtCard(value);
	const pips = court ? null : pipsForRank(value);
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
				symbol={symbol}
				corner="tl"
				rankFaq={rankFaq}
				suitFaq={suitFaq}
			/>
			{court ? (
				<div className="card-court" data-chrome-faq={suitFaq} aria-label={suitFaq}>
					<span className="card-court__mark">{symbol}</span>
					<span className="card-court__rank">{value}</span>
				</div>
			) : (
				<PipField pips={pips ?? []} symbol={symbol} ace={value === 'A'} />
			)}
			<CardIndex
				value={value}
				symbol={symbol}
				corner="br"
				rankFaq={rankFaq}
				suitFaq={suitFaq}
			/>
		</div>
	);
};

function CardIndex({
	value,
	symbol,
	corner,
	rankFaq,
	suitFaq,
}: {
	value: string;
	symbol: string;
	corner: 'tl' | 'br';
	rankFaq: string;
	suitFaq: string;
}) {
	return (
		<div className={`card-index card-index--${corner}`}>
			<span className="card-index__rank" data-chrome-faq={rankFaq} aria-label={rankFaq}>
				{value}
			</span>
			<span className="card-index__suit" data-chrome-faq={suitFaq} aria-hidden="true">
				{symbol}
			</span>
		</div>
	);
}

function PipField({
	pips,
	symbol,
	ace,
}: {
	pips: readonly PokerPip[];
	symbol: string;
	ace: boolean;
}) {
	return (
		<div className={ace ? 'card-pip-field card-pip-field--ace' : 'card-pip-field'} aria-hidden="true">
			{pips.map((pip, index) => (
				<span
					key={index}
					className={pip.flip ? 'card-pip card-pip--flip' : 'card-pip'}
					style={{ left: `${pip.x}%`, top: `${pip.y}%` }}
				>
					{symbol}
				</span>
			))}
		</div>
	);
}

export default CardRankSuit;
CardRankSuit.displayName = 'CardRankSuit';
