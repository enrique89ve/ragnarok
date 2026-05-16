import type { ArmySelection } from '../../types/ChessTypes';

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
 * 3. Both Hive session authorization messages are present. The signed
 *    transcript is not a post-board side channel in ranked P2P; if either
 *    Keychain prompt times out, the board stays gated instead of letting the
 *    match fail mid-game.
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
	if (input.p2pSessionAuthError) {
		return { kind: 'wait', reason: `Hive session authorization failed: ${input.p2pSessionAuthError}` };
	}
	if (!input.p2pSessionLocalAuthorized) {
		return { kind: 'wait', reason: 'Authorizing local Hive session…' };
	}
	if (!input.p2pSessionRemoteAuthorized) {
		return { kind: 'wait', reason: 'Waiting for opponent Hive authorization…' };
	}
	return { kind: 'render' };
}
