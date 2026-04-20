/*
  rivalryStore.ts \u2014 tracks the last 10 unique opponents the player has
  faced in PvP. When a known opponent re-appears in the matchmaking
  lobby, the UI fires a "REMATCH" banner with the previous score
  ("they beat you 3-2 last time"), giving every PvP fight a small
  amount of personal history.

  Behavior:
    - On match end, recordResult() is called with the opponent's
      identifier and the outcome.
    - If the opponent is already in the rivalry list, their record is
      updated in place AND moved to the front (most recent).
    - If they are new, they are pushed to the front and the list is
      capped at MAX_RIVALS (10). Older rivalries fall off the bottom.
    - getRivalry() does an O(n<=10) lookup by opponent ID for the
      matchmaking lobby to use.

  This is intentionally local-only. There is no server sync. Two players
  on different machines will each see their own version of the rivalry
  history. That's fine \u2014 the goal is personal narrative, not
  authoritative leaderboarding.
*/

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_RIVALS = 10;

export interface RivalRecord {
	opponentId: string;          // username, peerId, or any stable identifier
	displayName: string;         // pretty name for UI
	wins: number;                // matches the player has won against this opponent
	losses: number;              // matches the player has lost against this opponent
	lastSeen: number;            // timestamp of most recent match
	lastResult: 'win' | 'loss';  // result of the most recent match (for streak UI)
}

interface RivalryState {
	rivals: RivalRecord[];
	recordResult: (opponentId: string, displayName: string, won: boolean) => void;
	getRivalry: (opponentId: string) => RivalRecord | undefined;
	clear: () => void;
}

export const useRivalryStore = create<RivalryState>()(
	persist(
		(set, get) => ({
			rivals: [],

			recordResult: (opponentId: string, displayName: string, won: boolean) => {
				if (!opponentId) return;
				const existing = get().rivals.find(r => r.opponentId === opponentId);
				const updated: RivalRecord = existing
					? {
						...existing,
						displayName: displayName || existing.displayName,
						wins: existing.wins + (won ? 1 : 0),
						losses: existing.losses + (won ? 0 : 1),
						lastSeen: Date.now(),
						lastResult: won ? 'win' : 'loss',
					}
					: {
						opponentId,
						displayName: displayName || opponentId,
						wins: won ? 1 : 0,
						losses: won ? 0 : 1,
						lastSeen: Date.now(),
						lastResult: won ? 'win' : 'loss',
					};

				// Move to front and cap at MAX_RIVALS.
				const filtered = get().rivals.filter(r => r.opponentId !== opponentId);
				const next = [updated, ...filtered].slice(0, MAX_RIVALS);
				set({ rivals: next });
			},

			getRivalry: (opponentId: string) => {
				if (!opponentId) return undefined;
				return get().rivals.find(r => r.opponentId === opponentId);
			},

			clear: () => set({ rivals: [] }),
		}),
		{ name: 'ragnarok-pvp-rivalries' }
	)
);
