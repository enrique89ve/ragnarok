/**
 * useChessAITurn — wires the AI turn factory into the chess phase.
 *
 * The hook owns React lifecycle: gating on the derived chess turn policy,
 * allocating the timeout batch, and clearing it on every effect re-run so a
 * turn flip mid-chain cannot leave a stray `attemptMove` queued behind us.
 * The turn logic itself lives in
 * `chessAITurnDriver` (pure factory, testable without React).
 *
 * Mode gate: in local AI/campaign, the browser drives the opponent. In P2P,
 * the remote peer drives that side over the wire, so scheduling local AI would
 * mutate state the remote never agreed to.
 */

import { useEffect, useRef } from 'react';
import { useUnifiedCombatStore } from '../../stores/unifiedCombatStore';
import { useMatchStore } from '../../match';
import { cryptoRng } from '../../utils/seededRng';
import { debug } from '../../config/debugConfig';
import {
	createChessAITurnDriver,
	CHESS_AI_FIRST_ATTEMPT_DELAY_MS,
	type ChessAIDriverSlice,
} from './chessAITurnDriver';
import { deriveChessTurnPolicy } from './chessTurnPolicy';

interface ChessAITurnOptions {
	readonly enabled: boolean;
}

type TimeoutId = ReturnType<typeof setTimeout>;

export function useChessAITurn({ enabled }: ChessAITurnOptions): void {
	const currentTurn = useUnifiedCombatStore((s) => s.boardState.currentTurn);
	const gameStatus = useUnifiedCombatStore((s) => s.boardState.gameStatus);
	const activeMatch = useMatchStore((s) => s.activeMatch);
	const isP2PMatch = activeMatch?.opponent.kind === 'peer';

	const timeoutsRef = useRef<TimeoutId[]>([]);

	useEffect(() => {
		const timeouts = timeoutsRef.current;

		const clearAllTimeouts = (): void => {
			for (const id of timeouts) clearTimeout(id);
			timeouts.length = 0;
		};

		const policy = deriveChessTurnPolicy({
			enabled,
			currentTurn,
			gameStatus,
			isP2PMatch,
		});

		const schedule = (fn: () => void, ms: number): void => {
			const id = setTimeout(() => {
				const idx = timeouts.indexOf(id);
				if (idx !== -1) timeouts.splice(idx, 1);
				fn();
			}, ms);
			timeouts.push(id);
		};

		if (!policy.shouldScheduleAiTurn) return clearAllTimeouts;

		const driver = createChessAITurnDriver({
			getSlice: () => useUnifiedCombatStore.getState() as unknown as ChessAIDriverSlice,
			rngFallback: cryptoRng,
			schedule,
			log: debug.ai,
		});

		schedule(() => driver.runAITurn(), CHESS_AI_FIRST_ATTEMPT_DELAY_MS);
		return clearAllTimeouts;
	}, [enabled, currentTurn, gameStatus, isP2PMatch]);
}
