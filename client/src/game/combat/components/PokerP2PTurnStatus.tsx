import React, { useMemo } from 'react';
import { CheckCircle2, Clock3, Hourglass, Radio, WifiOff } from 'lucide-react';
import type { PokerCombatState } from '../../types/PokerCombatTypes';
import type { P2PConnectionState } from '../../stores/peerStore';
import {
	derivePokerDecisionView,
	type PokerDecisionView,
} from '../decision/pokerDecisionView';

type PokerP2PTurnStatusVariant = 'player' | 'opponent' | 'reconnecting' | 'showdown' | 'syncing';

interface PokerP2PTurnStatusProps {
	readonly combatState: PokerCombatState | null;
	readonly isP2PCombat: boolean;
	readonly connectionState: P2PConnectionState;
}

interface PokerP2PTurnStatusView {
	readonly variant: PokerP2PTurnStatusVariant;
	readonly label: string;
	readonly title: string;
	readonly detail: string;
	readonly phaseLabel: string;
	readonly turnLabel: string;
	readonly clockLabel: string;
}

export function getPokerP2PTurnStatusView(input: {
	readonly combatState: PokerCombatState;
	readonly connectionState: P2PConnectionState;
	readonly nowMs?: number;
}): PokerP2PTurnStatusView {
	return toP2PTurnStatusView(derivePokerDecisionView({
		combatState: input.combatState,
		connectionState: input.connectionState,
		isP2PCombat: true,
		nowMs: input.nowMs,
	}));
}

function toP2PTurnStatusView(view: PokerDecisionView): PokerP2PTurnStatusView {
	const variant = view.status === 'local_decision'
		? 'player'
		: view.status === 'remote_decision'
			? 'opponent'
			: view.status === 'reconnecting'
				? 'reconnecting'
				: view.status === 'showdown'
					? 'showdown'
					: 'syncing';
	return {
		variant,
		label: view.statusLabel,
		title: view.statusTitle,
		detail: view.statusDetail,
		phaseLabel: view.phaseLabel,
		turnLabel: view.turnLabel,
		clockLabel: view.clockLabel,
	};
}

function getStatusIcon(variant: PokerP2PTurnStatusVariant): React.ReactNode {
	if (variant === 'player') return <CheckCircle2 size={18} strokeWidth={2.2} />;
	if (variant === 'opponent') return <Hourglass size={18} strokeWidth={2.2} />;
	if (variant === 'reconnecting') return <WifiOff size={18} strokeWidth={2.2} />;
	if (variant === 'showdown') return <Radio size={18} strokeWidth={2.2} />;
	return <Clock3 size={18} strokeWidth={2.2} />;
}

export const PokerP2PTurnStatus: React.FC<PokerP2PTurnStatusProps> = ({
	combatState,
	isP2PCombat,
	connectionState,
}) => {
	const view = useMemo(() => {
		if (!isP2PCombat || !combatState) return null;
		return getPokerP2PTurnStatusView({ combatState, connectionState });
	}, [combatState, connectionState, isP2PCombat]);

	if (!view) return null;

	return (
		<aside
			className={`p2p-poker-turn-status state-${view.variant}`}
			data-zone="p2p-poker-turn-status"
			aria-live="polite"
			aria-label={`${view.label}: ${view.title}`}
		>
			<div className="p2p-poker-turn-status-icon" aria-hidden="true">
				{getStatusIcon(view.variant)}
			</div>
			<div className="p2p-poker-turn-status-copy">
				<span className="p2p-poker-turn-status-label">{view.label}</span>
				<strong className="p2p-poker-turn-status-title">{view.title}</strong>
				<span className="p2p-poker-turn-status-detail">{view.detail}</span>
			</div>
			<div className="p2p-poker-turn-status-meta" aria-label="Poker decision metadata">
				<span>{view.phaseLabel}</span>
				<span>{view.turnLabel}</span>
				<span>{view.clockLabel}</span>
			</div>
		</aside>
	);
};

export default PokerP2PTurnStatus;
