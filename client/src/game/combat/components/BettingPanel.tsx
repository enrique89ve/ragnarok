import React from 'react';
import { CombatAction } from '../../types/PokerCombatTypes';
import type { ActionPermissions } from '../../hooks/usePokerCombatAdapter';
import { FRONTLINE_CONTROL_DEFINITION, getPokerActionDefinition } from '../decision/pokerActionCatalog';
import { PokerActionIcon } from './PokerActionIcon';
import {
	bettingCommitKind,
	bettingDisabledReason,
	bettingMatchKind,
	pokerQuickBetHp,
} from './bettingPanelCopy';

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
	pokerLabel,
	onClick,
	reason,
}: {
	readonly actionId: string;
	readonly className: string;
	readonly disabled: boolean;
	readonly hp?: number;
	readonly icon: React.ReactNode;
	readonly label: string;
	readonly pokerLabel?: string;
	readonly onClick: () => void;
	readonly reason: string | null;
}): React.ReactElement {
	const hasValue = hp != null && hp > 0;
	const actionName = pokerLabel ? `${label} (${pokerLabel})` : label;
	const aria = hasValue ? `${actionName} ${hp} HP` : actionName;
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
			<ButtonIconFrame>
				{icon}
				{hasValue ? <span className="btn-hp">{hp}</span> : null}
			</ButtonIconFrame>
		</button>
	);
}

function getFrontlineDisabledReason(input: {
	readonly isMyTurnToAct: boolean;
	readonly isAvailable: boolean;
	readonly availableHP: number;
	readonly toCall: number;
	readonly minBet: number;
}): string | null {
	if (!input.isMyTurnToAct) {
		return bettingDisabledReason({
			isMyTurn: false,
			kind: 'frontline',
			allowed: false,
			availableHP: input.availableHP,
			toCall: input.toCall,
			minBet: input.minBet,
		});
	}
	return input.isAvailable ? null : 'No frontline units are ready to attack.';
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

function shouldDisableHpBetting(isDisabled: boolean, sliderMax: number): boolean {
	return isDisabled || sliderMax <= 0;
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
	const commitAction = hasBetToCall ? CombatAction.COUNTER_ATTACK : CombatAction.ATTACK;
	const matchAction = hasBetToCall ? CombatAction.ENGAGE : CombatAction.DEFEND;
	const commitDefinition = getPokerActionDefinition(commitAction);
	const matchDefinition = getPokerActionDefinition(matchAction);
	const braceDefinition = getPokerActionDefinition(CombatAction.BRACE);
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
	const frontlineReason = getFrontlineDisabledReason({
		isMyTurnToAct,
		isAvailable: showFrontlineButton,
		availableHP,
		toCall,
		minBet,
	});
	const isHpBettingDisabled = shouldDisableHpBetting(isDisabled, sliderMax);

	return (
		<div
			className="betting-panel"
			data-zone="betting-panel"
		>
			<div className="poker-hp-slider-container" data-disabled={isHpBettingDisabled}>
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
								disabled={isHpBettingDisabled || target <= 0}
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
					disabled={isHpBettingDisabled}
					aria-label="Bet amount in HP"
				/>
				<span className="slider-value">{clampedBet} HP</span>
			</div>

			<div className="unified-betting-actions poker-actions">
				<div className="action-buttons-group">
					<PokerActionButton
						actionId={commitKind}
						className="raise-btn"
						label={commitDefinition.buttonLabel}
						pokerLabel={commitDefinition.pokerLabel}
						hp={commitHP}
						icon={<PokerActionIcon glyph={commitDefinition.glyph} className="btn-icon" />}
						disabled={isDisabled || !commitAllowed}
						reason={commitReason}
						onClick={() => onAction(commitAction, effectiveBet)}
					/>
					<PokerActionButton
						actionId={matchKind}
						className="call-btn"
						label={matchDefinition.buttonLabel}
						pokerLabel={matchDefinition.pokerLabel}
						hp={matchKind === 'call' ? callHP : undefined}
						icon={<PokerActionIcon glyph={matchDefinition.glyph} className="btn-icon" />}
						disabled={isDisabled || !matchAllowed}
						reason={matchReason}
						onClick={() => onAction(matchAction)}
					/>
					<PokerActionButton
						actionId="fold"
						className="fold-btn"
						label={braceDefinition.buttonLabel}
						pokerLabel={braceDefinition.pokerLabel}
						icon={<PokerActionIcon glyph={braceDefinition.glyph} className="btn-icon" />}
						disabled={isDisabled || !canFold}
						reason={foldReason}
						onClick={() => onAction(CombatAction.BRACE)}
					/>
					<PokerActionButton
						actionId="frontline"
						className="auto-attack-btn"
						label={FRONTLINE_CONTROL_DEFINITION.buttonLabel}
						icon={<PokerActionIcon glyph={FRONTLINE_CONTROL_DEFINITION.glyph} className="btn-icon" />}
						disabled={isDisabled || !showFrontlineButton}
						reason={frontlineReason}
						onClick={onAutoAttackFrontline}
					/>
				</div>
			</div>
		</div>
	);
};

export default BettingPanel;
