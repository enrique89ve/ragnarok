import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { accountScopedStorage, registerAccountScopedStore } from '../../../lib/storage/accountScopedStorage';
import { StorageKeys } from '../../config/storageKeys';
import {
	appendSingleRecord,
	deriveSingleStreak,
	formatSingleStreak,
	normalizeBattleRecord,
	SINGLE_RECORD_MAX,
	type LocalBattleMode,
	type SingleMatchRecord,
	type SingleMatchResult,
} from './singleRecordRules';

type SingleRecordState = {
	readonly records: ReadonlyArray<SingleMatchRecord>;
	readonly recordBattleResult: (input: {
		readonly matchId: string;
		readonly result: SingleMatchResult;
		readonly mode: LocalBattleMode;
		readonly endedAt?: number;
	}) => void;
	readonly recordSingleResult: (input: {
		readonly matchId: string;
		readonly result: SingleMatchResult;
		readonly endedAt?: number;
	}) => void;
	readonly clearRecords: () => void;
};

export const useSingleRecordStore = create<SingleRecordState>()(
	persist(
		(set, get) => ({
			records: [],
			recordBattleResult: (input) => {
				const next: SingleMatchRecord = {
					matchId: input.matchId,
					result: input.result,
					mode: input.mode,
					endedAt: input.endedAt ?? Date.now(),
				};
				const records = appendSingleRecord(get().records, next, SINGLE_RECORD_MAX);
				if (records === get().records) return;
				set({ records });
			},
			recordSingleResult: (input) => {
				get().recordBattleResult({
					...input,
					mode: 'single',
				});
			},
			clearRecords: () => set({ records: [] }),
		}),
		{
			name: StorageKeys.SINGLE_RECORD,
			storage: createJSONStorage(() => accountScopedStorage),
			partialize: (state) => ({ records: state.records }),
			merge: (persistedState, currentState) => {
				if (typeof persistedState !== 'object' || persistedState === null) return currentState;
				const rawRecords = (persistedState as { records?: unknown }).records;
				if (!Array.isArray(rawRecords)) return currentState;
				return {
					...currentState,
					records: rawRecords
						.map(normalizeBattleRecord)
						.filter((record): record is SingleMatchRecord => record !== null),
				};
			},
		},
	),
);

registerAccountScopedStore(useSingleRecordStore);

export function selectSingleStreakLabel(state: SingleRecordState): string {
	return formatSingleStreak(deriveSingleStreak(state.records, 'single'));
}
