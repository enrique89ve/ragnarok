/**
 * duatClaimStore.ts — DUAT airdrop claim state
 *
 * Loads the frozen snapshot, checks if current user is eligible,
 * and manages the claim flow (popup → broadcast → confirmed).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { debug } from '../config/debugConfig';

interface DuatHolder {
	account: string;
	duatRaw: number;
	packs: number;
}

interface DuatSnapshot {
	version: number;
	snapshotHash: string;
	stats: { eligibleHolders: number; totalPacks: number };
	holders: DuatHolder[];
}

interface DuatClaimState {
	snapshotLoaded: boolean;
	dismissed: boolean;
	holders: Map<string, DuatHolder>;
	currentUserEntry: DuatHolder | null;
	claimed: boolean;
	claimTrxId: string | null;
	loading: boolean;

	loadSnapshot: () => Promise<void>;
	checkAccount: (username: string) => void;
	claimPacks: () => Promise<void>;
	dismiss: () => void;
	reset: () => void;
}

export const useDuatClaimStore = create<DuatClaimState>()(
	persist(
		(set, get) => ({
			snapshotLoaded: false,
			dismissed: false,
			holders: new Map(),
			currentUserEntry: null,
			claimed: false,
			claimTrxId: null,
			loading: false,

			loadSnapshot: async () => {
				if (get().snapshotLoaded) return;
				try {
					const base = import.meta.env.BASE_URL || './';
					const resp = await fetch(`${base}data/duat-snapshot.json`);
					if (!resp.ok) {
						debug.warn('[DUAT] Snapshot not found — airdrop disabled');
						return;
					}
					const data = await resp.json() as DuatSnapshot;
					const map = new Map<string, DuatHolder>();
					for (const h of data.holders) {
						map.set(h.account, h);
					}
					set({ snapshotLoaded: true, holders: map });
					debug.log(`[DUAT] Snapshot loaded: ${map.size} holders, ${data.stats.totalPacks} packs`);
				} catch (err) {
					debug.warn('[DUAT] Failed to load snapshot:', err);
				}
			},

			checkAccount: (username: string) => {
				const { holders, claimed } = get();
				const entry = holders.get(username) || null;
				set({ currentUserEntry: entry });
				if (entry && !claimed) {
					debug.log(`[DUAT] Eligible: @${username} — ${entry.duatRaw / 1000} DUAT → ${entry.packs} packs`);
				}
			},

			claimPacks: async () => {
				const { currentUserEntry, claimed } = get();
				if (!currentUserEntry || claimed) return;

				set({ loading: true });
				try {
					const { hiveSync } = await import('../../data/HiveSync');
					const result = await hiveSync.claimDuatAirdrop(
						currentUserEntry.duatRaw,
						currentUserEntry.packs,
					);
					if (result.success) {
						set({
							claimed: true,
							claimTrxId: result.trxId || null,
							loading: false,
						});
						debug.log(`[DUAT] Claimed ${currentUserEntry.packs} packs — trxId: ${result.trxId}`);
					} else {
						set({ loading: false });
						debug.warn('[DUAT] Claim failed:', result.error);
					}
				} catch (err) {
					set({ loading: false });
					debug.warn('[DUAT] Claim error:', err);
				}
			},

			dismiss: () => set({ dismissed: true }),

			reset: () => set({
				snapshotLoaded: false,
				dismissed: false,
				holders: new Map(),
				currentUserEntry: null,
				claimed: false,
				claimTrxId: null,
				loading: false,
			}),
		}),
		{
			name: 'ragnarok-duat-claim',
			partialize: (state) => ({
				claimed: state.claimed,
				claimTrxId: state.claimTrxId,
				dismissed: state.dismissed,
			}),
		},
	),
);
