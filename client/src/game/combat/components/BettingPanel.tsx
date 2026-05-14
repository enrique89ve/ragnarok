import React from 'react';
import { CombatAction } from '../../types/PokerCombatTypes';
import type { ActionPermissions } from '../../hooks/usePokerCombatAdapter';

const SwordIcon: React.FC = () => (
	<svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
		<path d="M16.5 1l-1 3.5-1.2 1.2-5.8 5.8-1.4-1.4 5.8-5.8L14 3.1 15.5 1h1zM7.6 11l1.4 1.4-2.3 2.3 1.1 1.1a1 1 0 01-1.4 1.4l-1.1-1.1-1.8 1.8a1 1 0 01-1.4-1.4l1.8-1.8-1.1-1.1a1 1 0 011.4-1.4l1.1 1.1L7.6 11z" />
	</svg>
);

const CrossedSwordsIcon: React.FC = () => (
	<svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
		<path d="M3.5 1l1 3.5 1.2 1.2 4.3 4.3 4.3-4.3L15.5 4.5l1-3.5h1L16 5.3l-1.2 1.2L10 11.3l-1.5 1.5 1.1 1.1a1 1 0 01-1.4 1.4l-1.1-1.1-1.8 1.8a1 1 0 01-1.4-1.4l1.8-1.8-1.1-1.1a1 1 0 011.4-1.4l1.1 1.1L8.6 10 4.3 5.7 3.1 4.5 1 5.5V4.5L2.5 1h1z" />
		<path d="M11.4 12.4l1.5-1.5 4.8 4.8-1.2 1.2L18 18.5a1 1 0 01-1.4 1.4l-1.6-1.6-1.2 1.2-4.8-4.8z" opacity="0.85" />
	</svg>
);

const ShieldIcon: React.FC = () => (
	<svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
		<path d="M10 1L3 4v5c0 4.5 3 8.3 7 9.8 4-1.5 7-5.3 7-9.8V4l-7-3zm0 2.2L15 5.8v3.4c0 3.5-2.2 6.5-5 7.8-2.8-1.3-5-4.3-5-7.8V5.8L10 3.2z" />
		<circle cx="10" cy="9.5" r="2.5" opacity="0.6" />
	</svg>
);

const HelmIcon: React.FC = () => (
	<svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
		<path d="M10 2C6.5 2 3.5 4.5 3 8v3c0 .6.4 1 1 1h1v2.5c0 .8.7 1.5 1.5 1.5h1c.6 0 1-.3 1.2-.8L10 13l1.3 2.2c.2.5.6.8 1.2.8h1c.8 0 1.5-.7 1.5-1.5V12h1c.6 0 1-.4 1-1V8c-.5-3.5-3.5-6-7-6zM5 8.5c.3-2.5 2.5-4.5 5-4.5s4.7 2 5 4.5V10H5V8.5z" />
		<path d="M9.2 7h1.6v3H9.2V7z" opacity="0.5" />
	</svg>
);

const QUICK_BETS: ReadonlyArray<{ readonly label: string; readonly pct: number }> = [
	{ label: '25%', pct: 0.25 },
	{ label: '50%', pct: 0.5 },
	{ label: 'ALL', pct: 1.0 },
] as const;

export interface BettingPanelProps {
	readonly permissions: ActionPermissions | null;
	readonly betAmount: number;
	readonly onBetAmountChange: (value: number) => void;
	readonly onAction: (action: CombatAction, hp?: number) => void;
	readonly onAutoAttackFrontline: () => void;
	readonly showFrontlineButton: boolean;
}

export const BettingPanel: React.FC<BettingPanelProps> = ({
	permissions,
	betAmount,
	onBetAmountChange,
	onAction,
	onAutoAttackFrontline,
	showFrontlineButton,
}) => {
	if (!permissions) {
		return null;
	}

	const {
		hasBetToCall,
		toCall,
		availableHP,
		minBet,
		canCheck,
		canBet,
		canCall,
		canRaise,
		canFold,
		maxBetAmount,
		isAllIn,
		isMyTurnToAct,
	} = permissions;

	const isDisabled = !isMyTurnToAct;
	const maxBet = Math.max(1, availableHP);
	const clampedBet = Math.min(betAmount, maxBet);
	const effectiveBet = maxBetAmount >= minBet ? Math.min(Math.max(minBet, clampedBet), maxBetAmount) : 0;
	const actualCanRaise = canRaise && maxBetAmount >= minBet && effectiveBet >= minBet;
	const attackHP = hasBetToCall ? toCall + effectiveBet : effectiveBet;
	const callHP = Math.min(toCall, availableHP);

	return (
		<div
			className="absolute left-1/2 bottom-67.5 z-200 flex w-80 -translate-x-1/2 flex-col items-stretch gap-1"
			data-zone="betting-panel"
		>
			<div className="poker-hp-slider-container">
				<div className="poker-quick-bets">
					{QUICK_BETS.map(({ label, pct }) => {
						const target = Math.max(minBet || 1, Math.floor((maxBetAmount || 100) * pct));
						return (
							<button
								key={label}
								type="button"
								className={`quick-bet-btn ${label === 'ALL' ? 'all-in' : ''}`}
								onClick={() => onBetAmountChange(Math.min(target, maxBetAmount || 100))}
								disabled={isDisabled}
							>
								{label}
							</button>
						);
					})}
				</div>
				<input
					type="range"
					min={minBet || 1}
					max={maxBetAmount || 100}
					value={betAmount}
					onChange={(e) => onBetAmountChange(Number(e.target.value))}
					className="poker-hp-slider"
					disabled={isDisabled}
				/>
				<span className="slider-value">{betAmount} HP</span>
			</div>

			<div className="unified-betting-actions poker-actions">
				<div className="action-buttons-group">
					<button
						type="button"
						className="poker-btn raise-btn"
						onClick={() => onAction(
							hasBetToCall ? CombatAction.COUNTER_ATTACK : CombatAction.ATTACK,
							effectiveBet,
						)}
						disabled={isDisabled || (hasBetToCall ? !actualCanRaise : !canBet)}
						title={hasBetToCall ? 'Raise — increase the stakes' : 'Bet — commit HP to the pot'}
					>
						<SwordIcon />
						<span className="btn-label">{hasBetToCall ? 'RAISE' : 'BET'}</span>
						<span className="btn-text">{attackHP} HP</span>
					</button>

					<button
						type="button"
						className="poker-btn call-btn"
						onClick={() => onAction(canCall ? CombatAction.ENGAGE : CombatAction.DEFEND)}
						disabled={isDisabled || (!canCall && !canCheck)}
						title={canCall ? 'Call — match the bet' : 'Check — pass without betting'}
					>
						{canCall ? (
							<>
								<CrossedSwordsIcon />
								<span className="btn-label">CALL</span>
								<span className="btn-text">{isAllIn ? `ALL-IN ${callHP}` : `${callHP} HP`}</span>
							</>
						) : (
							<>
								<HelmIcon />
								<span className="btn-label">CHECK</span>
							</>
						)}
					</button>

					<button
						type="button"
						className="poker-btn fold-btn"
						onClick={() => onAction(CombatAction.BRACE)}
						disabled={isDisabled || !canFold}
						title="Fold — surrender this hand and lose committed HP"
					>
						<ShieldIcon />
						<span className="btn-label">FOLD</span>
					</button>

					{showFrontlineButton && (
						<button
							type="button"
							className="poker-btn auto-attack-btn"
							onClick={onAutoAttackFrontline}
							title="Order the frontline to attack enemy minions automatically"
						>
							<CrossedSwordsIcon />
							<span className="btn-text">Frontline</span>
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export default BettingPanel;
