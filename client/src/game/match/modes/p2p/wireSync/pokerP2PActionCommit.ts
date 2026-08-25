import type { P2PPokerActionRejectionReason, P2PPokerActionResult } from './pokerP2PCombatAdapter';

export function settleRemotePokerAction(
	result: P2PPokerActionResult,
	effects: {
		readonly onApplied: () => void;
		readonly onRejected: (reason: P2PPokerActionRejectionReason) => void;
	},
): void {
	if (result.status === 'applied') {
		effects.onApplied();
		return;
	}
	effects.onRejected(result.reason);
}
