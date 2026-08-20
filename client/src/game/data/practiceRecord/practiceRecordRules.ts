/**
 * Local practice results. No RUNE, no ranking — consecutive W/L only.
 */

export const PRACTICE_RECORD_MAX = 30;

export type PracticeMatchResult = 'win' | 'loss';

export type PracticeMatchRecord = {
	readonly matchId: string;
	readonly result: PracticeMatchResult;
	readonly endedAt: number;
};

export type PracticeStreak =
	| { readonly kind: 'none' }
	| { readonly kind: 'win'; readonly count: number }
	| { readonly kind: 'loss'; readonly count: number };

export function resultFromMatchEnd(iWon: boolean): PracticeMatchResult {
	return iWon ? 'win' : 'loss';
}

export function appendPracticeRecord(
	records: ReadonlyArray<PracticeMatchRecord>,
	next: PracticeMatchRecord,
	max = PRACTICE_RECORD_MAX,
): ReadonlyArray<PracticeMatchRecord> {
	if (records.some((record) => record.matchId === next.matchId)) return records;
	return [next, ...records].slice(0, max);
}

export function derivePracticeStreak(
	records: ReadonlyArray<PracticeMatchRecord>,
): PracticeStreak {
	const latest = records[0];
	if (!latest) return { kind: 'none' };
	let count = 0;
	for (const record of records) {
		if (record.result !== latest.result) break;
		count += 1;
	}
	return { kind: latest.result, count };
}

export function formatPracticeStreak(streak: PracticeStreak): string {
	if (streak.kind === 'none') return '—';
	const noun = streak.count === 1
		? (streak.kind === 'win' ? 'win' : 'loss')
		: (streak.kind === 'win' ? 'wins' : 'losses');
	return `${streak.count} ${noun}`;
}
