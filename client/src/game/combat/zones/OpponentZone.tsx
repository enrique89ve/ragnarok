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
 * `opponent-revealed-card`, `opponent-card-back`, `opponent-hand-count`)
 * remain in the centralised arena CSS. Face-down hand tiles use the same
 * `<PokerCardFrame variant="face-down"><CardCardBack /></PokerCardFrame>`
 * chrome as community and hole cards.
 */

import React from 'react';
import { BossQuipBubble } from '../components/BossQuipBubble';
import { PhasePipIndicator } from '../components/PhasePipIndicator';
import { BattlefieldHero } from '../components/BattlefieldHero';
import { HoleCardsOverlay } from '../components/HoleCardsOverlay';
import { HeroResourceDock } from '../components/HeroResourceDock';
import SimpleCardCompat from '../../components/card/SimpleCardCompat';
import { PokerCardFrame, CardCardBack } from '../../components/card';
import { toSimpleCardData } from '../../components/card/cardDataAdapter';
import type { PokerCard } from '../../types/PokerCombatTypes';
import type { CardInstance } from '../../types';
import type { ShowdownCelebration } from '../hooks/useCombatEvents';
import { ARENA_VFX_TARGETS, arenaVfxTargetProps } from '../arenaVfxTargets';

const OPPONENT_HAND_VISIBLE_LIMIT = 10;
// Mirrors the opponent hand geometry; the badge follows the right edge of the
// last visible card while the stack grows.
const OPPONENT_HAND_CARD_WIDTH_PX = 77;
const OPPONENT_HAND_CARD_OVERLAP_PX = -38.5;
const OPPONENT_HAND_CARD_STEP_PX = OPPONENT_HAND_CARD_WIDTH_PX + OPPONENT_HAND_CARD_OVERLAP_PX;

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
	const visibleOpponentHand = opponentHand.slice(0, OPPONENT_HAND_VISIBLE_LIMIT);
	const visibleHandCount = visibleOpponentHand.length;
	const handCountAnchorX = OPPONENT_HAND_CARD_WIDTH_PX + Math.max(0, visibleHandCount - 1) * OPPONENT_HAND_CARD_STEP_PX;
	const opponentHandStyle = {
		'--opponent-visible-hand-count': String(visibleHandCount),
		'--opponent-hand-count-anchor-x': `${handCountAnchorX}px`,
	} as React.CSSProperties & Record<'--opponent-visible-hand-count' | '--opponent-hand-count-anchor-x', string>;

	return (
		<header
			className={`zone-opp combat-zone combat-zone--opponent ${!isPlayerTurn ? 'turn-active' : ''}`}
		>
			{opponentPet && (
				<div data-hero-role="opponent" className="opponent-hero-container" {...arenaVfxTargetProps(ARENA_VFX_TARGETS.opponentHero)}>
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
						frameComposition="poker-v1"
						mana={opponentMana}
						maxMana={opponentMaxMana}
						shakingHero={shakingHero}
					/>
					<HeroResourceDock owner="opponent" currentMana={opponentMana} maxMana={opponentMaxMana} />
					<HoleCardsOverlay
						cards={opponentHoleCards as PokerCard[]}
						variant="opponent"
						faceDown={!revealedHoleCards}
						winningCards={showdownCelebration?.winningCards}
						isShowdown={isShowdown}
						activeTurn={waitingForOpponent}
					/>
				</div>
			)}
			<div className="opponent-hand-display" style={opponentHandStyle}>
				{visibleOpponentHand.map((card, index) => (
					card.isRevealed ? (
						<div key={card.instanceId || `opp-revealed-${index}`} className="opponent-revealed-card">
							{(() => {
								const simpleData = toSimpleCardData(card);
								if (!simpleData) return null;
								return <SimpleCardCompat card={simpleData} size="small" />;
							})()}
						</div>
					) : (
						<div key={`opp-card-${index}`} className="opponent-card-back">
							<PokerCardFrame
								size="small"
								variant="face-down"
								style={{ width: '100%', height: '100%' }}
							>
								<CardCardBack />
							</PokerCardFrame>
						</div>
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
