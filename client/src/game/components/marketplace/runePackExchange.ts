import {
	getRuneExchangePackQuote,
	isPackKey,
	type PackKey,
} from '@shared/protocol-core/packCatalog';
import { TESTNET_RUNE_ECONOMY } from '@shared/protocol-core/runeEconomy';
import type { RuneLedgerEntryView } from '../../../data/runeAPI';
import type { PackType } from '../packs/types';

export type RedeemedRuneExchangeQuantities = Partial<Record<PackKey, number>>;

export interface RunePackExchangeQuote {
	packKey: PackKey;
	quantity: number | null;
	runeCost: number;
	totalCost: number;
	remainingBalance: number;
	accountLimit: number;
	accountRedeemed: number;
	accountRemaining: number;
	maxByBalance: number;
	maxByOperation: number;
	maxQuantity: number;
	receivedCards: number;
	canSubmit: boolean;
	validationMessage: string | null;
	warnings: string[];
}

export interface ParsedRuneExchangeSourceKey {
	seasonId: string;
	account: string;
	trxId: string;
	packType: PackKey;
	quantity: number;
}

interface BuildRunePackExchangeQuoteInput {
	pack: PackType;
	quantity: number | null;
	runeBalance: number;
	redeemedQuantity: number;
	ledgerAvailable: boolean;
}

interface RunePackExchangeValidationInput {
	isRedeemable: boolean;
	quantity: number | null;
	accountRemaining: number;
	maxByBalance: number;
	totalCost: number;
	balance: number;
	maxByOperation: number;
}

const RUNE_EXCHANGE_SOURCE_PARTS = 6;

export function parseRuneExchangeQuantityInput(input: string): number | null {
	const normalized = input.trim();
	if (!/^\d+$/.test(normalized)) return null;

	const parsed = Number(normalized);
	if (!Number.isSafeInteger(parsed) || parsed < 1) return null;

	return parsed;
}

export function formatPackUnit(quantity: number): string {
	return quantity === 1 ? 'pack' : 'packs';
}

export function buildRunePackExchangeQuote({
	pack,
	quantity,
	runeBalance,
	redeemedQuantity,
	ledgerAvailable,
}: BuildRunePackExchangeQuoteInput): RunePackExchangeQuote {
	const balance = Math.max(0, Math.floor(runeBalance));
	const redeemed = Math.max(0, Math.floor(redeemedQuantity));
	const singlePackQuote = getRuneExchangePackQuote({ packType: pack.key, quantity: 1 });
	const runeCost = singlePackQuote?.runeCost ?? pack.runeCost ?? 0;
	const accountLimit = singlePackQuote?.accountLimit ?? 0;
	const accountRedeemed = Math.min(redeemed, accountLimit);
	const accountRemaining = Math.max(0, accountLimit - accountRedeemed);
	const maxByBalance = divideFloor(balance, runeCost);
	const maxByOperation = divideFloor(TESTNET_RUNE_ECONOMY.maxRuneExchangeSpendPerOp, runeCost);
	const maxQuantity = Math.max(0, Math.min(accountRemaining, maxByBalance, maxByOperation));
	const requestedQuantity = quantity ?? 0;
	const totalCost = runeCost * Math.max(0, requestedQuantity);
	const receivedCards = pack.cardCount * Math.max(0, requestedQuantity);
	const validationErrors = getRunePackExchangeValidationErrors({
		isRedeemable: Boolean(singlePackQuote && pack.isRuneRedeemable && pack.runeCost !== null),
		quantity,
		accountRemaining,
		maxByBalance,
		totalCost,
		balance,
		maxByOperation,
	});

	return {
		packKey: pack.key,
		quantity,
		runeCost,
		totalCost,
		remainingBalance: balance - totalCost,
		accountLimit,
		accountRedeemed,
		accountRemaining,
		maxByBalance,
		maxByOperation,
		maxQuantity,
		receivedCards,
		canSubmit: validationErrors.length === 0,
		validationMessage: validationErrors[0] ?? null,
		warnings: ledgerAvailable ? [] : ['Limit history unavailable. Chain validation still applies.'],
	};
}

export function parseRuneExchangeSourceKey(sourceKey: string): ParsedRuneExchangeSourceKey | null {
	const parts = sourceKey.split(':');
	if (parts.length !== RUNE_EXCHANGE_SOURCE_PARTS || parts[0] !== 'pack') return null;

	const [, seasonId, account, trxId, packType, quantityValue] = parts;
	if (!seasonId || !account || !trxId || !isPackKey(packType)) return null;

	const quantity = Number(quantityValue);
	if (!Number.isInteger(quantity) || quantity < 1) return null;

	return {
		seasonId,
		account,
		trxId,
		packType,
		quantity,
	};
}

export function countRedeemedRuneExchangePacks(entries: readonly RuneLedgerEntryView[]): RedeemedRuneExchangeQuantities {
	const totals: RedeemedRuneExchangeQuantities = {};

	for (const entry of entries) {
		if (entry.direction !== 'debit' || entry.sourceType !== 'rune_exchange') continue;

		const parsed = parseRuneExchangeSourceKey(entry.sourceKey);
		if (!parsed) continue;

		totals[parsed.packType] = (totals[parsed.packType] ?? 0) + parsed.quantity;
	}

	return totals;
}

function divideFloor(numerator: number, denominator: number): number {
	if (denominator <= 0) return 0;
	return Math.floor(numerator / denominator);
}

function getRunePackExchangeValidationErrors({
	isRedeemable,
	quantity,
	accountRemaining,
	maxByBalance,
	totalCost,
	balance,
	maxByOperation,
}: RunePackExchangeValidationInput): string[] {
	if (!isRedeemable) return ['Pack unavailable for RUNE.'];
	if (quantity === null) return ['Enter a pack amount.'];

	const errors: string[] = [];
	if (quantity < 1) errors.push('Enter at least 1 pack.');
	if (accountRemaining < 1) errors.push('Pack limit reached.');
	if (quantity > accountRemaining) errors.push(`Limit left: ${accountRemaining} ${formatPackUnit(accountRemaining)}.`);
	if (maxByBalance < 1 || totalCost > balance) errors.push('Not enough RUNE.');
	if (quantity > maxByOperation) errors.push(`Max ${maxByOperation} ${formatPackUnit(maxByOperation)} per exchange.`);
	return errors;
}
