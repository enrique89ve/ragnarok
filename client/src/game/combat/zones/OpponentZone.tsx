/**
 * OpponentZone — top row of the combat arena.
 *
 * Lays out (left → right):
 *   opp hero portrait column · opp hand display column
 *
 * Hero column contains: boss-quip bubble, phase pip strip, BattlefieldHero
 * portrait, opponent hole cards, mana bar. Hand display shows up to 10
 * card backs (or face-up reveals) plus a count badge.
 *
 * All visual classes (`opponent-hero-container`, `opponent-hand-display`,
 * `opponent-revealed-card`, `opponent-card-back`, `opponent-hand-count`,
 * `opponent-hero-mana`) remain in the centralised arena CSS.
 */

import React from 'react';
import { BossQuipBubble } from '../components/BossQuipBubble';
import { PhasePipIndicator } from '../components/PhasePipIndicator';
import { BattlefieldHero } from '../components/BattlefieldHero';
import { HoleCardsOverlay } from '../components/HoleCardsOverlay';
import ManaBar from '../../components/ManaBar';
import CardRenderer from '../../components/CardRendering/CardRenderer';
import type { PokerCard } from '../../types/PokerCombatTypes';
import type { CardInstance } from '../../types';
import type { ShowdownCelebration } from '../hooks/useCombatEvents';

export interface OpponentZoneProps {
	readonly opponentPet: object | null | undefined;
	readonly enrichedOpponentPet: any;
	readonly opponentLevel: number;
	readonly opponentMana: number;
	readonly opponentMaxMana: number;
	readonly opponentHpCommitted: number;
	readonly opponentPosition: 'sb' | 'bb' | 'dealer' | string;
	readonly isOpponentTargetable: boolean;
	readonly opponentSecrets: ReadonlyArray<unknown>;
	readonly opponentHeroClass: string;
	readonly opponentHoleCards: ReadonlyArray<PokerCard>;
	readonly opponentHand: ReadonlyArray<CardInstance>;
	readonly isAllInShowdown: boolean;
	readonly showdownCelebration: ShowdownCelebration | null | undefined;
	readonly waitingForOpponent: boolean;
	readonly bossQuipText: string | null;
	readonly bossQuipKey: number;
	readonly bossPortrait: string | undefined;
	readonly opponentName: string | undefined;
	readonly shakingHero: boolean;
	readonly isPlayerTurn: boolean;
	readonly onOpponentHeroClick: (() => void) | undefined;
}

export const OpponentZone: React.FC<OpponentZoneProps> = ({
	opponentPet,
	enrichedOpponentPet,
	opponentLevel,
	opponentMana,
	opponentMaxMana,
	opponentHpCommitted,
	opponentPosition,
	isOpponentTargetable,
	opponentSecrets,
	opponentHeroClass,
	opponentHoleCards,
	opponentHand,
	isAllInShowdown,
	showdownCelebration,
	waitingForOpponent,
	bossQuipText,
	bossQuipKey,
	bossPortrait,
	opponentName,
	shakingHero,
	isPlayerTurn,
	onOpponentHeroClick,
}) => {
	const isShowdown = showdownCelebration?.resolution.resolutionType === 'showdown';
	const revealedHoleCards = isAllInShowdown || isShowdown;
	const handCount = opponentHand.length;

	return (
		<header
			className={`zone-opp shrink-0 flex flex-row justify-center items-end gap-6 px-6 py-2 ${shakingHero ? 'damage-shake damage-flash' : ''} ${!isPlayerTurn ? 'turn-active' : ''}`}
		>
			{opponentPet && (
				<div data-hero-role="opponent" className="opponent-hero-container flex flex-col items-center gap-2">
					<BossQuipBubble
						text={bossQuipText}
						speakerName={opponentName}
						speakerPortrait={bossPortrait}
						triggerKey={bossQuipKey}
					/>
					<PhasePipIndicator
						opponentCurrentHP={enrichedOpponentPet?.stats?.currentHealth ?? 0}
						opponentMaxHP={enrichedOpponentPet?.stats?.maxHealth ?? 0}
					/>
					<BattlefieldHero
						pet={enrichedOpponentPet}
						hpCommitted={opponentHpCommitted}
						pokerPosition={opponentPosition as any}
						level={opponentLevel}
						onClick={onOpponentHeroClick}
						isTargetable={isOpponentTargetable}
						isOpponent={true}
						secrets={opponentSecrets as any}
						heroClass={opponentHeroClass as any}
						mana={opponentMana}
						maxMana={opponentMaxMana}
						pocketCardsOverlay={(
							<HoleCardsOverlay
								cards={opponentHoleCards as PokerCard[]}
								variant="opponent"
								faceDown={!revealedHoleCards}
								winningCards={showdownCelebration?.winningCards}
								isShowdown={isShowdown}
								activeTurn={waitingForOpponent}
								embedded
							/>
						)}
					/>
					<div className="opponent-hero-mana hero-resource-dock w-55 mt-1 flex justify-center">
						<ManaBar
							currentMana={opponentMana}
							maxMana={opponentMaxMana}
							overloadedMana={0}
							pendingOverload={0}
							variant="hero"
							label="Mana"
						/>
					</div>
				</div>
			)}
			<div className="opponent-hand-display flex justify-center items-start gap-0 relative pt-1 h-15">
				{opponentHand.slice(0, 10).map((card, index) => (
					card.isRevealed ? (
						<div key={card.instanceId || `opp-revealed-${index}`} className="opponent-revealed-card scale-[0.4] -mx-8">
							<CardRenderer card={card} isInHand={true} size="small" />
						</div>
					) : (
						<div key={`opp-card-${index}`} className="opponent-card-back" />
					)
				))}
				{handCount > 0 && (
					<div className="opponent-hand-count">{handCount}</div>
				)}
			</div>
		</header>
	);
};

export default OpponentZone;
