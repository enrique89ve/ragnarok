import React from 'react';
import { getElementColor, getElementIcon, ELEMENT_LABELS, type ElementType } from '../../utils/elements/elementAdvantage';
import '../styles/game-hud.css';

const glyphStrokeProps = {
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: 1.7,
	strokeLinecap: 'round' as const,
	strokeLinejoin: 'round' as const,
};

const DeckGlyph = () => (
	<svg viewBox="0 0 20 20" aria-hidden="true">
		<rect x="5.2" y="4.4" width="9.6" height="12" rx="1.6" {...glyphStrokeProps} />
		<path d="M7 7.4h6M7 10h6M7 12.6h4.4" {...glyphStrokeProps} />
		<path d="M3.8 6.1 5.2 4.8M3.8 13.9l1.4 1.3" {...glyphStrokeProps} opacity="0.6" />
	</svg>
);

const HandGlyph = () => (
	<svg viewBox="0 0 20 20" aria-hidden="true">
		<path d="M4.6 14.8 6.9 6.7a1.2 1.2 0 0 1 1.5-.8l5.7 1.7a1.2 1.2 0 0 1 .8 1.5l-2.3 8.1a1.2 1.2 0 0 1-1.5.8l-5.7-1.7a1.2 1.2 0 0 1-.8-1.5Z" {...glyphStrokeProps} />
		<path d="m9.2 6.6 4.6 1.3M8.5 9.1l4.6 1.4M7.9 11.7l3.8 1.1" {...glyphStrokeProps} opacity="0.8" />
	</svg>
);

const StakesGlyph = () => (
	<svg viewBox="0 0 20 20" aria-hidden="true">
		<circle cx="10" cy="10" r="6.2" {...glyphStrokeProps} />
		<path d="M10 6.3v7.4M7.4 8.4c0-1.1 1-1.9 2.6-1.9s2.6.8 2.6 1.9-1 1.7-2.6 1.9-2.6.8-2.6 1.9S8.4 14 10 14s2.6-.8 2.6-1.9" {...glyphStrokeProps} />
	</svg>
);

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
	playerElement,
	opponentElement,
	playerHasAdvantage = false,
	opponentHasAdvantage = false,
}) => {
	const showMatchup = playerElement && opponentElement && playerElement !== 'neutral' && opponentElement !== 'neutral';
	const showCommitment = playerCommitted > 0 || opponentCommitted > 0;

	return (
		<div className="game-hud">
			<div className={`hud-status-ribbon ${isPlayerTurn ? 'player-active' : 'opponent-active'}`}>
				<span className="hud-status-chip hud-status-turn">Turn {turnNumber}</span>
				<span className="hud-status-chip hud-status-phase">Phase {phaseLabel}</span>
				<span className="hud-status-chip hud-status-initiative">{isPlayerTurn ? 'Initiative Yours' : 'Initiative Enemy'}</span>
				<span className="hud-status-chip hud-status-pot">
					<span className="hud-chip-icon">
						<StakesGlyph />
					</span>
					Stakes {pot} HP
				</span>
				{showCommitment && (
					<span className="hud-status-breakdown">
						Committed You {playerCommitted} · Them {opponentCommitted}
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
						{getElementIcon(playerElement!)}
					</span>
					<span className="hud-matchup-arrow">
						{playerHasAdvantage ? '\u25B2' : opponentHasAdvantage ? '\u25BC' : '\u2014'}
					</span>
					<span className="hud-matchup-icon" style={{ color: getElementColor(opponentElement!) }}>
						{getElementIcon(opponentElement!)}
					</span>
				</div>
			)}

			<div className={`hud-deck-badge hud-player-deck ${playerDeckCount <= 0 ? 'empty' : playerDeckCount <= 5 ? 'low-deck' : ''}`}>
				<span className="hud-badge-label">Your Deck</span>
				<span className="hud-icon">
					<DeckGlyph />
				</span>
				<span className="hud-count">{playerDeckCount}</span>
			</div>

			<div className={`hud-deck-badge hud-opponent-deck ${opponentDeckCount <= 0 ? 'empty' : opponentDeckCount <= 5 ? 'low-deck' : ''}`}>
				<span className="hud-badge-label">Enemy Deck</span>
				<span className="hud-icon">
					<DeckGlyph />
				</span>
				<span className="hud-count">{opponentDeckCount}</span>
			</div>

			<div className="hud-deck-badge hud-opponent-hand">
				<span className="hud-badge-label">Enemy Hand</span>
				<span className="hud-icon">
					<HandGlyph />
				</span>
				<span className="hud-count">{opponentHandCount}</span>
			</div>
		</div>
	);
};
