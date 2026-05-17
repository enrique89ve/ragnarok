/**
 * battleHistoryStore.ts
 *
 * Zustand store for battle history tracking.
 * Keeps last 5 battles in localStorage.
 * 
 * Added from Enrique's fork - Jan 31, 2026
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { StorageKeys } from '@/game/config/storageKeys';
import { debug } from '@/game/config/debugConfig';
import { FeatureFlags, isBattleHistoryEnabled } from '@/game/config/featureFlags';
import { accountScopedStorage, registerAccountScopedStore } from '../../../lib/storage/accountScopedStorage';
import {
	createBattleSessionIdentity,
	normalizeBattleMode,
	resolveBattleHistoryHydration,
} from './battleHistoryRules';
import type { BattleHistoryEntry, BattleHistoryState } from './types';
import { cryptoRng } from '../../utils/seededRng';

type BattleHistoryStore = BattleHistoryState & {
	// Actions
	startBattle: (entry: Omit<BattleHistoryEntry, 'id' | 'timestamp' | 'duration' | 'result'>) => string;
	endBattle: (id: string, result: BattleHistoryEntry['result'], stats?: Partial<BattleHistoryEntry>) => void;
	updateBattle: (id: string, updates: Partial<BattleHistoryEntry>) => void;
	getBattle: (id: string) => BattleHistoryEntry | undefined;
	getRecentBattles: (count?: number) => BattleHistoryEntry[];
	clearHistory: () => void;
	isEnabled: () => boolean;
};

function generateBattleSessionId(mode: BattleHistoryEntry['mode']) {
	return createBattleSessionIdentity({
		mode: normalizeBattleMode(mode),
		startedAt: Date.now(),
		randomFraction: cryptoRng(),
	});
}

export const useBattleHistoryStore = create<BattleHistoryStore>()(
	persist(
		(set, get) => ({
			battles: [],
			currentBattleId: null,

			isEnabled: () => isBattleHistoryEnabled(),

			startBattle: (entry) => {
				if (!isBattleHistoryEnabled()) {
					return '';
				}

				const { sessionId, startedAt, mode } = generateBattleSessionId(entry.mode);
				const newEntry: BattleHistoryEntry = {
					...entry,
					id: sessionId,
					timestamp: startedAt,
					duration: 0,
					result: 'incomplete',
					mode,
				};

				set((state) => ({
					battles: [newEntry, ...state.battles].slice(0, FeatureFlags.BATTLE_HISTORY_MAX_SIZE),
					currentBattleId: sessionId,
				}));

				debug.combat('[BattleHistory] Started battle:', sessionId);
				return sessionId;
			},

			endBattle: (id, result, stats) => {
				if (!isBattleHistoryEnabled()) return;
				set((state) => {
					const battle = state.battles.find(b => b.id === id);
					if (!battle) return state;

					const duration = Date.now() - battle.timestamp;
					const updatedBattle: BattleHistoryEntry = {
						...battle,
						...stats,
						result,
						duration,
					};

					return {
						battles: state.battles.map(b => b.id === id ? updatedBattle : b),
						currentBattleId: state.currentBattleId === id ? null : state.currentBattleId,
					};
				});

				debug.combat('[BattleHistory] Ended battle:', id, result);
			},

			updateBattle: (id, updates) => {
				if (!isBattleHistoryEnabled()) return;
				set((state) => ({
					battles: state.battles.map(b =>
						b.id === id ? { ...b, ...updates } : b
					),
				}));
			},

			getBattle: (id) => {
				return get().battles.find(b => b.id === id);
			},

			getRecentBattles: (count = 5) => {
				return get().battles.slice(0, count);
			},

			clearHistory: () => {
				if (!isBattleHistoryEnabled()) return;
				set({ battles: [], currentBattleId: null });
			},
		}),
		{
			name: StorageKeys.BATTLE_HISTORY,
			storage: createJSONStorage(() => accountScopedStorage),
			partialize: (state) => ({ battles: state.battles }),
			merge: (persistedState, currentState) => ({
				...currentState,
				...resolveBattleHistoryHydration(persistedState, currentState),
			}),
		}
	)
);

registerAccountScopedStore(useBattleHistoryStore);

export default useBattleHistoryStore;
