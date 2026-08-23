// Eitr economy canon. Replay-derived crafting balance per ADR 0001.
// Values must match the Card Rarity table in docs/RULEBOOK.md.
// Eitr is non-transferable, season-scoped, mirror of RUNE ledger shape.

import type { Rarity } from '../schemas/rarity';
import { RARITY, eitrDissolve, eitrForge, tryAdaptRarity } from '../schemas/rarity';

export type EitrLedgerDirection = 'credit' | 'debit';

export type EitrSourceType =
	| 'burn'
	| 'forge_commit'
	| 'forge_refund';

export type EitrLedgerEntry = {
	entryId: string;
	seasonId: string;
	account: string;
	direction: EitrLedgerDirection;
	sourceType: EitrSourceType;
	sourceKey: string;
	amount: number;
	balanceBefore: number;
	balanceAfter: number;
	trxId: string;
	blockNum: number;
	timestamp: number;
};

export type EitrLedgerEntryQuery = {
	seasonId: string;
	direction?: EitrLedgerDirection;
	sourceType?: EitrSourceType;
	account?: string;
	sourceKeyPrefix?: string;
};

export type EitrLedgerTotalQuery = EitrLedgerEntryQuery;

export type EitrRarity = Rarity;

export const EITR_DISSOLVE_VALUES: Record<EitrRarity, number> = Object.fromEntries(
	RARITY.map(rarity => [rarity, eitrDissolve(rarity)]),
) as Record<EitrRarity, number>;

export const EITR_FORGE_COSTS: Record<EitrRarity, number> = Object.fromEntries(
	RARITY.map(rarity => [rarity, eitrForge(rarity)]),
) as Record<EitrRarity, number>;

function normalizeEitrRarity(rarity: string): EitrRarity | null {
	return tryAdaptRarity(rarity) ?? tryAdaptRarity(rarity.toLowerCase());
}

export function getEitrDissolveValue(rarity: string): number {
	const key = normalizeEitrRarity(rarity);
	return key ? EITR_DISSOLVE_VALUES[key] : 0;
}

export function getEitrForgeCost(rarity: string): number {
	const key = normalizeEitrRarity(rarity);
	return key ? EITR_FORGE_COSTS[key] : 0;
}

export function createEitrLedgerEntryId(input: {
	seasonId: string;
	direction: EitrLedgerDirection;
	sourceType: EitrSourceType;
	sourceKey: string;
}): string {
	return `${input.seasonId}:${input.direction}:${input.sourceType}:${input.sourceKey}`;
}

export function createBurnEitrSourceKey(input: {
	seasonId: string;
	account: string;
	trxId: string;
	uid: string;
}): string {
	return `burn:${input.seasonId}:${input.account}:${input.trxId}:${input.uid}`;
}

export function createForgeCommitEitrSourceKey(input: {
	seasonId: string;
	account: string;
	trxId: string;
}): string {
	return `forge_commit:${input.seasonId}:${input.account}:${input.trxId}`;
}

export function createForgeRefundEitrSourceKey(input: {
	seasonId: string;
	account: string;
	revealTrxId: string;
}): string {
	return `forge_refund:${input.seasonId}:${input.account}:${input.revealTrxId}`;
}
