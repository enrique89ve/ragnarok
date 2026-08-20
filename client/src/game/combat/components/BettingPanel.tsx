import React from 'react';
import { Axe, CircleCheck, Flag, Scale, ShieldX } from 'lucide-react';
import { CombatAction } from '../../types/PokerCombatTypes';
import type { ActionPermissions } from '../../hooks/usePokerCombatAdapter';
import {
	BETTING_ACTION_LABEL,
	bettingCommitKind,
	bettingDisabledReason,
	bettingMatchKind,
	pokerQuickBetHp,
} from './bettingPanelCopy';

const ACTION_ICON_PROPS = {
	'aria-hidden': true,
	className: 'btn-icon',
	focusable: false,
	size: 25,
	strokeLinecap: 'round',
	strokeLinejoin: 'round',
	strokeWidth: 2.6,
} as const;

const RaiseIcon: React.FC = () => <Axe {...ACTION_ICON_PROPS} />;
const MatchIcon: React.FC = () => <Scale {...ACTION_ICON_PROPS} />;
const CheckIcon: React.FC = () => <CircleCheck {...ACTION_ICON_PROPS} />;
const FoldIcon: React.FC = () => <ShieldX {...ACTION_ICON_PROPS} />;
const FrontlineIcon: React.FC = () => <Flag {...ACTION_ICON_PROPS} />;

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
	const hasValue = hp != null && hp > 0;
	const aria = hasValue ? `${label} ${hp} HP` : label;
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
			{hasValue && (
				<span className="btn-copy">
					{hasValue ? <span className="btn-hp">{hp} HP</span> : null}
				</span>
			)}
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
						icon={<RaiseIcon />}
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
						icon={matchKind === 'call' ? <MatchIcon /> : <CheckIcon />}
						disabled={isDisabled || !matchAllowed}
						reason={matchReason}
						onClick={() => onAction(matchKind === 'call' ? CombatAction.ENGAGE : CombatAction.DEFEND)}
					/>
					<PokerActionButton
						actionId="fold"
						className="fold-btn"
						label={BETTING_ACTION_LABEL.fold}
						icon={<FoldIcon />}
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
