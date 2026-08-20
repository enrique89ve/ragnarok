/**
 * Pure decision seam for settling a remote cards command after the engine
 * validates and applies it.
 */

import type { ApplyGameCommandResult } from '../../../../core/commands';

/** Stable wire-safe reason for an engine-rejected or ignored command. */
export const P2P_COMMAND_STATUS_REJECT_REASON = 'p2p_command_status';

export type RemoteCommandSettlementDispatchers = {
	readonly onApplied: () => void;
	readonly onUnapplied: (reason: string) => void;
};

/**
 * Only an applied command may advance the incoming sequence, enter the
 * transcript, or trigger post-apply synchronization.
 */
export function settleRemoteCommand(
	result: ApplyGameCommandResult,
	dispatchers: RemoteCommandSettlementDispatchers,
): void {
	if (result.status === 'applied') {
		dispatchers.onApplied();
		return;
	}
	dispatchers.onUnapplied(P2P_COMMAND_STATUS_REJECT_REASON);
}
