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
 * 2. `p2pInitApplied` — both-peer cards handshake init has populated
 *    local gameState (`initGameFromHandshake`, or leftover host `init`
 *    in legacy mode). Without this gate the coordinator could mount on
 *    an empty/stale gameState and accept inputs the peer cannot resolve
 *    (TD-15).
 *
 * Quick Match has an additional final gate in `MatchSetupP2P`: bilateral
 * acceptance authorization, the peer-specific relay ticket and the complete
 * handshake must be ready before MatchContext/coordinator mount. This guard
 * remains the transport/legacy compatibility gate that keeps the wire sync
 * mounted while that final gate resolves.
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
	readonly hardReloadResume?: boolean;
	/** A resolved lifecycle may render its result after the socket is closed. */
	readonly terminalLifecycle?: boolean;
}

export type P2PRenderGuardDecision =
	| { readonly kind: 'wait'; readonly reason: string }
	| { readonly kind: 'render' };

function hasLiveBoard(input: P2PRenderGuardInput): boolean {
	return Boolean(input.opponentArmyFromPeer && input.p2pInitApplied);
}

function reconnectWaitReason(input: P2PRenderGuardInput): string {
	const countdown = input.reconnectCountdown > 0 ? ` ${input.reconnectCountdown}s.` : '';
	const prefix = input.hardReloadResume
		? 'Rejoining your saved match from this device…'
		: 'Reconnecting with opponent…';
	return `${prefix}${countdown}`;
}

export function computeP2PRenderGuard(input: P2PRenderGuardInput): P2PRenderGuardDecision {
	if (input.terminalLifecycle) return { kind: 'render' };
	if (input.connectionState === 'connecting' || input.connectionState === 'waiting') {
		return { kind: 'wait', reason: 'Connecting with opponent…' };
	}
	if (input.connectionState === 'reconnecting' || input.connectionState === 'grace_period') {
		if (hasLiveBoard(input)) return { kind: 'render' };
		return { kind: 'wait', reason: reconnectWaitReason(input) };
	}
	if (input.connectionState === 'error') {
		if (hasLiveBoard(input)) return { kind: 'render' };
		return { kind: 'wait', reason: 'Match connection failed. Return to the lobby and try again.' };
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
