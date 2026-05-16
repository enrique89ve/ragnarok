import { CombatPhase, type PokerCombatState } from '../../types/PokerCombatTypes';
import type { P2PConnectionState } from '../../stores/peerStore';
import type { ActionPermissions } from '../rules/pokerActionRules';
import { getPokerTurnRemainingSeconds } from '../../../../../shared/p2p-wire/pokerTurnClock';

export type PokerDecisionStatus =
	| 'inactive'
	| 'reconnecting'
	| 'showdown'
	| 'syncing'
	| 'local_decision'
	| 'remote_decision';

export type PokerDecisionActorSide = 'local' | 'remote' | 'none';

export type PokerTimerTone = 'normal' | 'low' | 'critical' | 'expired';

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
	readonly displayTurn: 'player' | 'opponent' | undefined;
	readonly cssTurnClass: 'player-turn' | 'opponent-turn';
	readonly statusLabel: string;
	readonly statusTitle: string;
	readonly statusDetail: string;
	readonly windowLabel: string;
}

const PHASE_LABELS: Partial<Record<CombatPhase, string>> = {
	[CombatPhase.PRE_FLOP]: 'First Blood',
	[CombatPhase.FAITH]: 'Faith',
	[CombatPhase.FORESIGHT]: 'Foresight',
	[CombatPhase.DESTINY]: 'Destiny',
	[CombatPhase.RESOLUTION]: 'Showdown',
};

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

	const remainingSeconds = getRemainingSeconds(combatState, nowMs);
	const durationSeconds = Math.max(1, Math.ceil(combatState.maxTurnTime || 1));
	const timerProgress = clamp(remainingSeconds / durationSeconds, 0, 1);
	const timerTone = getTimerTone(remainingSeconds);
	const phaseLabel = formatPhaseLabel(combatState.phase);
	const turnLabel = formatTurnLabel(combatState.turnId);
	const clockLabel = `${remainingSeconds}s`;
	const activeSide = getActiveSide(combatState);
	const terminal = combatState.phase === CombatPhase.RESOLUTION
		|| Boolean(combatState.foldWinner)
		|| combatState.isAllInShowdown;
	const inputPaused = isP2PCombat && connectionState !== 'connected';

	if (inputPaused) {
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
			}),
			status: 'reconnecting',
			inputPaused: true,
			statusLabel: 'Reconnecting',
			statusTitle: 'Poker input paused',
			statusDetail: 'Waiting for peer connection',
			windowLabel: 'Reconnecting',
		};
	}

	if (terminal) {
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
			}),
			status: 'showdown',
			statusLabel: 'Showdown',
			statusTitle: 'Hand resolving',
			statusDetail: 'No wager actions available',
			windowLabel: 'Showdown',
		};
	}

	if (activeSide === 'none') {
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
			}),
			status: 'syncing',
			statusLabel: 'Syncing',
			statusTitle: 'Waiting for poker clock',
			statusDetail: 'Decision window not open',
			windowLabel: 'Syncing',
		};
	}

	if (activeSide === 'local') {
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
		timerProgress: 0,
		timerTone: 'expired',
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
		displayTurn: undefined,
		cssTurnClass: input.activeSide === 'local' ? 'player-turn' : 'opponent-turn',
		statusLabel: 'Syncing',
		statusTitle: 'Waiting for poker clock',
		statusDetail: 'Decision window not open',
		windowLabel: 'Syncing',
	};
}

function getRemainingSeconds(combatState: PokerCombatState, nowMs: number): number {
	if (combatState.turnDeadlineAtMs !== null && combatState.turnDeadlineAtMs !== undefined) {
		return getPokerTurnRemainingSeconds({ nowMs, deadlineAtMs: combatState.turnDeadlineAtMs });
	}
	return Math.max(0, Math.ceil(combatState.turnTimer ?? combatState.maxTurnTime ?? 0));
}

function getActiveSide(combatState: PokerCombatState): PokerDecisionActorSide {
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
