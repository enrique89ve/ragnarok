/**
 * <MatchSetupP2P/> — async wrapper that owns the P2P handshake →
 * MatchContext wiring, then mounts its children (the coordinator).
 *
 * Why this exists:
 *   The pre-Fase-5 flow let RagnarokGameCoordinator mount on a
 *   half-built P2P state (seed_reveal / cards handshake pending) and
 *   relied on per-effect gates inside the coordinator
 *   (`p2pInitApplied`, `matchSeed` truthy) to defer work. Each new
 *   coordinator effect had to re-implement the same gate.
 *
 *   This component centralizes the gate: until matchSeed, matchId AND
 *   p2pInitApplied are populated, the wrapper renders `fallback` and
 *   does NOT mount children. Once they are, `resolveP2P` builds a
 *   MatchContext, the wrapper pushes it into `useMatchStore`, and the
 *   children mount. From the coordinator's perspective ctx is already
 *   non-null and `p2pInitApplied` is already true at first render.
 *
 *   Unmount clears the active match so a follow-up navigation (back to
 *   home then re-enter multiplayer) starts from a clean store.
 *
 * Lifetime invariants:
 *   - Quick Match children only render after bilateral acceptance and complete
 *     P2P readiness; legacy manual rooms retain the handshake-only path.
 *   - on unmount, useMatchStore is cleared.
 */

import { useEffect, type ReactNode } from 'react';

import { useGameStore } from '../../../stores/gameStore';
import { usePeerStore } from '../../../stores/peerStore';
import { useMatchStore } from '../../store';
import { useMatchmakingStore } from '../../../stores/matchmakingStore';
import { computeP2PBattleReadiness } from '../../p2pBattleReadiness';
import { resolveP2P } from './resolver';

interface MatchSetupP2PProps {
	readonly children: ReactNode;
	readonly fallback?: ReactNode;
}

export function MatchSetupP2P({ children, fallback = null }: MatchSetupP2PProps) {
	const connectionState = usePeerStore((s) => s.connectionState);
	const myPeerId = usePeerStore((s) => s.myPeerId);
	const remotePeerId = usePeerStore((s) => s.remotePeerId);
	const opponentArmy = usePeerStore((s) => s.opponentArmy);
	const p2pInitApplied = usePeerStore((s) => s.p2pInitApplied);
	const matchSeed = useGameStore((s) => s.matchSeed);
	const matchId = useGameStore((s) => s.matchId);
	const myCanonicalSide = useGameStore((s) => s.myCanonicalSide);
	const activeMatch = useMatchStore((s) => s.activeMatch);
	const serverMatchCommitted = useMatchmakingStore((s) => s.matchCommitted);
	const expectedRoomId = useMatchmakingStore((s) => s.roomId);
	const matchTicket = usePeerStore((s) => s.matchTicket);
	const localAcceptanceVerified = usePeerStore((s) => s.p2pSessionLocalAuthorized);
	const remoteAcceptanceVerified = usePeerStore((s) => s.p2pSessionRemoteAuthorized);

	const handshakeReady =
		connectionState === 'connected' &&
		p2pInitApplied &&
		matchSeed !== null &&
		matchId !== null;
	const battleReadiness = serverMatchCommitted
		? computeP2PBattleReadiness({
			activeMatchKind: 'peer',
			serverMatchCommitted,
			localAcceptanceVerified,
			remoteAcceptanceVerified,
			matchTicket,
			expectedRoomId,
			expectedPeerId: myPeerId,
			connectionState,
			remotePeerId,
			matchId,
			matchSeed,
			opponentArmy,
			p2pInitApplied,
		})
		: { ready: true as const };
	const ready = handshakeReady && battleReadiness.ready;

	useEffect(() => {
		if (!ready) return;
		// matchId / matchSeed are non-null per `ready`; the runtime check
		// is just a TypeScript narrowing — `ready` already validated.
		if (!matchSeed || !matchId) return;
		const ctx = resolveP2P({
			matchId,
			matchSeed,
			remotePeerId: remotePeerId ?? '',
			myRole: myCanonicalSide === 'opponent' ? 'second-mover' : 'first-mover',
			opponentUsername: null,
		});
		useMatchStore.getState().setMatch(ctx);
	}, [ready, matchId, matchSeed, remotePeerId, myCanonicalSide]);

	useEffect(() => {
		return () => {
			useMatchStore.getState().clearMatch();
		};
	}, []);

	const activeMatchMatchesHandshake = Boolean(
		activeMatch
		&& activeMatch.matchId === matchId
		&& activeMatch.opponent.kind === 'peer'
		&& activeMatch.opponent.peerId === remotePeerId,
	);
	if (!ready || !activeMatchMatchesHandshake) {
		return <>{fallback}</>;
	}

	return <>{children}</>;
}
