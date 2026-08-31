import type { P2PConnectionState } from '../../stores/peerStore';

export type P2PConnectionToastModel =
	| { readonly kind: 'dismiss' }
	| { readonly kind: 'loading' | 'warning' | 'error'; readonly title: string; readonly description: string }
	| { readonly kind: 'success'; readonly title: string; readonly description: string };

export function getP2PConnectionToastModel(input: {
	readonly connectionState: P2PConnectionState;
	readonly reconnectCountdown: number;
	readonly reconnectAttemptCount: number;
	readonly disconnectSide: 'local' | 'opponent' | 'unknown' | null;
	readonly bufferedMessageCount: number;
	readonly hardReloadResume: boolean;
	readonly error: string | null;
	readonly transportKind?: 'webrtc' | 'websocket-relay';
}): P2PConnectionToastModel {
	if (input.connectionState === 'disconnected') return { kind: 'dismiss' };
	if (input.connectionState === 'connecting') {
		return {
			kind: 'loading',
			title: 'Connecting with opponent',
			description: 'Opening a secure match connection…',
		};
	}
	if (input.connectionState === 'waiting') {
		return {
			kind: 'loading',
			title: 'Waiting for opponent',
			description: 'Your room is ready. The match starts when the other browser joins.',
		};
	}
	if (input.connectionState === 'reconnecting' || input.connectionState === 'grace_period') {
		const attempt = input.reconnectAttemptCount > 0
			? `Attempt ${input.reconnectAttemptCount}/2. `
			: '';
		const countdown = input.reconnectCountdown > 0
			? `${input.reconnectCountdown}s before the technical result.`
			: 'Restoring the match automatically.';
		const queued = input.bufferedMessageCount > 0
			? ` ${input.bufferedMessageCount} message${input.bufferedMessageCount === 1 ? '' : 's'} queued safely.`
			: '';
		return {
			kind: 'warning',
			title: input.hardReloadResume
				? 'Restoring saved match'
				: input.disconnectSide === 'opponent'
					? 'Opponent connection interrupted'
					: 'Connection interrupted',
			description: `${attempt}${countdown}${queued}`,
		};
	}
	if (input.connectionState === 'error') {
		return {
			kind: 'error',
			title: 'Match connection failed',
			description: input.error ?? 'Return to the lobby and try again.',
		};
	}
	if (input.connectionState === 'connected') {
		const transport = input.transportKind === 'webrtc' ? 'Direct WebRTC' : 'Secure relay';
		return {
			kind: 'success',
			title: 'Opponent connected',
			description: `${transport} is ready. Match state will sync before play begins.`,
		};
	}
	return { kind: 'dismiss' };
}
