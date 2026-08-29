import { createP2PPhaseCheckpointCoordinator } from './p2pPhaseCheckpointCoordinator';
import { createP2PPokerTimeNotary } from './p2pPokerTimeNotary';
import { markP2PActiveMatchTerminal } from './p2pActiveMatchRegistry';
import type { PhaseCheckpointCoordinatorResult } from './p2pPhaseCheckpointCoordinator';

export const P2P_REFEREE_RECONNECT_RETENTION_MS = 120_000;

export type P2PRefereePlane = 'control' | 'relay';

const liveRoomsByPlane: Record<P2PRefereePlane, Set<string>> = {
	control: new Set<string>(),
	relay: new Set<string>(),
};
const refereeRoomExpiryTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * One referee state per server process, shared by both P2P entry points.
 * Gameplay may use WebRTC or the relay, but a match must never get a second
 * checkpoint/notary history merely because its transport changed.
 */
export const p2pPhaseCheckpointCoordinator = createP2PPhaseCheckpointCoordinator();
export const p2pPokerTimeNotary = createP2PPokerTimeNotary();

function isP2PRefereeRoomLive(roomId: string): boolean {
	return liveRoomsByPlane.control.has(roomId) || liveRoomsByPlane.relay.has(roomId);
}

function clearP2PRefereeRoomExpiry(roomId: string): void {
	const timer = refereeRoomExpiryTimers.get(roomId);
	if (!timer) return;
	clearTimeout(timer);
	refereeRoomExpiryTimers.delete(roomId);
}

function dropP2PRefereeRoom(roomId: string): void {
	clearP2PRefereeRoomExpiry(roomId);
	p2pPhaseCheckpointCoordinator.dropRoom(roomId);
	p2pPokerTimeNotary.dropRoom(roomId);
}

/** Mark a transport plane present and preserve any referee state for it. */
export function markP2PRefereePlaneConnected(roomId: string, plane: P2PRefereePlane): void {
	liveRoomsByPlane[plane].add(roomId);
	clearP2PRefereeRoomExpiry(roomId);
}

/**
 * Decouple referee lifetime from a socket lifetime. State is retained while
 * either gameplay or control is still present, then for a bounded reconnect
 * window after both planes disappear.
 */
export function markP2PRefereePlaneDisconnected(roomId: string, plane: P2PRefereePlane): void {
	liveRoomsByPlane[plane].delete(roomId);
	if (isP2PRefereeRoomLive(roomId) || refereeRoomExpiryTimers.has(roomId)) return;
	const timer = setTimeout(() => {
		refereeRoomExpiryTimers.delete(roomId);
		if (!isP2PRefereeRoomLive(roomId)) dropP2PRefereeRoom(roomId);
	}, P2P_REFEREE_RECONNECT_RETENTION_MS);
	timer.unref?.();
	refereeRoomExpiryTimers.set(roomId, timer);
}

export function markP2PActiveMatchTerminalFromCheckpoint(
	roomId: string,
	result: PhaseCheckpointCoordinatorResult,
): void {
	if (result.status !== 'message'
		|| result.message.type !== 'phase_checkpoint_commit_v1'
		|| result.message.toPhase !== 'game_over') return;
	markP2PActiveMatchTerminal(roomId);
}
