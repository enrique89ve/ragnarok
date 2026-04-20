/**
 * PlayingCard - Norse-themed poker card component
 * 
 * Extracted from RagnarokCombatArena.tsx for modular UI
 */

import React from 'react';
import { CardSuit, PokerCard } from '../../types/PokerCombatTypes';

export const getNorseRune = (suit: CardSuit): string => {
	switch (suit) {
		case 'spades': return 'ᛏ';
		case 'hearts': return 'ᛉ';
		case 'diamonds': return 'ᛟ';
		case 'clubs': return 'ᚦ';
	}
};

export const getNorseSymbol = (suit: CardSuit): string => {
	switch (suit) {
		case 'spades': return '⚔';
		case 'hearts': return '❂';
		case 'diamonds': return '◆';
		case 'clubs': return '⚒';
	}
};

export const getSuitColor = (suit: CardSuit): string => {
	switch (suit) {
		case 'spades': return '#2d4a3d';
		case 'hearts': return '#8b3a3a';
		case 'diamonds': return '#5c4a2a';
		case 'clubs': return '#3a4a5c';
	}
};

export const getNorseValue = (value: string): string => {
	return value;
};

interface PlayingCardProps {
	card: PokerCard;
	faceDown?: boolean;
	large?: boolean;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({ 
	card, 
	faceDown = false,
	large = false 
}) => {
	if (faceDown) {
		return (
			<div className={`arena-poker-card norse face-down ${large ? 'large' : ''}`}>
				<div className="card-back">
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
			</div>
		);
	}

	const suitColor = getSuitColor(card.suit);
	const runeSymbol = getNorseRune(card.suit);
	const norseSymbol = getNorseSymbol(card.suit);
	const displayValue = getNorseValue(card.value);
	const isFaceCard = ['K', 'Q', 'J', 'A'].includes(card.value);

	return (
		<div className={`arena-poker-card norse ${card.suit} ${large ? 'large' : ''}`}>
			<div className="norse-border">
				<div className="corner-rune top-left">ᚱ</div>
				<div className="corner-rune top-right">ᚱ</div>
				<div className="corner-rune bottom-left">ᚱ</div>
				<div className="corner-rune bottom-right">ᚱ</div>
			</div>
			<div className="card-inner" style={{ color: suitColor }}>
				<div className="card-corner top-left">
					<span className="card-value">{displayValue}</span>
					<span className="card-rune">{runeSymbol}</span>
				</div>
				<div className="card-center">
					{isFaceCard ? (
						<div className="face-card-symbol">
							<span className="norse-symbol-large">{norseSymbol}</span>
							<span className="face-rune">{runeSymbol}</span>
						</div>
					) : (
						<span className="norse-symbol-large">{norseSymbol}</span>
					)}
				</div>
				<div className="card-corner bottom-right">
					<span className="card-value">{displayValue}</span>
					<span className="card-rune">{runeSymbol}</span>
				</div>
			</div>
		</div>
	);
};

export default PlayingCard;
