/**
 * Local battle results for History. No RUNE — device ledger only.
 */

export const SINGLE_RECORD_MAX = 50;

export type LocalBattleMode = 'single' | 'campaign' | 'p2p';

export type BattleLedgerFilter = 'all' | LocalBattleMode;

export type SingleMatchResult = 'win' | 'loss' | 'draw';

export type SingleMatchRecord = {
	readonly matchId: string;
	readonly result: SingleMatchResult;
	readonly endedAt: number;
	readonly mode: LocalBattleMode;
};

export type SingleStreak =
	| { readonly kind: 'none' }
	| { readonly kind: 'win'; readonly count: number }
	| { readonly kind: 'loss'; readonly count: number };

export function isBattleLedgerAccount(username: string | null | undefined): boolean {
	const name = username?.trim().toLowerCase().replace(/^@/, '') ?? '';
	return name.length > 0 && name !== 'guest';
}

export function resultFromMatchEnd(iWon: boolean, isDraw = false): SingleMatchResult {
	if (isDraw) return 'draw';
	return iWon ? 'win' : 'loss';
}

export function normalizeBattleMode(mode: unknown): LocalBattleMode {
	if (mode === 'campaign' || mode === 'p2p' || mode === 'single') return mode;
	return 'single';
}

export function normalizeBattleRecord(raw: unknown): SingleMatchRecord | null {
	if (typeof raw !== 'object' || raw === null) return null;
	const record = raw as Record<string, unknown>;
	if (typeof record.matchId !== 'string' || record.matchId.length === 0) return null;
	if (record.result !== 'win' && record.result !== 'loss' && record.result !== 'draw') return null;
	if (typeof record.endedAt !== 'number' || !Number.isFinite(record.endedAt)) return null;
	return {
		matchId: record.matchId,
		result: record.result,
		endedAt: record.endedAt,
		mode: normalizeBattleMode(record.mode),
	};
}

export function appendSingleRecord(
	records: ReadonlyArray<SingleMatchRecord>,
	next: SingleMatchRecord,
	max = SINGLE_RECORD_MAX,
): ReadonlyArray<SingleMatchRecord> {
	if (records.some((record) => record.matchId === next.matchId)) return records;
	return [next, ...records].slice(0, max);
}

export function deriveSingleStreak(
	records: ReadonlyArray<SingleMatchRecord>,
	mode?: LocalBattleMode,
): SingleStreak {
	const scoped = mode
		? records.filter((record) => record.mode === mode)
		: records;
	const scored = scoped.filter((record) => record.result !== 'draw');
	const latest = scored[0];
	if (!latest || latest.result === 'draw') return { kind: 'none' };
	let count = 0;
	for (const record of scored) {
		if (record.result !== latest.result) break;
		count += 1;
	}
	return { kind: latest.result, count };
}

export function formatSingleStreak(streak: SingleStreak): string {
	if (streak.kind === 'none') return '—';
	const noun = streak.count === 1
		? (streak.kind === 'win' ? 'win' : 'loss')
		: (streak.kind === 'win' ? 'wins' : 'losses');
	return `${streak.count} ${noun}`;
}

export function formatBattleMode(mode: LocalBattleMode): string {
	if (mode === 'campaign') return 'Campaign';
	if (mode === 'p2p') return 'PvP';
	return 'Single';
}

export function filterBattleRecords(
	records: ReadonlyArray<SingleMatchRecord>,
	filter: BattleLedgerFilter,
): ReadonlyArray<SingleMatchRecord> {
	if (filter === 'all') return records;
	return records.filter((record) => record.mode === filter);
}
