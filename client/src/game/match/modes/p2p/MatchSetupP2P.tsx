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
 *   - children only render once useMatchStore.activeMatch.opponent.kind === 'peer'.
 *   - on unmount, useMatchStore is cleared.
 */

import { useEffect, type ReactNode } from 'react';

import { useGameStore } from '../../../stores/gameStore';
import { usePeerStore } from '../../../stores/peerStore';
import { useMatchStore } from '../../store';
import { resolveP2P } from './resolver';

interface MatchSetupP2PProps {
	readonly children: ReactNode;
	readonly fallback?: ReactNode;
}

export function MatchSetupP2P({ children, fallback = null }: MatchSetupP2PProps) {
	const connectionState = usePeerStore((s) => s.connectionState);
	const remotePeerId = usePeerStore((s) => s.remotePeerId);
	const p2pInitApplied = usePeerStore((s) => s.p2pInitApplied);
	const matchSeed = useGameStore((s) => s.matchSeed);
	const matchId = useGameStore((s) => s.matchId);
	const myCanonicalSide = useGameStore((s) => s.myCanonicalSide);
	const activeMatch = useMatchStore((s) => s.activeMatch);

	const ready =
		connectionState === 'connected' &&
		p2pInitApplied &&
		matchSeed !== null &&
		matchId !== null;

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

	if (!activeMatch || activeMatch.opponent.kind !== 'peer') {
		return <>{fallback}</>;
	}

	return <>{children}</>;
}
