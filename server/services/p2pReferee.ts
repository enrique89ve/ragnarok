import { createP2PPhaseCheckpointCoordinator } from './p2pPhaseCheckpointCoordinator';
import { createP2PPokerTimeNotary } from './p2pPokerTimeNotary';
import { markP2PActiveMatchTerminal } from './p2pActiveMatchRegistry';
import type { PhaseCheckpointCoordinatorResult } from './p2pPhaseCheckpointCoordinator';

/**
 * One referee state per server process, shared by both P2P entry points.
 * Gameplay may use WebRTC or the relay, but a match must never get a second
 * checkpoint/notary history merely because its transport changed.
 */
export const p2pPhaseCheckpointCoordinator = createP2PPhaseCheckpointCoordinator();
export const p2pPokerTimeNotary = createP2PPokerTimeNotary();

export function markP2PActiveMatchTerminalFromCheckpoint(
	roomId: string,
	result: PhaseCheckpointCoordinatorResult,
): void {
	if (result.status !== 'message'
		|| result.message.type !== 'phase_checkpoint_commit_v1'
		|| result.message.toPhase !== 'game_over') return;
	markP2PActiveMatchTerminal(roomId);
}
