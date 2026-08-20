/**
 * Local battle-ledger adapter.
 *
 * History and match-end write through this seam. Source is the account-scoped
 * local store only — not chain IndexedDB, not replayStore.
 * Writes no-op unless a Hive user is logged in (not `guest`).
 */

import { useHiveDataStore } from '../../../data/HiveDataLayer';
import {
	derivePracticeStreak,
	filterBattleRecords,
	formatBattleMode,
	formatPracticeStreak,
	isBattleLedgerAccount,
	resultFromMatchEnd,
	type BattleLedgerFilter,
	type LocalBattleMode,
	type PracticeMatchRecord,
} from './practiceRecordRules';
import { usePracticeRecordStore } from './practiceRecordStore';

export function readLocalBattleAccount(): string | null {
	const raw = useHiveDataStore.getState().user?.hiveUsername;
	if (!isBattleLedgerAccount(raw)) return null;
	return raw.trim().toLowerCase().replace(/^@/, '');
}

export function recordLocalBattleEnd(input: {
	readonly matchId: string;
	readonly mode: LocalBattleMode;
	readonly iWon: boolean;
	readonly isDraw?: boolean;
	readonly endedAt?: number;
}): boolean {
	if (!readLocalBattleAccount()) return false;
	usePracticeRecordStore.getState().recordBattleResult({
		matchId: input.matchId,
		mode: input.mode,
		result: resultFromMatchEnd(input.iWon, input.isDraw === true),
		endedAt: input.endedAt,
	});
	return true;
}

export type LocalBattleLedgerView = {
	readonly signedIn: boolean;
	readonly rows: ReadonlyArray<PracticeMatchRecord>;
	readonly streakLabel: string;
	readonly wins: number;
	readonly losses: number;
	readonly draws: number;
	readonly filterLabel: string;
	readonly recordedCount: number;
};

function countResults(records: ReadonlyArray<PracticeMatchRecord>): {
	readonly wins: number;
	readonly losses: number;
	readonly draws: number;
} {
	let wins = 0;
	let losses = 0;
	let draws = 0;
	for (const record of records) {
		if (record.result === 'win') wins += 1;
		else if (record.result === 'draw') draws += 1;
		else losses += 1;
	}
	return { wins, losses, draws };
}

export function presentLocalBattleLedger(input: {
	readonly account: string | null | undefined;
	readonly records: ReadonlyArray<PracticeMatchRecord>;
	readonly filter: BattleLedgerFilter;
}): LocalBattleLedgerView {
	const signedIn = isBattleLedgerAccount(input.account);
	const source = signedIn ? input.records : [];
	const rows = filterBattleRecords(source, input.filter);
	const streak = formatPracticeStreak(derivePracticeStreak(rows));
	const counts = countResults(rows);
	return {
		signedIn,
		rows,
		streakLabel: streak === '—' ? 'No streak' : streak,
		wins: counts.wins,
		losses: counts.losses,
		draws: counts.draws,
		filterLabel: input.filter === 'all' ? 'All battles' : formatBattleMode(input.filter),
		recordedCount: rows.length,
	};
}
