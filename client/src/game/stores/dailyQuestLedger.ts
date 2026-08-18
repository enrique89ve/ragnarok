import { parseDailyQuestRuneSourceKey } from '@shared/protocol-core/runeEconomy';

export type DailyQuestLedgerCredit = {
	readonly sourceKey: string;
	readonly amount: number;
	readonly trxId: string;
};

export type ClaimedDailyQuestSlots = {
	readonly slots: ReadonlySet<number>;
	readonly history: Record<string, string>;
};

export function claimedSlotsFromLedger(
	entries: readonly DailyQuestLedgerCredit[],
	account: string,
	ymdUtc: string,
): ClaimedDailyQuestSlots {
	const slots = new Set<number>();
	const history: Record<string, string> = {};

	for (const entry of entries) {
		if (entry.amount <= 0) continue;
		const parsed = parseDailyQuestRuneSourceKey(entry.sourceKey);
		if (!parsed) continue;
		if (parsed.account !== account || parsed.ymdUtc !== ymdUtc) continue;
		slots.add(parsed.slot);
		history[`${parsed.ymdUtc}:${parsed.slot}`] = entry.trxId;
	}

	return { slots, history };
}
