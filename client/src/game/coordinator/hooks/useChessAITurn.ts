/**
 * useChessAITurn — wires the AI turn factory into the chess phase.
 *
 * The hook owns React lifecycle: gating on `enabled`, `currentTurn`,
 * `gameStatus`, and `matchSeed`; allocating the timeout batch; and clearing
 * it on every effect re-run so a turn flip mid-chain cannot leave a stray
 * `attemptMove` queued behind us. The turn logic itself lives in
 * `chessAITurnDriver` (pure factory, testable without React).
 *
 * `matchSeed` gate: in single mode no peer exists so the AI plays the
 * opponent; in P2P the seed is set at seed_reveal and remote envelopes
 * drive the opponent instead — firing the AI there would mutate state the
 * remote never agreed to.
 */

import { useEffect, useRef } from 'react';
import { useUnifiedCombatStore } from '../../stores/unifiedCombatStore';
import { useGameStore } from '../../stores/gameStore';
import { cryptoRng } from '../../utils/seededRng';
import { debug } from '../../config/debugConfig';
import {
	createChessAITurnDriver,
	CHESS_AI_FIRST_ATTEMPT_DELAY_MS,
	type ChessAIDriverSlice,
} from './chessAITurnDriver';

interface ChessAITurnOptions {
	readonly enabled: boolean;
}

type TimeoutId = ReturnType<typeof setTimeout>;

export function useChessAITurn({ enabled }: ChessAITurnOptions): void {
	const currentTurn = useUnifiedCombatStore((s) => s.boardState.currentTurn);
	const gameStatus = useUnifiedCombatStore((s) => s.boardState.gameStatus);
	const matchSeed = useGameStore((s) => s.matchSeed);

	const timeoutsRef = useRef<TimeoutId[]>([]);

	useEffect(() => {
		const timeouts = timeoutsRef.current;

		const clearAllTimeouts = (): void => {
			for (const id of timeouts) clearTimeout(id);
			timeouts.length = 0;
		};

		const schedule = (fn: () => void, ms: number): void => {
			const id = setTimeout(() => {
				const idx = timeouts.indexOf(id);
				if (idx !== -1) timeouts.splice(idx, 1);
				fn();
			}, ms);
			timeouts.push(id);
		};

		if (!enabled) return clearAllTimeouts;
		if (currentTurn !== 'opponent') return clearAllTimeouts;
		if (gameStatus !== 'playing') return clearAllTimeouts;
		if (matchSeed) return clearAllTimeouts;

		const driver = createChessAITurnDriver({
			getSlice: () => useUnifiedCombatStore.getState() as unknown as ChessAIDriverSlice,
			rngFallback: cryptoRng,
			schedule,
			log: debug.ai,
		});

		schedule(() => driver.runAITurn(), CHESS_AI_FIRST_ATTEMPT_DELAY_MS);
		return clearAllTimeouts;
	}, [enabled, currentTurn, gameStatus, matchSeed]);
}
