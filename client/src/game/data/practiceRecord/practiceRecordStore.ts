import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { accountScopedStorage, registerAccountScopedStore } from '../../../lib/storage/accountScopedStorage';
import { StorageKeys } from '../../config/storageKeys';
import {
	appendPracticeRecord,
	derivePracticeStreak,
	formatPracticeStreak,
	PRACTICE_RECORD_MAX,
	type PracticeMatchRecord,
	type PracticeMatchResult,
} from './practiceRecordRules';

type PracticeRecordState = {
	readonly records: ReadonlyArray<PracticeMatchRecord>;
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
			recordPracticeResult: (input) => {
				const next = {
					matchId: input.matchId,
					result: input.result,
					endedAt: input.endedAt ?? Date.now(),
				};
				const records = appendPracticeRecord(get().records, next, PRACTICE_RECORD_MAX);
				if (records === get().records) return;
				set({ records });
			},
			clearRecords: () => set({ records: [] }),
		}),
		{
			name: StorageKeys.PRACTICE_RECORD,
			storage: createJSONStorage(() => accountScopedStorage),
			partialize: (state) => ({ records: state.records }),
		},
	),
);

registerAccountScopedStore(usePracticeRecordStore);

export function selectPracticeStreakLabel(state: PracticeRecordState): string {
	return formatPracticeStreak(derivePracticeStreak(state.records));
}
