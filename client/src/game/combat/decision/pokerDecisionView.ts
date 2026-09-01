import { CombatPhase, type PokerCombatState } from '../../types/PokerCombatTypes';
import type { P2PConnectionState } from '../../stores/peerStore';
import type { ActionPermissions } from '../rules/pokerActionRules';
import {
	getPokerTurnRemainingSeconds,
	isTimedPokerDecisionPhase,
} from '../../../../../shared/p2p-wire/pokerTurnClock';

export type PokerDecisionStatus =
	| 'inactive'
	| 'reconnecting'
	| 'expired'
	| 'showdown'
	| 'syncing'
	| 'local_decision'
	| 'remote_decision';

export type PokerDecisionProtocolStatus =
	| 'inactive'
	| 'connection_paused'
	| 'expired'
	| 'showdown'
	| 'syncing'
	| 'local_decision'
	| 'remote_decision';

export type PokerDecisionActorSide = 'local' | 'remote' | 'none';

export type PokerTimerTone = 'normal' | 'low' | 'critical' | 'expired';

export interface PokerDecisionStateInput {
	readonly combatId: string;
	readonly phase: CombatPhase;
	readonly player: {
		readonly playerId: string;
		readonly isReady?: boolean;
	};
	readonly opponent: {
		readonly playerId: string;
		readonly isReady?: boolean;
	};
	readonly activePlayerId: string | null;
	readonly turnId?: string | null;
	readonly turnTimer?: number | null;
	readonly turnStartedAtMs?: number | null;
	readonly turnDeadlineAtMs?: number | null;
	readonly maxTurnTime?: number;
	readonly actionsThisRound?: number;
	readonly foldWinner?: string | null;
	readonly isAllInShowdown?: boolean;
}

export interface PokerDecisionProtocolMetadata {
	readonly combatId: string;
	readonly activePlayerId: string | null;
	readonly localPlayerId: string;
	readonly remotePlayerId: string;
	readonly turnId: string | null;
	readonly turnStartedAtMs: number | null;
	readonly turnDeadlineAtMs: number | null;
	readonly actionsThisRound: number;
	readonly connectionState: P2PConnectionState;
}

export interface PokerDecisionProtocolView {
	readonly status: PokerDecisionProtocolStatus;
	readonly decisionSide: PokerDecisionActorSide;
	readonly canAct: boolean;
	readonly phaseLabel: string;
	readonly turnLabel: string;
	readonly clockLabel: string;
	readonly remainingSeconds: number | null;
	readonly label: string;
	readonly title: string;
	readonly detail: string;
	readonly protocol: PokerDecisionProtocolMetadata | null;
}

export interface PokerDecisionView {
	readonly status: PokerDecisionStatus;
	readonly activeSide: PokerDecisionActorSide;
	readonly localCanAct: boolean;
	readonly waitingForPeer: boolean;
	readonly inputPaused: boolean;
	readonly phaseLabel: string;
	readonly turnLabel: string;
	readonly clockLabel: string;
	readonly remainingSeconds: number;
	readonly durationSeconds: number;
	readonly timerProgress: number;
	readonly timerTone: PokerTimerTone;
	readonly hasClock: boolean;
	readonly displayTurn: 'player' | 'opponent' | undefined;
	readonly cssTurnClass: 'player-turn' | 'opponent-turn';
	readonly statusLabel: string;
	readonly statusTitle: string;
	readonly statusDetail: string;
	readonly windowLabel: string;
}

const PHASE_LABELS: Partial<Record<CombatPhase, string>> = {
	[CombatPhase.MULLIGAN]: 'Mulligan',
	[CombatPhase.PRE_FLOP]: 'First Blood',
	[CombatPhase.FAITH]: 'Faith',
	[CombatPhase.FORESIGHT]: 'Foresight',
	[CombatPhase.DESTINY]: 'Destiny',
	[CombatPhase.RESOLUTION]: 'Showdown',
};

export function getPokerDecisionView(input: {
	readonly combatState: PokerDecisionStateInput | null;
	readonly connectionState?: P2PConnectionState;
	readonly nowMs?: number;
}): PokerDecisionProtocolView {
	const {
		combatState,
		connectionState = 'connected',
		nowMs = Date.now(),
	} = input;

	if (!combatState) {
		return {
			status: 'inactive',
			decisionSide: 'none',
			canAct: false,
			phaseLabel: 'Battle Ready',
			turnLabel: 'No clock',
			clockLabel: 'No clock',
			remainingSeconds: null,
			label: 'Inactive',
			title: 'Poker inactive',
			detail: 'No decision window',
			protocol: null,
		};
	}

	const protocol = createProtocolMetadata(combatState, connectionState);
	const phaseLabel = formatPhaseLabel(combatState.phase);
	const turnLabel = formatTurnLabel(combatState.turnId);
	const activeSide = getActiveSide(combatState);
	const timedPhase = isTimedPokerDecisionPhase(combatState.phase);
	const hasClock = timedPhase && hasActiveDecisionClock(combatState);
	const remainingSeconds = hasClock ? getRemainingSeconds(combatState, nowMs) : null;
	const clockLabel = remainingSeconds === null ? 'No clock' : `${remainingSeconds}s`;
	const terminal = isTerminalDecisionState(combatState);

	if (connectionState !== 'connected') {
		return {
			status: 'connection_paused',
			decisionSide: 'none',
			canAct: false,
			phaseLabel,
			turnLabel,
			clockLabel,
			remainingSeconds,
			label: 'Reconnecting',
			title: 'Poker input paused',
			detail: 'Connection interrupted — actions locked. Turn timer continues.',
			protocol,
		};
	}

	if (terminal) {
		return {
			status: 'showdown',
			decisionSide: 'none',
			canAct: false,
			phaseLabel,
			turnLabel,
			clockLabel,
			remainingSeconds,
			label: 'Showdown',
			title: 'Hand resolving',
			detail: 'No wager actions available',
			protocol,
		};
	}

	if (activeSide === 'none' || !hasClock) {
		return {
			status: 'syncing',
			decisionSide: 'none',
			canAct: false,
			phaseLabel,
			turnLabel,
			clockLabel,
			remainingSeconds,
			label: 'Syncing',
			title: 'Waiting for poker clock',
			detail: 'Decision window not open',
			protocol,
		};
	}

	if (remainingSeconds !== null && remainingSeconds <= 0) {
		return {
			status: 'expired',
			decisionSide: activeSide,
			canAct: false,
			phaseLabel,
			turnLabel,
			clockLabel,
			remainingSeconds,
			label: 'Time Expired',
			title: 'Decision window closed',
			detail: 'Controls locked',
			protocol,
		};
	}

	if (activeSide === 'local') {
		return {
			status: 'local_decision',
			decisionSide: 'local',
			canAct: true,
			phaseLabel,
			turnLabel,
			clockLabel,
			remainingSeconds,
			label: 'Your Decision',
			title: 'Choose wager action',
			detail: 'Controls are live',
			protocol,
		};
	}

	return {
		status: 'remote_decision',
		decisionSide: 'remote',
		canAct: false,
		phaseLabel,
		turnLabel,
		clockLabel,
		remainingSeconds,
		label: 'Opponent Acting',
		title: 'Waiting on opponent',
		detail: 'Controls locked',
		protocol,
	};
}

export function derivePokerDecisionView(input: {
	readonly combatState: PokerCombatState | null;
	readonly connectionState?: P2PConnectionState;
	readonly isP2PCombat?: boolean;
	readonly permissions?: ActionPermissions | null;
	readonly nowMs?: number;
}): PokerDecisionView {
	const {
		combatState,
		connectionState = 'connected',
		isP2PCombat = false,
		permissions = null,
		nowMs = Date.now(),
	} = input;

	if (!combatState) {
		return createInactiveView();
	}

	const protocolView = getPokerDecisionView({
		combatState,
		connectionState: isP2PCombat ? connectionState : 'connected',
		nowMs,
	});
	const durationSeconds = Math.max(1, Math.ceil(combatState.maxTurnTime || 1));
	const protocolSeconds = protocolView.remainingSeconds;
	const hasClock = protocolSeconds !== null;
	const remainingSeconds = hasClock ? protocolSeconds : durationSeconds;
	const timerProgress = hasClock ? clamp(remainingSeconds / durationSeconds, 0, 1) : 1;
	const timerTone = hasClock ? getTimerTone(remainingSeconds) : 'normal';
	const phaseLabel = protocolView.phaseLabel;
	const turnLabel = protocolView.turnLabel;
	const clockLabel = hasClock ? protocolView.clockLabel : '—';
	const activeSide = protocolView.decisionSide;

	if (protocolView.status === 'connection_paused') {
		return {
			...createBaseView({
				activeSide,
				phaseLabel,
				turnLabel,
				clockLabel,
				remainingSeconds,
				durationSeconds,
				timerProgress,
				timerTone,
				hasClock,
			}),
			status: 'reconnecting',
			inputPaused: true,
			statusLabel: 'Reconnecting',
			statusTitle: 'Poker input paused',
			statusDetail: 'Connection interrupted — actions locked. Turn timer continues.',
			windowLabel: 'Reconnecting',
		};
	}

	if (protocolView.status === 'expired') {
		return {
			...createBaseView({
				activeSide,
				phaseLabel,
				turnLabel,
				clockLabel,
				remainingSeconds,
				durationSeconds,
				timerProgress,
				timerTone,
				hasClock,
			}),
			status: 'expired',
			statusLabel: 'Time Expired',
			statusTitle: 'Decision window closed',
			statusDetail: 'Controls locked',
			windowLabel: 'Time Expired',
		};
	}

	if (protocolView.status === 'showdown') {
		return {
			...createBaseView({
				activeSide,
				phaseLabel,
				turnLabel,
				clockLabel,
				remainingSeconds,
				durationSeconds,
				timerProgress,
				timerTone,
				hasClock,
			}),
			status: 'showdown',
			statusLabel: 'Showdown',
			statusTitle: 'Hand resolving',
			statusDetail: 'No wager actions available',
			windowLabel: 'Showdown',
		};
	}

	if (protocolView.status === 'syncing') {
		return {
			...createBaseView({
				activeSide,
				phaseLabel,
				turnLabel,
				clockLabel,
				remainingSeconds,
				durationSeconds,
				timerProgress,
				timerTone,
				hasClock,
			}),
			status: 'syncing',
			statusLabel: 'Syncing',
			statusTitle: 'Waiting for poker clock',
			statusDetail: 'Decision window not open',
			windowLabel: 'Syncing',
		};
	}

	if (protocolView.status === 'local_decision') {
		const localCanAct = permissions?.isMyTurnToAct
			?? !combatState.player.isReady;
		return {
			...createBaseView({
				activeSide,
				phaseLabel,
				turnLabel,
				clockLabel,
				remainingSeconds,
				durationSeconds,
				timerProgress,
				timerTone,
				hasClock,
			}),
			status: 'local_decision',
			localCanAct,
			displayTurn: 'player',
			cssTurnClass: 'player-turn',
			statusLabel: 'Your Decision',
			statusTitle: 'Choose wager action',
			statusDetail: localCanAct ? 'Controls are live' : 'Decision already locked',
			windowLabel: 'Your Decision',
		};
	}

	return {
		...createBaseView({
			activeSide,
			phaseLabel,
			turnLabel,
			clockLabel,
			remainingSeconds,
			durationSeconds,
			timerProgress,
			timerTone,
			hasClock,
		}),
		status: 'remote_decision',
		waitingForPeer: true,
		displayTurn: 'opponent',
		cssTurnClass: 'opponent-turn',
		statusLabel: 'Opponent Acting',
		statusTitle: 'Waiting on opponent',
		statusDetail: 'Controls locked',
		windowLabel: 'Enemy Acting',
	};
}

function createProtocolMetadata(
	combatState: PokerDecisionStateInput,
	connectionState: P2PConnectionState,
): PokerDecisionProtocolMetadata {
	return {
		combatId: combatState.combatId,
		activePlayerId: combatState.activePlayerId,
		localPlayerId: combatState.player.playerId,
		remotePlayerId: combatState.opponent.playerId,
		turnId: combatState.turnId ?? null,
		turnStartedAtMs: combatState.turnStartedAtMs ?? null,
		turnDeadlineAtMs: combatState.turnDeadlineAtMs ?? null,
		actionsThisRound: combatState.actionsThisRound ?? 0,
		connectionState,
	};
}

function hasActiveDecisionClock(combatState: PokerDecisionStateInput): boolean {
	return Boolean(combatState.activePlayerId)
		&& Boolean(combatState.turnId)
		&& (
			combatState.turnDeadlineAtMs !== null
			&& combatState.turnDeadlineAtMs !== undefined
			|| combatState.turnTimer !== null
			&& combatState.turnTimer !== undefined
		);
}

function isTerminalDecisionState(combatState: PokerDecisionStateInput): boolean {
	return combatState.phase === CombatPhase.RESOLUTION
		|| Boolean(combatState.foldWinner)
		|| Boolean(combatState.isAllInShowdown);
}

function createInactiveView(): PokerDecisionView {
	return {
		status: 'inactive',
		activeSide: 'none',
		localCanAct: false,
		waitingForPeer: false,
		inputPaused: false,
		phaseLabel: 'Battle Ready',
		turnLabel: 'No clock',
		clockLabel: '0s',
		remainingSeconds: 0,
		durationSeconds: 1,
		timerProgress: 1,
		timerTone: 'normal',
		hasClock: false,
		displayTurn: undefined,
		cssTurnClass: 'opponent-turn',
		statusLabel: 'Inactive',
		statusTitle: 'Poker inactive',
		statusDetail: 'No decision window',
		windowLabel: 'Inactive',
	};
}

function createBaseView(input: {
	readonly activeSide: PokerDecisionActorSide;
	readonly phaseLabel: string;
	readonly turnLabel: string;
	readonly clockLabel: string;
	readonly remainingSeconds: number;
	readonly durationSeconds: number;
	readonly timerProgress: number;
	readonly timerTone: PokerTimerTone;
	readonly hasClock: boolean;
}): PokerDecisionView {
	return {
		status: 'syncing',
		activeSide: input.activeSide,
		localCanAct: false,
		waitingForPeer: false,
		inputPaused: false,
		phaseLabel: input.phaseLabel,
		turnLabel: input.turnLabel,
		clockLabel: input.clockLabel,
		remainingSeconds: input.remainingSeconds,
		durationSeconds: input.durationSeconds,
		timerProgress: input.timerProgress,
		timerTone: input.timerTone,
		hasClock: input.hasClock,
		displayTurn: undefined,
		cssTurnClass: input.activeSide === 'local' ? 'player-turn' : 'opponent-turn',
		statusLabel: 'Syncing',
		statusTitle: 'Waiting for poker clock',
		statusDetail: 'Decision window not open',
		windowLabel: 'Syncing',
	};
}

function getRemainingSeconds(combatState: PokerDecisionStateInput, nowMs: number): number {
	if (combatState.turnDeadlineAtMs !== null && combatState.turnDeadlineAtMs !== undefined) {
		return getPokerTurnRemainingSeconds({ nowMs, deadlineAtMs: combatState.turnDeadlineAtMs });
	}
	return Math.max(0, Math.ceil(combatState.turnTimer ?? combatState.maxTurnTime ?? 0));
}

function getActiveSide(combatState: PokerDecisionStateInput): PokerDecisionActorSide {
	if (!combatState.activePlayerId) return 'none';
	if (combatState.activePlayerId === combatState.player.playerId) return 'local';
	if (combatState.activePlayerId === combatState.opponent.playerId) return 'remote';
	return 'none';
}

function getTimerTone(seconds: number): PokerTimerTone {
	if (seconds <= 0) return 'expired';
	if (seconds <= 5) return 'critical';
	if (seconds <= 10) return 'low';
	return 'normal';
}

function formatPhaseLabel(phase: CombatPhase): string {
	return PHASE_LABELS[phase] ?? phase.replace(/_/g, ' ');
}

function formatTurnLabel(turnId: string | null | undefined): string {
	if (!turnId) return 'No clock';
	return `#${turnId.slice(-6)}`;
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}
