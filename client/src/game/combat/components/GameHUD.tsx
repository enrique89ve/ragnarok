import React from 'react';
import { getElementColor, ELEMENT_LABELS, type ElementType } from '../../utils/elements/elementAdvantage';
import { getElementIcon } from '../../components/ui/ElementIconsSVG';
import { GameIcon } from '../../utils/ui/GameIcon';
import { ARENA_VFX_TARGETS, arenaVfxTargetProps } from '../arenaVfxTargets';
import { getPokerTurnBadgePresentation } from '../decision/pokerTurnBadgePresentation';
import '../styles/game-hud.css';

interface GameHUDProps {
	turnNumber: number;
	playerDeckCount: number;
	opponentDeckCount: number;
	opponentHandCount: number;
	phaseLabel?: string;
	pot?: number;
	playerCommitted?: number;
	opponentCommitted?: number;
	isPlayerTurn?: boolean;
	toCall?: number;
	playerElement?: ElementType;
	opponentElement?: ElementType;
	playerHasAdvantage?: boolean;
	opponentHasAdvantage?: boolean;
}

export const GameHUD: React.FC<GameHUDProps> = ({
	turnNumber,
	playerDeckCount,
	opponentDeckCount,
	opponentHandCount,
	phaseLabel = 'Battle Ready',
	pot = 0,
	playerCommitted = 0,
	opponentCommitted = 0,
	isPlayerTurn = false,
	toCall = 0,
	playerElement,
	opponentElement,
	playerHasAdvantage = false,
	opponentHasAdvantage = false,
}) => {
	const showMatchup = playerElement && opponentElement && playerElement !== 'neutral' && opponentElement !== 'neutral';
	const showCommitment = playerCommitted > 0 || opponentCommitted > 0;
	const turnBadge = getPokerTurnBadgePresentation(isPlayerTurn ? 'player' : 'opponent');

	return (
		<div className="game-hud">
			<div className={`hud-status-ribbon ${isPlayerTurn ? 'player-active' : 'opponent-active'}`}>
				<span className="hud-status-chip hud-status-turn">Turn <span className="hud-numeric">{turnNumber}</span></span>
				<span className="hud-status-chip hud-status-phase">Phase {phaseLabel}</span>
				<span
					className="hud-status-chip hud-status-initiative"
					aria-live="polite"
					aria-label={turnBadge?.ariaLabel}
				>
					{isPlayerTurn ? 'Initiative Yours' : 'Initiative Enemy'}
				</span>
				<span
					className="hud-status-chip hud-status-pot"
					{...arenaVfxTargetProps(ARENA_VFX_TARGETS.riskDisplay)}
				>
					<span className="hud-chip-icon">
						<GameIcon name="scale" size={18} aria-hidden="true" />
					</span>
					Stakes <span className="hud-numeric">{pot}</span> HP
				</span>
				{toCall > 0 && (
					<span className="hud-status-chip hud-status-call">To call <span className="hud-numeric">{toCall}</span> HP</span>
				)}
				{showCommitment && (
					<span className="hud-status-breakdown">
						Committed You <span className="hud-numeric">{playerCommitted}</span> · Them{' '}
						<span className="hud-numeric">{opponentCommitted}</span>
					</span>
				)}
			</div>

			{showMatchup && (
				<div
					className={`hud-matchup-badge ${playerHasAdvantage ? 'advantage' : opponentHasAdvantage ? 'disadvantage' : 'neutral-matchup'}`}
					title={
						playerHasAdvantage
							? `Your ${ELEMENT_LABELS[playerElement!]} beats their ${ELEMENT_LABELS[opponentElement!]} — +2 ATK, +2 HP per minion, +20 Armor`
							: opponentHasAdvantage
								? `Their ${ELEMENT_LABELS[opponentElement!]} beats your ${ELEMENT_LABELS[playerElement!]} — Enemy gets +2/+2 per minion, +20 Armor`
								: `${ELEMENT_LABELS[playerElement!]} vs ${ELEMENT_LABELS[opponentElement!]} — No elemental advantage`
					}
				>
					<span className="hud-matchup-icon" style={{ color: getElementColor(playerElement!) }}>
						{React.createElement(getElementIcon(playerElement!), { 'aria-hidden': true })}
					</span>
					<span className="hud-matchup-arrow">
						{playerHasAdvantage ? <GameIcon name="arrowUp" size={14} /> : opponentHasAdvantage ? <GameIcon name="arrowDown" size={14} /> : <span aria-hidden="true">vs</span>}
					</span>
					<span className="hud-matchup-icon" style={{ color: getElementColor(opponentElement!) }}>
						{React.createElement(getElementIcon(opponentElement!), { 'aria-hidden': true })}
					</span>
				</div>
			)}

			<div className={`hud-deck-badge hud-player-deck ${playerDeckCount <= 0 ? 'empty' : playerDeckCount <= 5 ? 'low-deck' : ''}`}>
				<span className="hud-badge-label">Your Deck</span>
				<span className="hud-icon">
					<GameIcon name="book" size={20} aria-hidden="true" />
				</span>
				<span className="hud-count">{playerDeckCount}</span>
			</div>

			<div className={`hud-deck-badge hud-opponent-deck ${opponentDeckCount <= 0 ? 'empty' : opponentDeckCount <= 5 ? 'low-deck' : ''}`}>
				<span className="hud-badge-label">Enemy Deck</span>
				<span className="hud-icon">
					<GameIcon name="book" size={20} aria-hidden="true" />
				</span>
				<span className="hud-count">{opponentDeckCount}</span>
			</div>

			<div className="hud-deck-badge hud-opponent-hand">
				<span className="hud-badge-label">Enemy Hand</span>
				<span className="hud-icon">
					<GameIcon name="hand" size={20} aria-hidden="true" />
				</span>
				<span className="hud-count">{opponentHandCount}</span>
			</div>
		</div>
	);
};
