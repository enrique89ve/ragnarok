import type { P2PConnectionState, P2PDisconnectSide } from '../stores/peerStore';
import type { P2PCompetitionPhase } from '@shared/p2p-wire/p2pCompetitionLifecycle';

export type P2PMatchPauseKind = 'reconnecting' | 'integrity' | 'error';

export type P2PMatchPauseView = {
	readonly kind: P2PMatchPauseKind;
	readonly title: string;
	readonly detail: string;
	readonly exportLabel: string;
	readonly showCountdown: boolean;
};

export const P2P_SESSION_JSON_EXPORT_LABEL = 'Export diagnostics';

export function isP2PGameplayInputLocked(input: {
	readonly connectionState: P2PConnectionState;
	readonly integrityError: string | null;
}): boolean {
	return Boolean(input.integrityError) || input.connectionState !== 'connected';
}

export function resolveP2PMatchPauseView(input: {
	readonly competitionPhase: P2PCompetitionPhase | null;
	readonly connectionState: P2PConnectionState;
	readonly disconnectSide: P2PDisconnectSide | null;
	readonly integrityError: string | null;
	readonly reconnectCountdown: number;
	readonly reconnectAttemptCount: number;
}): P2PMatchPauseView | null {
	if (input.competitionPhase !== 'battle') return null;
	if (input.integrityError) {
		return {
			kind: 'integrity',
			title: 'Game integrity paused',
			detail: 'Actions are locked until you leave the match. Export diagnostics if you need evidence.',
			exportLabel: P2P_SESSION_JSON_EXPORT_LABEL,
			showCountdown: false,
		};
	}
	if (input.connectionState === 'error') {
		return {
			kind: 'error',
			title: 'Match connection failed',
			detail: 'The board is paused. Export diagnostics, then return to the lobby.',
			exportLabel: P2P_SESSION_JSON_EXPORT_LABEL,
			showCountdown: false,
		};
	}
	if (input.connectionState !== 'reconnecting' && input.connectionState !== 'grace_period') {
		return null;
	}
	const attempt = input.reconnectAttemptCount > 0 ? `Attempt ${input.reconnectAttemptCount}/2. ` : '';
	const countdown = input.reconnectCountdown > 0
		? `${input.reconnectCountdown}s before the technical result.`
		: 'Restoring the match automatically.';
	const subject = input.disconnectSide === 'opponent'
		? 'Opponent connection interrupted'
		: 'Your connection interrupted';
	return {
		kind: 'reconnecting',
		title: subject,
		detail: `${attempt}${countdown} Actions are locked. The board stays visible.`,
		exportLabel: P2P_SESSION_JSON_EXPORT_LABEL,
		showCountdown: input.reconnectCountdown > 0,
	};
}
