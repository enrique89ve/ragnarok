import type { ArmySelection } from '../../types/ChessTypes';

/**
 * Pure decision used by `MultiplayerGame.tsx` to choose between the
 * spinner placeholder and the in-game coordinator. Two preconditions:
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
 * Lives outside the component so it can be unit-tested without a JSX
 * runtime — the project's vitest config is `environment: "node"`.
 */
export interface P2PRenderGuardInput {
	readonly opponentArmyFromPeer: ArmySelection | null;
	readonly p2pInitApplied: boolean;
}

export type P2PRenderGuardDecision =
	| { readonly kind: 'wait'; readonly reason: string }
	| { readonly kind: 'render' };

export function computeP2PRenderGuard(input: P2PRenderGuardInput): P2PRenderGuardDecision {
	if (!input.opponentArmyFromPeer) {
		return { kind: 'wait', reason: 'Syncing opponent army…' };
	}
	if (!input.p2pInitApplied) {
		return { kind: 'wait', reason: 'Syncing initial state…' };
	}
	return { kind: 'render' };
}
