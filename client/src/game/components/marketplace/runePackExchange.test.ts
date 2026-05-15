import { describe, expect, it } from 'vitest';
import { PACK_DEFINITIONS, getHbdPackPriceThousandths, type PackKey } from '@shared/protocol-core/packCatalog';
import type { RuneLedgerEntryView } from '../../../data/runeAPI';
import type { PackType } from '../packs/types';
import {
	buildRunePackExchangeQuote,
	countRedeemedRuneExchangePacks,
	parseRuneExchangeQuantityInput,
	parseRuneExchangeSourceKey,
} from './runePackExchange';

describe('runePackExchange', () => {
	it('caps quantity by RUNE balance', () => {
		const quote = buildRunePackExchangeQuote({
			pack: packFixture('standard'),
			quantity: 5,
			runeBalance: 9,
			redeemedQuantity: 0,
			ledgerAvailable: true,
		});

		expect(quote.runeCost).toBe(2);
		expect(quote.totalCost).toBe(10);
		expect(quote.maxQuantity).toBe(4);
		expect(quote.canSubmit).toBe(false);
		expect(quote.validationMessage).toBe('Not enough RUNE.');
	});

	it('caps quantity by the per-operation RUNE spend limit', () => {
		const quote = buildRunePackExchangeQuote({
			pack: packFixture('mythic'),
			quantity: 3,
			runeBalance: 100,
			redeemedQuantity: 0,
			ledgerAvailable: true,
		});

		expect(quote.maxByOperation).toBe(2);
		expect(quote.maxQuantity).toBe(2);
		expect(quote.validationMessage).toBe('Max 2 packs per exchange.');
	});

	it('caps quantity by the per-account pack limit', () => {
		const quote = buildRunePackExchangeQuote({
			pack: packFixture('premium'),
			quantity: 2,
			runeBalance: 100,
			redeemedQuantity: 2,
			ledgerAvailable: true,
		});

		expect(quote.accountLimit).toBe(3);
		expect(quote.accountRemaining).toBe(1);
		expect(quote.maxQuantity).toBe(1);
		expect(quote.validationMessage).toBe('Limit left: 1 pack.');
	});

	it('submits a valid quote when balance and limits allow it', () => {
		const quote = buildRunePackExchangeQuote({
			pack: packFixture('standard'),
			quantity: 3,
			runeBalance: 20,
			redeemedQuantity: 1,
			ledgerAvailable: true,
		});

		expect(quote.canSubmit).toBe(true);
		expect(quote.totalCost).toBe(6);
		expect(quote.remainingBalance).toBe(14);
		expect(quote.receivedCards).toBe(15);
		expect(quote.validationMessage).toBeNull();
	});

	it('parses and counts redeemed pack quantities from ledger source keys', () => {
		const parsed = parseRuneExchangeSourceKey('pack:S01:thor:abc123:standard:2');

		expect(parsed).toEqual({
			seasonId: 'S01',
			account: 'thor',
			trxId: 'abc123',
			packType: 'standard',
			quantity: 2,
		});

		const totals = countRedeemedRuneExchangePacks([
			ledgerEntry('pack:S01:thor:abc123:standard:2'),
			ledgerEntry('pack:S01:thor:def456:premium:1'),
			ledgerEntry('bad-source-key'),
		]);

		expect(totals.standard).toBe(2);
		expect(totals.premium).toBe(1);
		expect(totals.mythic).toBeUndefined();
	});

	it('rejects invalid quantity input', () => {
		expect(parseRuneExchangeQuantityInput('')).toBeNull();
		expect(parseRuneExchangeQuantityInput('0')).toBeNull();
		expect(parseRuneExchangeQuantityInput('1.5')).toBeNull();
		expect(parseRuneExchangeQuantityInput('3')).toBe(3);
	});
});

function packFixture(key: PackKey): PackType {
	const definition = PACK_DEFINITIONS[key];

	return {
		key,
		id: 1,
		name: definition.name,
		description: definition.description,
		price: definition.price,
		hbdPriceThousandths: getHbdPackPriceThousandths(key),
		runeCost: definition.runeCost,
		isFreeClaim: definition.freeClaimLimitPerAccount > 0,
		isRuneRedeemable: definition.runeCost !== null,
		cardCount: definition.cardCount,
		rarityOdds: {
			common: 0,
			rare: 0,
			epic: 0,
			mythic: 0,
		},
	};
}

function ledgerEntry(sourceKey: string): RuneLedgerEntryView {
	return {
		entryId: `entry:${sourceKey}`,
		seasonId: 'S01',
		account: 'thor',
		direction: 'debit',
		sourceType: 'rune_exchange',
		sourceKey,
		amount: 1,
		balanceBefore: 10,
		balanceAfter: 9,
		trxId: 'trx',
		blockNum: 1,
		timestamp: 1,
	};
}
