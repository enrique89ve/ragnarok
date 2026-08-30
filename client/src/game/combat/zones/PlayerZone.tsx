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
import PokerHandIcon from '../components/PokerHandIcon';

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
	readonly handVisualClass: string;
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
	readonly handIsPlayWindowOpen: boolean;
	readonly handIsInteractionDisabled: boolean;
	readonly heroHealth: number;
	readonly evolveReadyIds: ReadonlySet<string>;
	readonly playerBattlefield: ReadonlyArray<unknown>;
	readonly handleCardPlay: (card: any, pos?: any) => void;
	readonly registerCardPosition: (card: CardInstance, position: Position) => void;
	readonly battlefieldRef: React.RefObject<HTMLDivElement | null>;
	readonly onCardInspect: (card: CardInstance) => void;
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
	handVisualClass,
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
	handIsPlayWindowOpen,
	handIsInteractionDisabled,
	heroHealth,
	evolveReadyIds,
	playerBattlefield,
	handleCardPlay,
	registerCardPosition,
	battlefieldRef,
	onCardInspect,
}) => {
	const isShowdown = showdownCelebration?.resolution.resolutionType === 'showdown';

	return (
		<footer className="zone-player combat-zone combat-zone--player">
			{playerPet && (
				<div
					className={`unified-hero-section ${isPlayerTurn ? 'turn-active' : ''}`}
				>
					<div data-hero-role="player" className="poker-hero-container" {...arenaVfxTargetProps(ARENA_VFX_TARGETS.playerHero)}>
						<BattlefieldHero
							pet={enrichedPlayerPet}
							hpCommitted={playerHpCommitted}
							pokerPosition={playerPosition as any}
							level={playerLevel}
							onClick={onPlayerHeroClick}
							isTargetable={isPlayerTargetable}
							isOpponent={false}
							secrets={playerSecrets as any}
							heroClass={playerHeroClass as any}
							mana={playerMana}
							maxMana={playerMaxMana}
							onHeroPowerClick={onHeroPowerClick}
							onWeaponUpgradeClick={onWeaponUpgradeClick}
							onOpenEquipment={onOpenGearPanel}
							isWeaponUpgraded={isWeaponUpgraded}
							frameComposition="poker-v1"
							artifact={artifact}
							shakingHero={shakingHero}
							pocketCardsOverlay={(
								<HoleCardsOverlay
									cards={playerHoleCards as PokerCard[]}
									variant="player"
									winningCards={showdownCelebration?.winningCards}
									isShowdown={isShowdown}
									activeTurn={isMyTurnToAct}
								/>
							)}
						/>
						<HeroResourceDock owner="player" currentMana={playerMana} maxMana={playerMaxMana} />
						{playerHandEval && playerHandEval.rank > PokerHandRank.HIGH_CARD && (
							<div
								className={`hand-strength-compact ${handVisualClass} absolute -bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 pointer-events-none whitespace-nowrap`}
								data-hand-rank={playerHandEval.rank}
								aria-label={`Current hand: ${playerHandEval.displayName}`}
							>
								<span className="strength-icon" aria-hidden="true">
									<PokerHandIcon />
								</span>
								<span className="strength-name">{playerHandEval.displayName}</span>
							</div>
						)}
					</div>
				</div>
			)}
			<div className="unified-hand-section">
				{handCards.length > 0 && (
					<div className="poker-hand-container">
						<HandFan
							cards={handCards as any}
							currentMana={handCurrentMana}
							heroHealth={heroHealth}
							isPlayerTurn={handIsPlayerTurn}
							isPlayWindowOpen={handIsPlayWindowOpen}
							isInteractionDisabled={handIsInteractionDisabled}
							onCardPlay={handleCardPlay}
							registerCardPosition={registerCardPosition}
							battlefieldRef={battlefieldRef}
							evolveReadyIds={evolveReadyIds as Set<string>}
							battlefieldCount={playerBattlefield.length}
							playerBattlefield={playerBattlefield as any}
							onCardInspect={onCardInspect}
						/>
					</div>
				)}
			</div>
		</footer>
	);
};

export default PlayerZone;
