import type { ArmySelection } from '../../types/ChessTypes';
import type { P2PConnectionState } from '../../stores/peerStore';

/**
 * Pure decision used by `MultiplayerGame.tsx` to choose between the
 * spinner placeholder and the in-game coordinator. Preconditions:
 *
 * 1. `opponentArmyFromPeer` — the remote peer has announced their army.
 *    Without it, hero portraits fall back to defaults and the board
 *    would later be re-initialized when the announcement arrives.
 *
 * 2. `p2pInitApplied` — the host's `init` envelope has been applied
 *    locally. On the host this is set after `initGameWithSeed` populates
 *    gameState; on the client after `case 'init'` adopts the host's
 *    state via `setState`. Without this gate the coordinator could
 *    mount on an empty (post-C5) or stale gameState before the host's
 *    authoritative state arrives, allowing user input to reference
 *    cardIds the host does not recognize (TD-15).
 *
 * Hive session authorization is intentionally not a board gate in closed beta:
 * the signed transcript is an audit/settlement layer, while connectivity,
 * loadout exchange, and init sync decide whether gameplay can start.
 *
 * Lives outside the component so it can be unit-tested without a JSX
 * runtime — the project's vitest config is `environment: "node"`.
 */
export interface P2PRenderGuardInput {
	readonly opponentArmyFromPeer: ArmySelection | null;
	readonly p2pInitApplied: boolean;
	readonly p2pSessionLocalAuthorized: boolean;
	readonly p2pSessionRemoteAuthorized: boolean;
	readonly p2pSessionAuthError: string | null;
	readonly connectionState: P2PConnectionState;
	readonly reconnectCountdown: number;
	readonly reconnectAttemptCount: number;
}

export type P2PRenderGuardDecision =
	| { readonly kind: 'wait'; readonly reason: string }
	| { readonly kind: 'render' };

export function computeP2PRenderGuard(input: P2PRenderGuardInput): P2PRenderGuardDecision {
	if (input.connectionState === 'connecting' || input.connectionState === 'waiting') {
		return { kind: 'wait', reason: 'Connecting with opponent…' };
	}
	if (input.connectionState === 'reconnecting' || input.connectionState === 'grace_period') {
		const attempt = input.reconnectAttemptCount > 0 ? ` Attempt ${input.reconnectAttemptCount}/2.` : '';
		const countdown = input.reconnectCountdown > 0 ? ` ${input.reconnectCountdown}s before technical result.` : '';
		return { kind: 'wait', reason: `Reconnecting with opponent…${attempt}${countdown}` };
	}
	if (input.connectionState === 'error') {
		return { kind: 'wait', reason: 'P2P connection failed. Return to the lobby and try again.' };
	}
	if (input.connectionState !== 'connected') {
		return { kind: 'wait', reason: 'Waiting for opponent connection…' };
	}
	if (!input.opponentArmyFromPeer) {
		return { kind: 'wait', reason: 'Connected. Waiting for opponent loadout…' };
	}
	if (!input.p2pInitApplied) {
		return { kind: 'wait', reason: 'Connected. Syncing match state…' };
	}
	return { kind: 'render' };
}
