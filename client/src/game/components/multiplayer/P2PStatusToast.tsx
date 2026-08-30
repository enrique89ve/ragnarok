import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import type { P2PConnectionState } from '../../stores/peerStore';
import { usePeerStore } from '../../stores/peerStore';
import { clearP2PMatchResume } from '../../p2p/p2pMatchResume';

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
	const battleLifecyclePhase = usePeerStore(state => state.battleLifecycle?.phase ?? null);
	const sessionReadinessError = usePeerStore(state => state.p2pSessionAuthError);
	const battleReadinessError = usePeerStore(state => state.p2pBattleReadyError);
	const readinessError = battleReadinessError ?? sessionReadinessError;
	const disconnect = usePeerStore(state => state.disconnect);
	const requestP2PLeave = usePeerStore(state => state.requestP2PLeave);
	const myPeerId = usePeerStore(state => state.myPeerId);
	const leaveMatch = useCallback(() => {
		const lifecycle = myPeerId ? requestP2PLeave(myPeerId) : null;
		void clearP2PMatchResume();
		if (lifecycle?.phase === 'cancelled') {
			toast.info('Match canceled before the first valid move. No result recorded.', { duration: 5_000 });
		}
		disconnect();
	}, [disconnect, myPeerId, requestP2PLeave]);
	const previousState = useRef<P2PConnectionState | null>(null);

	useEffect(() => {
		if (battleLifecyclePhase === 'resolved' || battleLifecyclePhase === 'cancelled') {
			toast.dismiss(CONNECTION_TOAST_ID);
			toast.dismiss(READINESS_TOAST_ID);
			previousState.current = connectionState;
			return;
		}
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
		if (model.kind !== 'success' || previousState.current !== null) showConnectionToast(model, leaveMatch);
		previousState.current = connectionState;
	}, [
		bufferedMessageCount,
		battleLifecyclePhase,
		connectionState,
		disconnectSide,
		error,
		hardReloadResume,
		reconnectAttemptCount,
		reconnectCountdown,
		transportKind,
		leaveMatch,
	]);

	useEffect(() => {
		if (battleLifecyclePhase === 'resolved' || battleLifecyclePhase === 'cancelled') {
			toast.dismiss(READINESS_TOAST_ID);
			return;
		}
		if (!readinessError || connectionState !== 'connected') {
			toast.dismiss(READINESS_TOAST_ID);
			return;
		}
		toast.error('Match verification paused', {
			id: READINESS_TOAST_ID,
			description: readinessError,
			duration: Infinity,
			action: { label: 'Leave match', onClick: leaveMatch },
		});
	}, [battleLifecyclePhase, connectionState, leaveMatch, readinessError]);

	return null;
}

export default P2PStatusToast;
