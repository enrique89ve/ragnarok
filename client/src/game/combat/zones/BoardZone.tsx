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
import { PokerCard } from '../../types/PokerCombatTypes';
import {
	CardFrame,
	CardRankSuit,
	CardCardBack,
} from '../../components/card';
import type { NorseSuit } from '../../utils/cards/norsePokerCard';
import { isCardInWinningHand } from '../utils/combatArenaUtils';
import { arenaVfxCommunitySlotProps } from '../arenaVfxTargets';

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
		<section className="zone-board" aria-label="Community cards">
			<div className="unified-community community-cards-section zone-community">
				{showFaith && communityCards.faith.length > 0 ? (
					communityCards.faith.map((card, idx) => (
						<div key={`faith-${idx}`} className={`community-slot ${highlightClass(card, showdownWinningCards)}`} {...arenaVfxCommunitySlotProps(idx)}>
							<div className={glowClass(card, showdownWinningCards)}>
								<CardFrame shape="poker" size="medium">
									<CardRankSuit suit={card.suit as NorseSuit} value={card.value} />
								</CardFrame>
							</div>
						</div>
					))
				) : (
					[0, 1, 2].map(idx => (
						<div key={`faith-placeholder-${idx}`} className="community-slot" {...arenaVfxCommunitySlotProps(idx)}>
							<CardFrame shape="poker" size="medium">
								<CardCardBack />
							</CardFrame>
						</div>
					))
				)}

				<div className={`community-slot ${showForesight ? highlightClass(communityCards.foresight, showdownWinningCards) : ''}`} {...arenaVfxCommunitySlotProps(3)}>
					{showForesight && communityCards.foresight ? (
						<div className={glowClass(communityCards.foresight, showdownWinningCards)}>
							<CardFrame shape="poker" size="medium">
								<CardRankSuit suit={communityCards.foresight.suit as NorseSuit} value={communityCards.foresight.value} />
							</CardFrame>
						</div>
					) : (
						<div className="card-placeholder" />
					)}
				</div>

				<div className={`community-slot ${showDestiny ? highlightClass(communityCards.destiny, showdownWinningCards) : ''}`} {...arenaVfxCommunitySlotProps(4)}>
					{showDestiny && communityCards.destiny ? (
						<div className={glowClass(communityCards.destiny, showdownWinningCards)}>
							<CardFrame shape="poker" size="medium">
								<CardRankSuit suit={communityCards.destiny.suit as NorseSuit} value={communityCards.destiny.value} />
							</CardFrame>
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
