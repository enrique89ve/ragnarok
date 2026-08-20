import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { accountScopedStorage, registerAccountScopedStore } from '../../../lib/storage/accountScopedStorage';
import { StorageKeys } from '../../config/storageKeys';
import {
	appendPracticeRecord,
	derivePracticeStreak,
	formatPracticeStreak,
	normalizeBattleRecord,
	PRACTICE_RECORD_MAX,
	type LocalBattleMode,
	type PracticeMatchRecord,
	type PracticeMatchResult,
} from './practiceRecordRules';

type PracticeRecordState = {
	readonly records: ReadonlyArray<PracticeMatchRecord>;
	readonly recordBattleResult: (input: {
		readonly matchId: string;
		readonly result: PracticeMatchResult;
		readonly mode: LocalBattleMode;
		readonly endedAt?: number;
	}) => void;
	readonly recordPracticeResult: (input: {
		readonly matchId: string;
		readonly result: PracticeMatchResult;
		readonly endedAt?: number;
	}) => void;
	readonly clearRecords: () => void;
};

export const usePracticeRecordStore = create<PracticeRecordState>()(
	persist(
		(set, get) => ({
			records: [],
			recordBattleResult: (input) => {
				const next: PracticeMatchRecord = {
					matchId: input.matchId,
					result: input.result,
					mode: input.mode,
					endedAt: input.endedAt ?? Date.now(),
				};
				const records = appendPracticeRecord(get().records, next, PRACTICE_RECORD_MAX);
				if (records === get().records) return;
				set({ records });
			},
			recordPracticeResult: (input) => {
				get().recordBattleResult({
					...input,
					mode: 'practice',
				});
			},
			clearRecords: () => set({ records: [] }),
		}),
		{
			name: StorageKeys.PRACTICE_RECORD,
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
						.filter((record): record is PracticeMatchRecord => record !== null),
				};
			},
		},
	),
);

registerAccountScopedStore(usePracticeRecordStore);

export function selectPracticeStreakLabel(state: PracticeRecordState): string {
	return formatPracticeStreak(derivePracticeStreak(state.records, 'practice'));
}
