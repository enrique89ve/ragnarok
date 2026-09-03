import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
	POKER_ENTRY_APPROVAL_TIMEOUT_MS,
	type PokerEntryApprovalState,
} from '@shared/p2p-wire/pokerEntryApproval';
import { P2P_CONTROL_PROTOCOL_VERSION } from '@shared/p2p-wire/control';
import { usePeerStore } from '../stores/peerStore';

export type PokerEntryApprovalView = Readonly<{
	status: 'connecting' | 'pending' | 'paused' | 'committed' | 'expired' | 'error';
	secondsRemaining: number;
	localReady: boolean;
	localApprovalPending: boolean;
	opponentReady: boolean;
	canApprove: boolean;
	onApprove: () => void;
}>;

export function buildPokerEntryCombatId(input: Readonly<{
	matchId: string;
	moveCount: number;
	attackerId: string;
	defenderId: string;
}>): string {
	return `${input.matchId}:${input.moveCount}:${input.attackerId}:${input.defenderId}`.slice(0, 256);
}

function readTransportEpoch(connection: Readonly<{ transportEpoch?: number }>): number | null {
	const value = connection.transportEpoch;
	return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : null;
}

function resolveViewStatus(input: Readonly<{
	connectionState: string;
	controlAvailable: boolean | undefined;
	serverStatus: PokerEntryApprovalState['status'] | undefined;
}>): PokerEntryApprovalView['status'] {
	if (input.connectionState !== 'connected') return 'paused';
	if (input.serverStatus) return input.serverStatus;
	return input.controlAvailable ? 'connecting' : 'error';
}

function projectSecondsRemaining(input: Readonly<{
	serverState: PokerEntryApprovalState | null;
	nowMs: number;
	receivedAtMs: number;
}>): number {
	const remainingMs = input.serverState?.remainingMs ?? POKER_ENTRY_APPROVAL_TIMEOUT_MS;
	if (input.serverState?.status !== 'pending') return Math.ceil(remainingMs / 1000);
	return Math.max(0, Math.ceil((remainingMs - (input.nowMs - input.receivedAtMs)) / 1000));
}

export function usePokerEntryApproval(input: Readonly<{
	enabled: boolean;
	matchId: string | null;
	combatId: string | null;
	onCommitted: () => void;
}>): PokerEntryApprovalView | null {
	const { enabled, matchId, combatId, onCommitted } = input;
	const connection = usePeerStore(state => state.connection);
	const connectionState = usePeerStore(state => state.connectionState);
	const myPeerId = usePeerStore(state => state.myPeerId);
	const remotePeerId = usePeerStore(state => state.remotePeerId);
	const recordExpiry = usePeerStore(state => state.recordPokerEntryApprovalExpired);
	const [serverState, setServerState] = useState<PokerEntryApprovalState | null>(null);
	const [nowMs, setNowMs] = useState(() => Date.now());
	const [stateReceivedAtMs, setStateReceivedAtMs] = useState(() => Date.now());
	const [approvalRequestedForCombat, setApprovalRequestedForCombat] = useState<string | null>(null);
	const committedCombatRef = useRef<string | null>(null);
	const expiredCombatRef = useRef<string | null>(null);

	useEffect(() => {
		if (!enabled || !matchId || !combatId || !connection?.sendControlMessage || !connection.onControlMessage) {
			setServerState(null);
			return;
		}
		const transportEpoch = readTransportEpoch(connection);
		if (transportEpoch === null) return;
		const unsubscribe = connection.onControlMessage(message => {
			if (message.type !== 'poker_entry_approval_state_v1'
				|| message.matchId !== matchId
				|| message.combatId !== combatId
				|| message.transportEpoch !== connection.transportEpoch) return;
			const receivedAtMs = Date.now();
			setServerState(message);
			setNowMs(receivedAtMs);
			setStateReceivedAtMs(receivedAtMs);
		});
		try {
			connection.sendControlMessage({
				type: 'poker_entry_open_v1',
				protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
				matchId,
				transportEpoch,
				combatId,
			});
		} catch {
			setServerState(null);
		}
		return unsubscribe;
	}, [combatId, connection, enabled, matchId]);

	useEffect(() => {
		if (serverState?.status !== 'pending' || serverState.deadlineAtMs === null) return;
		const timer = setInterval(() => setNowMs(Date.now()), 250);
		return () => clearInterval(timer);
	}, [serverState?.deadlineAtMs, serverState?.status]);

	useEffect(() => {
		if (!serverState || !combatId) return;
		if (serverState.status === 'committed' && committedCombatRef.current !== combatId) {
			committedCombatRef.current = combatId;
			onCommitted();
		}
		if (serverState.status === 'expired' && expiredCombatRef.current !== combatId) {
			expiredCombatRef.current = combatId;
			recordExpiry(serverState.readyPeerIds, `poker-entry-expired:${combatId}`);
		}
	}, [combatId, onCommitted, recordExpiry, serverState]);

	const approve = useCallback(() => {
		if (!enabled || !matchId || !combatId || !connection?.sendControlMessage) return;
		const transportEpoch = readTransportEpoch(connection);
		if (transportEpoch === null) return;
		setApprovalRequestedForCombat(combatId);
		try {
			connection.sendControlMessage({
				type: 'poker_entry_ready_v1',
				protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
				matchId,
				transportEpoch,
				combatId,
			});
		} catch {
			setApprovalRequestedForCombat(null);
		}
	}, [combatId, connection, enabled, matchId]);

	return useMemo(() => {
		if (!enabled) return null;
		const localReady = Boolean(myPeerId && serverState?.readyPeerIds.includes(myPeerId));
		const opponentReady = Boolean(remotePeerId && serverState?.readyPeerIds.includes(remotePeerId));
		const localApprovalPending = approvalRequestedForCombat === combatId && !localReady;
		const secondsRemaining = projectSecondsRemaining({ serverState, nowMs, receivedAtMs: stateReceivedAtMs });
		const status = resolveViewStatus({
			connectionState,
			controlAvailable: connection?.controlAvailable,
			serverStatus: serverState?.status,
		});
		return {
			status,
			secondsRemaining,
			localReady,
			localApprovalPending,
			opponentReady,
			canApprove: status === 'pending' && !localReady && !localApprovalPending && connectionState === 'connected',
			onApprove: approve,
		};
	}, [approvalRequestedForCombat, approve, combatId, connection?.controlAvailable, connectionState, enabled, myPeerId, nowMs, remotePeerId, serverState, stateReceivedAtMs]);
}
