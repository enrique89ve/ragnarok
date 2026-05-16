import React, { useMemo } from 'react';
import { CheckCircle2, Clock3, Hourglass, Radio, WifiOff } from 'lucide-react';
import { CombatPhase, type PokerCombatState } from '../../types/PokerCombatTypes';
import type { P2PConnectionState } from '../../stores/peerStore';

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

const PHASE_LABELS: Partial<Record<CombatPhase, string>> = {
	[CombatPhase.PRE_FLOP]: 'First Blood',
	[CombatPhase.FAITH]: 'Faith',
	[CombatPhase.FORESIGHT]: 'Foresight',
	[CombatPhase.DESTINY]: 'Destiny',
	[CombatPhase.RESOLUTION]: 'Showdown',
};

function formatPhaseLabel(phase: CombatPhase): string {
	return PHASE_LABELS[phase] ?? phase.replace(/_/g, ' ');
}

function formatTurnLabel(turnId: string | null | undefined): string {
	if (!turnId) return 'No clock';
	return `#${turnId.slice(-6)}`;
}

function getClockLabel(combatState: PokerCombatState): string {
	const seconds = Math.max(0, Math.ceil(combatState.turnTimer ?? combatState.maxTurnTime ?? 0));
	return `${seconds}s`;
}

export function getPokerP2PTurnStatusView(input: {
	readonly combatState: PokerCombatState;
	readonly connectionState: P2PConnectionState;
}): PokerP2PTurnStatusView {
	const { combatState, connectionState } = input;
	const phaseLabel = formatPhaseLabel(combatState.phase);
	const turnLabel = formatTurnLabel(combatState.turnId);
	const clockLabel = getClockLabel(combatState);

	if (connectionState !== 'connected') {
		return {
			variant: 'reconnecting',
			label: 'Reconnecting',
			title: 'Poker input paused',
			detail: 'Waiting for peer connection',
			phaseLabel,
			turnLabel,
			clockLabel,
		};
	}

	if (combatState.phase === CombatPhase.RESOLUTION || combatState.foldWinner || combatState.isAllInShowdown) {
		return {
			variant: 'showdown',
			label: 'Showdown',
			title: 'Hand resolving',
			detail: 'No wager actions available',
			phaseLabel,
			turnLabel,
			clockLabel,
		};
	}

	if (!combatState.activePlayerId) {
		return {
			variant: 'syncing',
			label: 'Syncing',
			title: 'Waiting for poker clock',
			detail: 'Decision window not open',
			phaseLabel,
			turnLabel,
			clockLabel,
		};
	}

	const localDecision = combatState.activePlayerId === combatState.player.playerId;
	if (localDecision) {
		return {
			variant: 'player',
			label: 'Your Decision',
			title: 'Choose wager action',
			detail: 'Controls are live',
			phaseLabel,
			turnLabel,
			clockLabel,
		};
	}

	return {
		variant: 'opponent',
		label: 'Opponent Acting',
		title: 'Waiting on opponent',
		detail: 'Controls locked',
		phaseLabel,
		turnLabel,
		clockLabel,
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
