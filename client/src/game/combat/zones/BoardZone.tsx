/**
 * BoardZone — flop / turn / river community cards row.
 *
 * Renders the 5-card poker board (3 faith + 1 foresight + 1 destiny).
 * Each slot shows either the revealed card or a face-down placeholder.
 * Cards that belong to the winning hand at showdown get a `.winning-card`
 * highlight; the glow halo (`.winning-card-glow.celebration`) only
 * activates while a showdownCelebration is active.
 *
 * Lives in `combat/zones/` so the parent arena stays an orchestration
 * shell. CSS classes (`.community-slot`, `.card-placeholder`, etc.)
 * still live in the centralised `RagnarokCombatArena.css`.
 */

import React from 'react';
import { PlayingCard } from '../components/PlayingCard';
import { PokerCard } from '../../types/PokerCombatTypes';
import { isCardInWinningHand, FACEDOWN_PLACEHOLDER_CARD } from '../utils/combatArenaUtils';

export interface BoardZoneProps {
	readonly communityCards: {
		readonly faith: readonly PokerCard[];
		readonly foresight?: PokerCard;
		readonly destiny?: PokerCard;
	};
	readonly showFaith: boolean;
	readonly showForesight: boolean;
	readonly showDestiny: boolean;
	readonly showdownWinningCards: readonly PokerCard[] | undefined;
}

function highlightClass(card: PokerCard | null | undefined, winning: readonly PokerCard[] | undefined): string {
	if (!card || !winning) return '';
	return isCardInWinningHand(card, winning as PokerCard[]) ? 'winning-card' : '';
}

function glowClass(card: PokerCard | null | undefined, winning: readonly PokerCard[] | undefined): string {
	if (!card || !winning) return '';
	return isCardInWinningHand(card, winning as PokerCard[]) ? 'winning-card-glow celebration' : '';
}

export const BoardZone: React.FC<BoardZoneProps> = ({
	communityCards,
	showFaith,
	showForesight,
	showDestiny,
	showdownWinningCards,
}) => {
	return (
		<section className="zone-board relative shrink-0 min-h-40 flex flex-row justify-center items-center gap-2">
			<div className="unified-community community-cards-section zone-community flex flex-row gap-2 justify-center items-center">
				{showFaith && communityCards.faith.length > 0 ? (
					communityCards.faith.map((card, idx) => (
						<div key={`faith-${idx}`} className={`community-slot ${highlightClass(card, showdownWinningCards)}`}>
							<div className={glowClass(card, showdownWinningCards)}>
								<PlayingCard card={card} />
							</div>
						</div>
					))
				) : (
					[0, 1, 2].map(idx => (
						<div key={`faith-placeholder-${idx}`} className="community-slot">
							<PlayingCard card={FACEDOWN_PLACEHOLDER_CARD} faceDown />
						</div>
					))
				)}

				<div className={`community-slot ${showForesight ? highlightClass(communityCards.foresight, showdownWinningCards) : ''}`}>
					{showForesight && communityCards.foresight ? (
						<div className={glowClass(communityCards.foresight, showdownWinningCards)}>
							<PlayingCard card={communityCards.foresight} />
						</div>
					) : (
						<div className="card-placeholder" />
					)}
				</div>

				<div className={`community-slot ${showDestiny ? highlightClass(communityCards.destiny, showdownWinningCards) : ''}`}>
					{showDestiny && communityCards.destiny ? (
						<div className={glowClass(communityCards.destiny, showdownWinningCards)}>
							<PlayingCard card={communityCards.destiny} />
						</div>
					) : (
						<div className="card-placeholder" />
					)}
				</div>
			</div>
		</section>
	);
};

export default BoardZone;
