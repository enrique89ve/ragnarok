import React from 'react';
import { CombatAction } from '../../types/PokerCombatTypes';
import type { ActionPermissions } from '../../hooks/usePokerCombatAdapter';
import {
	BETTING_ACTION_LABEL,
	bettingCommitKind,
	bettingDisabledReason,
	bettingMatchKind,
	pokerQuickBetHp,
} from './bettingPanelCopy';

const SwordIcon: React.FC = () => (
	<svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false">
		<path d="M16.5 1l-1 3.5-1.2 1.2-5.8 5.8-1.4-1.4 5.8-5.8L14 3.1 15.5 1h1zM7.6 11l1.4 1.4-2.3 2.3 1.1 1.1a1 1 0 01-1.4 1.4l-1.1-1.1-1.8 1.8a1 1 0 01-1.4-1.4l1.8-1.8-1.1-1.1a1 1 0 011.4-1.4l1.1 1.1L7.6 11z" />
	</svg>
);

const CrossedSwordsIcon: React.FC = () => (
	<svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false">
		<path d="M3.5 1l1 3.5 1.2 1.2 4.3 4.3 4.3-4.3L15.5 4.5l1-3.5h1L16 5.3l-1.2 1.2L10 11.3l-1.5 1.5 1.1 1.1a1 1 0 01-1.4 1.4l-1.1-1.1-1.8 1.8a1 1 0 01-1.4-1.4l1.8-1.8-1.1-1.1a1 1 0 011.4-1.4l1.1 1.1L8.6 10 4.3 5.7 3.1 4.5 1 5.5V4.5L2.5 1h1z" />
		<path d="M11.4 12.4l1.5-1.5 4.8 4.8-1.2 1.2L18 18.5a1 1 0 01-1.4 1.4l-1.6-1.6-1.2 1.2-4.8-4.8z" opacity="0.85" />
	</svg>
);

const ShieldIcon: React.FC = () => (
	<svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false">
		<path d="M10 1L3 4v5c0 4.5 3 8.3 7 9.8 4-1.5 7-5.3 7-9.8V4l-7-3zm0 2.2L15 5.8v3.4c0 3.5-2.2 6.5-5 7.8-2.8-1.3-5-4.3-5-7.8V5.8L10 3.2z" />
		<circle cx="10" cy="9.5" r="2.5" opacity="0.6" />
	</svg>
);

const HelmIcon: React.FC = () => (
	<svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false">
		<path d="M10 2C6.5 2 3.5 4.5 3 8v3c0 .6.4 1 1 1h1v2.5c0 .8.7 1.5 1.5 1.5h1c.6 0 1-.3 1.2-.8L10 13l1.3 2.2c.2.5.6.8 1.2.8h1c.8 0 1.5-.7 1.5-1.5V12h1c.6 0 1-.4 1-1V8c-.5-3.5-3.5-6-7-6zM5 8.5c.3-2.5 2.5-4.5 5-4.5s4.7 2 5 4.5V10H5V8.5z" />
		<path d="M9.2 7h1.6v3H9.2V7z" opacity="0.5" />
	</svg>
);

const FrontlineIcon: React.FC = () => (
	<svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false">
		<path d="M5 2.5a1 1 0 012 0V4h8.5l-2 3 2 3H7v7.5a1 1 0 01-2 0v-15z" />
		<path d="M2 15.5c1.2-2.4 3.8-4 8-4s6.8 1.6 8 4c-1.4 1.1-4.2 2-8 2s-6.6-.9-8-2z" opacity="0.62" />
		<path d="M4.8 14.8a1.2 1.2 0 112.4 0 1.2 1.2 0 01-2.4 0zm4 0a1.2 1.2 0 112.4 0 1.2 1.2 0 01-2.4 0zm4 0a1.2 1.2 0 112.4 0 1.2 1.2 0 01-2.4 0z" opacity="0.9" />
	</svg>
);

const ButtonIconFrame: React.FC<{ readonly children: React.ReactNode }> = ({ children }) => (
	<span className="btn-icon-frame" aria-hidden="true">
		{children}
	</span>
);

function PokerActionButton({
	actionId,
	className,
	disabled,
	hp,
	icon,
	label,
	onClick,
	reason,
}: {
	readonly actionId: string;
	readonly className: string;
	readonly disabled: boolean;
	readonly hp?: number;
	readonly icon: React.ReactNode;
	readonly label: string;
	readonly onClick: () => void;
	readonly reason: string | null;
}): React.ReactElement {
	const aria = hp && hp > 0 ? `${label} ${hp} HP` : label;
	return (
		<button
			type="button"
			className={`poker-btn ${className}`}
			data-poker-action={actionId}
			onClick={onClick}
			disabled={disabled}
			aria-label={aria}
			title={reason ?? aria}
		>
			<ButtonIconFrame>{icon}</ButtonIconFrame>
			<span className="btn-copy">
				<span className="btn-label">{label}</span>
				{hp != null && hp > 0 ? <span className="btn-hp">{hp} HP</span> : null}
			</span>
		</button>
	);
}

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
		isMyTurnToAct,
	} = permissions;

	const isDisabled = !isMyTurnToAct;
	const sliderMax = Math.max(0, maxBetAmount);
	const sliderMin = sliderMax > 0 ? Math.max(1, minBet) : 0;
	const clampedBet = sliderMax > 0 ? Math.min(Math.max(sliderMin, betAmount), sliderMax) : 0;
	const effectiveBet = maxBetAmount >= minBet ? clampedBet : 0;
	const actualCanRaise = canRaise && maxBetAmount >= minBet && effectiveBet >= minBet;
	const commitKind = bettingCommitKind(hasBetToCall);
	const matchKind = bettingMatchKind(hasBetToCall);
	const commitAllowed = hasBetToCall ? actualCanRaise : canBet;
	const matchAllowed = hasBetToCall ? canCall : canCheck;
	const commitHP = hasBetToCall ? toCall + effectiveBet : effectiveBet;
	const callHP = Math.min(toCall, availableHP);
	const commitReason = bettingDisabledReason({
		isMyTurn: isMyTurnToAct,
		kind: commitKind,
		allowed: commitAllowed,
		availableHP,
		toCall,
		minBet,
	});
	const matchReason = bettingDisabledReason({
		isMyTurn: isMyTurnToAct,
		kind: matchKind,
		allowed: matchAllowed,
		availableHP,
		toCall,
		minBet,
	});
	const foldReason = bettingDisabledReason({
		isMyTurn: isMyTurnToAct,
		kind: 'fold',
		allowed: canFold,
		availableHP,
		toCall,
		minBet,
	});
	const allInReason = bettingDisabledReason({
		isMyTurn: isMyTurnToAct,
		kind: 'all_in',
		allowed: sliderMax > 0,
		availableHP,
		toCall,
		minBet,
	});

	return (
		<div
			className="betting-panel"
			data-zone="betting-panel"
		>
			<div className="poker-hp-slider-container">
				<div className="poker-quick-bets">
					{QUICK_BETS.map(({ label, pct }) => {
						const target = pokerQuickBetHp({ pct, maxBetAmount: sliderMax, minBet });
						const isAllIn = label === 'ALL';
						return (
							<button
								key={label}
								type="button"
								className={`quick-bet-btn ${isAllIn ? 'all-in' : ''}`}
								onClick={() => onBetAmountChange(target)}
								disabled={isDisabled || target <= 0}
								title={isAllIn ? (allInReason ?? `All in ${target} HP`) : `${label} of remaining HP`}
							>
								{isAllIn ? 'All in' : label}
							</button>
						);
					})}
				</div>
				<input
					type="range"
					min={sliderMin}
					max={Math.max(sliderMin, sliderMax)}
					value={clampedBet}
					onChange={(e) => onBetAmountChange(Number(e.target.value))}
					className="poker-hp-slider"
					disabled={isDisabled || sliderMax <= 0}
					aria-label="Bet amount in HP"
				/>
				<span className="slider-value">{clampedBet} HP</span>
			</div>

			<div className="unified-betting-actions poker-actions">
				<div className="action-buttons-group">
					<PokerActionButton
						actionId={commitKind}
						className="raise-btn"
						label={BETTING_ACTION_LABEL[commitKind]}
						hp={commitHP}
						icon={<SwordIcon />}
						disabled={isDisabled || !commitAllowed}
						reason={commitReason}
						onClick={() => onAction(
							hasBetToCall ? CombatAction.COUNTER_ATTACK : CombatAction.ATTACK,
							effectiveBet,
						)}
					/>
					<PokerActionButton
						actionId={matchKind}
						className="call-btn"
						label={BETTING_ACTION_LABEL[matchKind]}
						hp={matchKind === 'call' ? callHP : undefined}
						icon={matchKind === 'call' ? <CrossedSwordsIcon /> : <HelmIcon />}
						disabled={isDisabled || !matchAllowed}
						reason={matchReason}
						onClick={() => onAction(matchKind === 'call' ? CombatAction.ENGAGE : CombatAction.DEFEND)}
					/>
					<PokerActionButton
						actionId="fold"
						className="fold-btn"
						label={BETTING_ACTION_LABEL.fold}
						icon={<ShieldIcon />}
						disabled={isDisabled || !canFold}
						reason={foldReason}
						onClick={() => onAction(CombatAction.BRACE)}
					/>
					{showFrontlineButton && (
						<PokerActionButton
							actionId="frontline"
							className="auto-attack-btn"
							label={BETTING_ACTION_LABEL.frontline}
							icon={<FrontlineIcon />}
							disabled={isDisabled}
							reason={bettingDisabledReason({
								isMyTurn: isMyTurnToAct,
								kind: 'frontline',
								allowed: isMyTurnToAct,
								availableHP,
								toCall,
								minBet,
							})}
							onClick={onAutoAttackFrontline}
						/>
					)}
				</div>
			</div>
		</div>
	);
};

export default BettingPanel;
