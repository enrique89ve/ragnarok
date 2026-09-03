import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import type { P2PConnectionState } from '../../stores/peerStore';
import { usePeerStore } from '../../stores/peerStore';
import { clearP2PMatchResume } from '../../p2p/p2pMatchResume';
import { selectFlowTag, useGameFlowStore } from '../../stores/gameFlowStore';
import { resolveP2PMatchPauseView } from '../../p2p/p2pMatchPauseView';
import { getP2PConnectionToastModel, type P2PConnectionToastModel } from './p2pConnectionToastModel';

const CONNECTION_TOAST_ID = 'p2p-connection-state';
const READINESS_TOAST_ID = 'p2p-match-readiness';

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
	const integrityError = usePeerStore(state => state.p2pIntegrityError);
	const readinessError = integrityError ?? battleReadinessError ?? sessionReadinessError;
	const flowTag = useGameFlowStore(selectFlowTag);
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
	const overlayActive = resolveP2PMatchPauseView({
		connectionState,
		disconnectSide,
		integrityError,
		reconnectCountdown,
		reconnectAttemptCount,
	}) !== null;

	useEffect(() => {
		if (
			overlayActive
			|| battleLifecyclePhase === 'resolved'
			|| battleLifecyclePhase === 'cancelled'
			|| flowTag === 'poker_combat'
		) {
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
		flowTag,
		overlayActive,
	]);

	useEffect(() => {
		if (
			overlayActive
			|| (!integrityError && (battleLifecyclePhase === 'resolved' || battleLifecyclePhase === 'cancelled' || flowTag === 'poker_combat'))
		) {
			toast.dismiss(READINESS_TOAST_ID);
			return;
		}
		if (!readinessError || connectionState !== 'connected') {
			toast.dismiss(READINESS_TOAST_ID);
			return;
		}
		toast.error(integrityError ? 'Game integrity paused' : 'Match verification paused', {
			id: READINESS_TOAST_ID,
			description: readinessError,
			duration: Infinity,
			action: { label: 'Leave match', onClick: leaveMatch },
		});
	}, [battleLifecyclePhase, connectionState, flowTag, integrityError, leaveMatch, overlayActive, readinessError]);

	return null;
}
