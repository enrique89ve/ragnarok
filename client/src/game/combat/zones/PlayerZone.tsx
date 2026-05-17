/**
 * PlayerZone — bottom row of the combat arena.
 *
 * Lays out (left → right):
 *   player hero portrait column · player hand fan
 *
 * Hero column shows BattlefieldHero + mana bar + hole cards + the small
 * "hand-strength-compact" indicator that appears once the player's best
 * 5-card hand reaches at least a pair. Hand fan renders the card
 * playing surface (HandFan handles the splayed-cards layout itself).
 *
 * Click-through is controlled with `pointer-events-none` on the footer
 * and `pointer-events-auto` on the hero + hand wrappers so empty space
 * around them stays click-transparent (so the player can still target
 * minions / hero behind in PvE-targeting modes).
 */

import React from 'react';
import { BattlefieldHero } from '../components/BattlefieldHero';
import { HoleCardsOverlay } from '../components/HoleCardsOverlay';
import { HeroResourceDock } from '../components/HeroResourceDock';
import HandFan from '../../components/HandFan';
import { PokerHandRank, type PokerCard } from '../../types/PokerCombatTypes';
import type { CardInstance } from '../../types';
import type { Position } from '../../types/Position';
import type { ShowdownCelebration } from '../hooks/useCombatEvents';
import { ARENA_VFX_TARGETS, arenaVfxTargetProps } from '../arenaVfxTargets';

// Inline SVG used by the small hand-strength badge under the hero portrait.
const CardFanIcon = () => (
	<svg className="btn-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
		<path d="M5.2 4.6 10.1 3a1.7 1.7 0 0 1 2.1 1.1l2.2 6.8a1.7 1.7 0 0 1-1.1 2.1l-4.9 1.6a1.7 1.7 0 0 1-2.1-1.1L4 6.7a1.7 1.7 0 0 1 1.2-2.1Z"/>
		<path d="m8.3 6.5 3.8-1.2"/>
		<path d="m9.1 9 3.7-1.2"/>
		<path d="M12.7 6.6 14.2 6a1.7 1.7 0 0 1 2.1 1.1l1.1 3.6a1.7 1.7 0 0 1-1.1 2.1l-1.7.6"/>
	</svg>
);

export interface PlayerZoneProps {
	readonly playerPet: object | null | undefined;
	readonly enrichedPlayerPet: any;
	readonly playerLevel: number;
	readonly playerMana: number;
	readonly playerMaxMana: number;
	readonly playerHpCommitted: number;
	readonly playerPosition: 'sb' | 'bb' | 'dealer' | string;
	readonly isPlayerTargetable: boolean;
	readonly playerSecrets: ReadonlyArray<unknown>;
	readonly playerHeroClass: string;
	readonly playerHoleCards: ReadonlyArray<PokerCard>;
	readonly artifact: { name: string; attack: number } | undefined;
	readonly showdownCelebration: ShowdownCelebration | null | undefined;
	readonly isMyTurnToAct: boolean;
	readonly playerHandEval: { rank: PokerHandRank; displayName: string } | null | undefined;
	readonly handStrengthClass: string;
	readonly handStrengthPercent: number;
	readonly shakingHero: boolean;
	readonly isPlayerTurn: boolean;
	readonly onPlayerHeroClick: (() => void) | undefined;
	readonly onOpenGearPanel: () => void;
	readonly onHeroPowerClick: (() => void) | undefined;
	readonly onWeaponUpgradeClick: (() => void) | undefined;
	readonly isWeaponUpgraded: boolean;
	readonly handCards: ReadonlyArray<unknown>;
	readonly handCurrentMana: number;
	readonly handIsPlayerTurn: boolean;
	readonly heroHealth: number;
	readonly evolveReadyIds: ReadonlySet<string>;
	readonly playerBattlefield: ReadonlyArray<unknown>;
	readonly onCardPlay: ((card: any, pos?: any) => void) | undefined;
	readonly handleCardPlay: (card: any, pos?: any) => void;
	readonly registerCardPosition: (card: CardInstance, position: Position) => void;
	readonly battlefieldRef: React.RefObject<HTMLDivElement>;
}

export const PlayerZone: React.FC<PlayerZoneProps> = ({
	playerPet,
	enrichedPlayerPet,
	playerLevel,
	playerMana,
	playerMaxMana,
	playerHpCommitted,
	playerPosition,
	isPlayerTargetable,
	playerSecrets,
	playerHeroClass,
	playerHoleCards,
	artifact,
	showdownCelebration,
	isMyTurnToAct,
	playerHandEval,
	handStrengthClass,
	handStrengthPercent,
	shakingHero,
	isPlayerTurn,
	onPlayerHeroClick,
	onOpenGearPanel,
	onHeroPowerClick,
	onWeaponUpgradeClick,
	isWeaponUpgraded,
	handCards,
	handCurrentMana,
	handIsPlayerTurn,
	heroHealth,
	evolveReadyIds,
	playerBattlefield,
	onCardPlay,
	handleCardPlay,
	registerCardPosition,
	battlefieldRef,
}) => {
	const isShowdown = showdownCelebration?.resolution.resolutionType === 'showdown';

	return (
		<footer className="zone-player combat-zone combat-zone--player">
			{playerPet && (
				<div
					className={`unified-hero-section ${shakingHero ? 'damage-shake damage-flash' : ''} ${isPlayerTurn ? 'turn-active' : ''}`}
				>
					<div data-hero-role="player" className="poker-hero-container" {...arenaVfxTargetProps(ARENA_VFX_TARGETS.playerHero)}>
						<BattlefieldHero
							pet={enrichedPlayerPet}
							hpCommitted={playerHpCommitted}
							pokerPosition={playerPosition as any}
							level={playerLevel}
							onClick={() => { onPlayerHeroClick?.(); onOpenGearPanel(); }}
							isTargetable={isPlayerTargetable}
							isOpponent={false}
							secrets={playerSecrets as any}
							heroClass={playerHeroClass as any}
							mana={playerMana}
							maxMana={playerMaxMana}
							onHeroPowerClick={onHeroPowerClick}
							onWeaponUpgradeClick={onWeaponUpgradeClick}
							isWeaponUpgraded={isWeaponUpgraded}
							artifact={artifact}
							pocketCardsOverlay={(
								<HoleCardsOverlay
									cards={playerHoleCards as PokerCard[]}
									variant="player"
									winningCards={showdownCelebration?.winningCards}
									isShowdown={isShowdown}
									activeTurn={isMyTurnToAct}
									embedded
								/>
							)}
						/>
						<HeroResourceDock owner="player" currentMana={playerMana} maxMana={playerMaxMana} />
						{playerHandEval && playerHandEval.rank > PokerHandRank.HIGH_CARD && (
							<div className="hand-strength-compact absolute -bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 pointer-events-none whitespace-nowrap">
								<span className="strength-icon" aria-hidden="true">
									<CardFanIcon />
								</span>
								<span className={`strength-name ${handStrengthClass}`}>{playerHandEval.displayName}</span>
								<div className="hand-strength-bar">
									<div className={`hand-strength-fill ${handStrengthClass}`} style={{ transform: `scaleX(${handStrengthPercent / 100})` }} />
								</div>
							</div>
						)}
					</div>
				</div>
			)}
			<div className="unified-hand-section">
				{handCards.length > 0 && onCardPlay && (
					<div className="poker-hand-container">
						<HandFan
							cards={handCards as any}
							currentMana={handCurrentMana}
							heroHealth={heroHealth}
							isPlayerTurn={handIsPlayerTurn}
							onCardPlay={handleCardPlay}
							registerCardPosition={registerCardPosition}
							battlefieldRef={battlefieldRef}
							evolveReadyIds={evolveReadyIds as Set<string>}
							battlefieldCount={playerBattlefield.length}
							playerBattlefield={playerBattlefield as any}
						/>
					</div>
				)}
			</div>
		</footer>
	);
};

export default PlayerZone;
