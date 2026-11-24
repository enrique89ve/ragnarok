import type { HiveCardAsset, HiveTokenBalance } from '../schemas/HiveTypes';
import type { RuneLedgerEntry, EitrLedgerEntry } from '@shared/protocol-core/types';
import type { LocalSettlementRecord } from '@shared/protocol-core/localSettlement';
import type { LocalCampaignSettlementEnvelope } from '@shared/protocol-core/localCampaignSettlement';
export type ValidatedSyncCursor = {
	readonly account: string;
	readonly lastHistoryIndex: number;
	readonly lastSyncedAt: number;
};

export type ValidatedEloRating = {
	readonly account: string;
	readonly elo: number;
	readonly wins: number;
	readonly losses: number;
	readonly lastMatchBlock: number;
};

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}

function isSafeIntAtLeast(value: unknown, min: number): value is number {
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= min;
}

function isFiniteNonNegativeInt(value: unknown): value is number {
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function parseSyncCursor(raw: unknown): ValidatedSyncCursor | undefined {
	if (!raw || typeof raw !== 'object') return undefined;
	const row = raw as Record<string, unknown>;
	if (!isNonEmptyString(row.account)) return undefined;
	if (!isSafeIntAtLeast(row.lastHistoryIndex, -1)) return undefined;
	if (!isFiniteNonNegativeNumber(row.lastSyncedAt)) return undefined;
	return {
		account: row.account,
		lastHistoryIndex: row.lastHistoryIndex,
		lastSyncedAt: row.lastSyncedAt,
	};
}

export function parseRuneLedgerEntry(raw: unknown): RuneLedgerEntry | undefined {
	if (!raw || typeof raw !== 'object') return undefined;
	const row = raw as Record<string, unknown>;
	if (!isNonEmptyString(row.entryId)) return undefined;
	if (!isNonEmptyString(row.account)) return undefined;
	if (!isNonEmptyString(row.seasonId)) return undefined;
	if (row.direction !== 'credit' && row.direction !== 'debit') return undefined;
	if (!isFiniteNonNegativeInt(row.amount)) return undefined;
	if (!isNonEmptyString(row.sourceType)) return undefined;
	if (!isNonEmptyString(row.sourceKey)) return undefined;
	return raw as RuneLedgerEntry;
}

export function parseEitrLedgerEntry(raw: unknown): EitrLedgerEntry | undefined {
	if (!raw || typeof raw !== 'object') return undefined;
	const row = raw as Record<string, unknown>;
	if (!isNonEmptyString(row.entryId)) return undefined;
	if (!isNonEmptyString(row.account)) return undefined;
	if (!isNonEmptyString(row.seasonId)) return undefined;
	if (row.direction !== 'credit' && row.direction !== 'debit') return undefined;
	if (!isFiniteNonNegativeInt(row.amount)) return undefined;
	if (!isNonEmptyString(row.sourceType)) return undefined;
	if (!isNonEmptyString(row.sourceKey)) return undefined;
	return raw as EitrLedgerEntry;
}

export function parseHiveCardAsset(raw: unknown): HiveCardAsset | undefined {
	if (!raw || typeof raw !== 'object') return undefined;
	const row = raw as Record<string, unknown>;
	if (!isNonEmptyString(row.uid)) return undefined;
	if (typeof row.cardId !== 'number' || !Number.isInteger(row.cardId)) return undefined;
	if (typeof row.ownerId !== 'string') return undefined;
	if (typeof row.rarity !== 'string') return undefined;
	if (row.level !== undefined && !Number.isFinite(row.level as number)) return undefined;
	if (row.xp !== undefined && !Number.isFinite(row.xp as number)) return undefined;
	return raw as HiveCardAsset;
}

export function parseEloRating(raw: unknown, fallbackAccount: string): ValidatedEloRating | undefined {
	if (!raw || typeof raw !== 'object') return undefined;
	const row = raw as Record<string, unknown>;
	const account = isNonEmptyString(row.account) ? row.account : fallbackAccount;
	if (!isNonEmptyString(account)) return undefined;
	const elo = typeof row.elo === 'number' && Number.isFinite(row.elo) ? row.elo : undefined;
	const wins = typeof row.wins === 'number' && Number.isSafeInteger(row.wins) && row.wins >= 0
		? row.wins
		: undefined;
	const losses = typeof row.losses === 'number' && Number.isSafeInteger(row.losses) && row.losses >= 0
		? row.losses
		: undefined;
	if (elo === undefined || wins === undefined || losses === undefined) return undefined;
	const lastMatchBlock = typeof row.lastMatchBlock === 'number' && Number.isFinite(row.lastMatchBlock)
		? row.lastMatchBlock
		: 0;
	return { account, elo, wins, losses, lastMatchBlock };
}

export function parseTokenBalance(raw: unknown): HiveTokenBalance | undefined {
	if (!raw || typeof raw !== 'object') return undefined;
	const row = raw as Record<string, unknown>;
	if (!isNonEmptyString(row.hiveUsername)) return undefined;
	for (const key of ['RUNE', 'VALKYRIE', 'SEASON_POINTS'] as const) {
		const value = row[key];
		if (value !== undefined && !isFiniteNonNegativeNumber(value)) return undefined;
	}
	return raw as HiveTokenBalance;
}

export function parseLocalSettlementRecord(raw: unknown): LocalSettlementRecord | undefined {
	if (!raw || typeof raw !== 'object') return undefined;
	const row = raw as Record<string, unknown>;
	if (!isNonEmptyString(row.eventId)) return undefined;
	if (!isNonEmptyString(row.matchId)) return undefined;
	if (!isFiniteNonNegativeNumber(row.timestamp)) return undefined;
	const runtimeFingerprint = row.runtimeFingerprint;
	if (!isNonEmptyString(runtimeFingerprint)) return undefined;
	return raw as LocalSettlementRecord;
}

export function parseLocalCampaignSettlement(raw: unknown): LocalCampaignSettlementEnvelope | undefined {
	if (!raw || typeof raw !== 'object') return undefined;
	const row = raw as Record<string, unknown>;
	if (!isNonEmptyString(row.eventId)) return undefined;
	if (!isNonEmptyString(row.missionId)) return undefined;
	if (!isFiniteNonNegativeNumber(row.timestamp)) return undefined;
	const runtimeFingerprint = row.runtimeFingerprint;
	if (!isNonEmptyString(runtimeFingerprint)) return undefined;
	return raw as LocalCampaignSettlementEnvelope;
}

export type CorruptRecordRow = {
	readonly id: string;
	readonly storeName: string;
	readonly key: string;
	readonly raw: unknown;
	readonly quarantinedAt: number;
};

export function corruptRecordId(storeName: string, key: string): string {
	return `${storeName}::${key}`;
}