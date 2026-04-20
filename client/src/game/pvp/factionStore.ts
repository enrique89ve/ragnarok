/*
  factionStore.ts \u2014 the player's pledged house in PvP.

  After a player completes the Norse chapter (or the longer Twilight of
  the Gods chapter), the FactionPledgePopup fires once and asks them to
  pick one of five mythological houses to align with for PvP. The pledge
  is permanent (unless the player resets it via debug). It serves three
  purposes:

    1. Identity \u2014 PvP profiles show "Sworn of Asgard" / "Sworn of
       Helheim" / etc. Other players see this in the matchmaking lobby.
    2. Cosmetic \u2014 the faction's color is used as an accent in the HUD.
    3. Future faction war meta-game \u2014 not yet implemented, but the
       store has a `factionWins`/`factionLosses` counter ready for when
       a server-side weekly faction tally lands.

  This is purely a flavor layer. It does not affect deck-building or
  combat balance in any way. The pledge can never gate gameplay.
*/

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FactionId } from './pvpData';

interface FactionState {
	pledgedFaction: FactionId | null;
	pledgedAt: number | null;
	pledgePopupShown: boolean;       // one-shot popup, never re-prompts
	factionWins: number;             // local count, future server-merged
	factionLosses: number;
	lastSeenRankId: number;          // Yggdrasil rank ID last seen (for rank-up detection)
	pledge: (faction: FactionId) => void;
	markPopupShown: () => void;
	recordPvpResult: (won: boolean) => void;
	setLastSeenRank: (rankId: number) => void;
	reset: () => void;
}

export const useFactionStore = create<FactionState>()(
	persist(
		(set) => ({
			pledgedFaction: null,
			pledgedAt: null,
			pledgePopupShown: false,
			factionWins: 0,
			factionLosses: 0,
			lastSeenRankId: 1,

			pledge: (faction: FactionId) => set({
				pledgedFaction: faction,
				pledgedAt: Date.now(),
				pledgePopupShown: true,
			}),

			markPopupShown: () => set({ pledgePopupShown: true }),

			recordPvpResult: (won: boolean) => set(state => ({
				factionWins: state.factionWins + (won ? 1 : 0),
				factionLosses: state.factionLosses + (won ? 0 : 1),
			})),

			setLastSeenRank: (rankId: number) => set({ lastSeenRankId: rankId }),

			reset: () => set({
				pledgedFaction: null,
				pledgedAt: null,
				pledgePopupShown: false,
				factionWins: 0,
				factionLosses: 0,
				lastSeenRankId: 1,
			}),
		}),
		{ name: 'ragnarok-faction-pledge' }
	)
);
