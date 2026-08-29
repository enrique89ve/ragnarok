import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import type { P2PConnectionState } from '../../stores/peerStore';
import { usePeerStore } from '../../stores/peerStore';

const CONNECTION_TOAST_ID = 'p2p-connection-state';
const READINESS_TOAST_ID = 'p2p-match-readiness';

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

function showConnectionToast(model: P2PConnectionToastModel, onDisconnect: () => void): void {
	if (model.kind === 'dismiss') {
		toast.dismiss(CONNECTION_TOAST_ID);
		return;
	}
	const options = {
		id: CONNECTION_TOAST_ID,
		description: model.description,
		duration: model.kind === 'success' ? 3_000 : Infinity,
		...(model.kind === 'error'
			? { action: { label: 'Leave match', onClick: onDisconnect } }
			: {}),
	};
	if (model.kind === 'loading') toast.loading(model.title, options);
	if (model.kind === 'warning') toast.warning(model.title, options);
	if (model.kind === 'error') toast.error(model.title, options);
	if (model.kind === 'success') toast.success(model.title, options);
}

export function P2PStatusToast(): null {
	const connectionState = usePeerStore(state => state.connectionState);
	const reconnectCountdown = usePeerStore(state => state.reconnectCountdown);
	const reconnectAttemptCount = usePeerStore(state => state.reconnectAttemptCount);
	const disconnectSide = usePeerStore(state => state.disconnectSide);
	const bufferedMessageCount = usePeerStore(state => state.bufferedMessageCount);
	const hardReloadResume = usePeerStore(state => state.hardReloadResume);
	const error = usePeerStore(state => state.error);
	const transportKind = usePeerStore(state => state.connection?.kind);
	const sessionReadinessError = usePeerStore(state => state.p2pSessionAuthError);
	const battleReadinessError = usePeerStore(state => state.p2pBattleReadyError);
	const readinessError = battleReadinessError ?? sessionReadinessError;
	const disconnect = usePeerStore(state => state.disconnect);
	const previousState = useRef<P2PConnectionState | null>(null);

	useEffect(() => {
		const model = getP2PConnectionToastModel({
			connectionState,
			reconnectCountdown,
			reconnectAttemptCount,
			disconnectSide,
			bufferedMessageCount,
			hardReloadResume,
			error,
			transportKind,
		});
		if (model.kind !== 'success' || previousState.current !== null) showConnectionToast(model, disconnect);
		previousState.current = connectionState;
	}, [
		bufferedMessageCount,
		connectionState,
		disconnectSide,
		error,
		hardReloadResume,
		reconnectAttemptCount,
		reconnectCountdown,
		transportKind,
		disconnect,
	]);

	useEffect(() => {
		if (!readinessError || connectionState !== 'connected') {
			toast.dismiss(READINESS_TOAST_ID);
			return;
		}
		toast.error('Match verification paused', {
			id: READINESS_TOAST_ID,
			description: readinessError,
			duration: Infinity,
			action: { label: 'Leave match', onClick: disconnect },
		});
	}, [connectionState, disconnect, readinessError]);

	return null;
}

export default P2PStatusToast;
