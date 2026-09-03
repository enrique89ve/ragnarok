import React, { useEffect, useMemo, useState } from 'react';
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
	const connectionInterrupted = connectionState !== 'connected';
	const [detailsOpen, setDetailsOpen] = useState(connectionInterrupted);
	const view = useMemo(() => {
		if (!isP2PCombat || !combatState) return null;
		return getPokerP2PTurnStatusView({ combatState, connectionState });
	}, [combatState, connectionState, isP2PCombat]);

	useEffect(() => {
		setDetailsOpen(connectionInterrupted);
	}, [connectionInterrupted]);

	if (!view) return null;

	const isExpanded = connectionInterrupted || detailsOpen;
	const statusLabel = connectionInterrupted ? 'P2P' : 'LIVE';
	const statusTitle = view.title;
	const statusDetail = view.detail;

	return (
		<aside
			className={`p2p-poker-turn-status state-${view.variant}`}
			data-zone="p2p-poker-turn-status"
			data-expanded={isExpanded}
			aria-live={connectionInterrupted ? 'assertive' : 'polite'}
			aria-label={`${statusLabel}: ${statusTitle}`}
		>
			<button
				type="button"
				className="p2p-poker-live-trigger"
				aria-controls="p2p-poker-turn-status-details"
				aria-expanded={isExpanded}
				aria-label={isExpanded ? 'Hide poker connection details' : 'Show poker connection details'}
				title={isExpanded ? 'Hide poker connection details' : 'Show poker connection details'}
				onClick={() => setDetailsOpen(open => !open)}
			>
				<span className="p2p-poker-live-dot" aria-hidden="true" />
				<Radio size={16} strokeWidth={2.4} aria-hidden="true" />
				<span className="p2p-poker-live-label">{connectionInterrupted ? 'P2P' : 'LIVE'}</span>
			</button>
			<div
				id="p2p-poker-turn-status-details"
				className="p2p-poker-turn-status-details"
				hidden={!isExpanded}
			>
				<div className="p2p-poker-turn-status-icon" aria-hidden="true">
					{connectionInterrupted ? <WifiOff size={18} strokeWidth={2.2} /> : getStatusIcon(view.variant)}
				</div>
				<div className="p2p-poker-turn-status-copy">
					<span className="p2p-poker-turn-status-label">{statusLabel}</span>
					<strong className="p2p-poker-turn-status-title">{statusTitle}</strong>
					<span className="p2p-poker-turn-status-detail">{statusDetail}</span>
				</div>
				<div className="p2p-poker-turn-status-meta" aria-label="Poker decision metadata">
					<span>{view.phaseLabel}</span>
					<span>{view.turnLabel}</span>
					<span>{view.clockLabel}</span>
				</div>
			</div>
		</aside>
	);
};

export default PokerP2PTurnStatus;
