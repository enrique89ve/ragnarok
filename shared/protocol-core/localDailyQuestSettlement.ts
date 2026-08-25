import { createDailyQuestRuneSourceKey, createRuneLedgerEntryId, getRuneEconomy } from './runeEconomy';
import type { RuneLedgerEntry } from './runeEconomy';
import type { RagnarokNetworkStage } from '../runtimeConfig';

export function createLocalDailyQuestLedgerEntry(input: { account: string; ymdUtc: string; slot: number; seasonId: string; stage: RagnarokNetworkStage; balanceBefore: number; timestamp: number }): RuneLedgerEntry {
	const sourceKey = createDailyQuestRuneSourceKey(input.account, input.ymdUtc, input.slot, input.seasonId);
	const entryId = createRuneLedgerEntryId({ seasonId: input.seasonId, direction: 'credit', sourceType: 'daily_quest_claim', sourceKey });
	const amount = getRuneEconomy(input.stage).dailyQuestRunePerSlot;
	return { entryId, seasonId: input.seasonId, account: input.account, direction: 'credit', sourceType: 'daily_quest_claim', sourceKey, amount, balanceBefore: input.balanceBefore, balanceAfter: input.balanceBefore + amount, trxId: entryId, blockNum: 0, timestamp: input.timestamp };
}
