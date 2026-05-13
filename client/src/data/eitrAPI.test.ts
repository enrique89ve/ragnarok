import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
	parseEitrStateForTest,
	parseEitrLedgerEntryForTest,
	parseAccountSummaryForTest,
	fetchEitrState,
	fetchEitrLedger,
	fetchEitrAccount,
} from './eitrAPI';

describe('eitrAPI parsers', () => {
	it('parseEitrState accepts a well-formed payload', () => {
		const snap = parseEitrStateForTest({
			success: true,
			seasonId: 'S01',
			ledgerCreditTotal: 800,
			ledgerDebitTotal: 200,
			ledgerActiveTotal: 600,
			burnCreditTotal: 700,
			forgeCommitDebitTotal: 200,
			forgeRefundCreditTotal: 100,
			lastBlock: 12345,
			generatedAt: '2026-05-12T00:00:00Z',
		});
		expect(snap.seasonId).toBe('S01');
		expect(snap.ledgerActiveTotal).toBe(600);
		expect(snap.burnCreditTotal).toBe(700);
	});

	it('parseEitrState rejects missing seasonId', () => {
		expect(() => parseEitrStateForTest({
			success: true,
			ledgerCreditTotal: 0,
			ledgerDebitTotal: 0,
			ledgerActiveTotal: 0,
			burnCreditTotal: 0,
			forgeCommitDebitTotal: 0,
			forgeRefundCreditTotal: 0,
			lastBlock: 0,
			generatedAt: '',
		})).toThrow(/seasonId/);
	});

	it('parseEitrState rejects success !== true', () => {
		expect(() => parseEitrStateForTest({
			success: false,
			seasonId: 'S01',
		})).toThrow(/successful/);
	});

	it('parseEitrLedgerEntry rejects invalid direction', () => {
		expect(() => parseEitrLedgerEntryForTest({
			entryId: 'x', seasonId: 'S01', account: 'a',
			direction: 'gift',
			sourceType: 'burn', sourceKey: 'x',
			amount: 1, balanceBefore: 0, balanceAfter: 1,
			trxId: 'a', blockNum: 1, timestamp: 0,
		})).toThrow(/direction/);
	});

	it('parseEitrLedgerEntry rejects invalid sourceType', () => {
		expect(() => parseEitrLedgerEntryForTest({
			entryId: 'x', seasonId: 'S01', account: 'a',
			direction: 'credit',
			sourceType: 'random_event',
			sourceKey: 'x',
			amount: 1, balanceBefore: 0, balanceAfter: 1,
			trxId: 'a', blockNum: 1, timestamp: 0,
		})).toThrow(/sourceType/);
	});

	it('parseAccountSummary derives eitrBalance from credits/debits when missing', () => {
		const summary = parseAccountSummaryForTest({
			account: 'alice',
			eitrBalance: 850,
			credits: 1000,
			debits: 150,
			lastBlock: 100,
			indexed: true,
		});
		expect(summary.eitrBalance).toBe(850);
		expect(summary.account).toBe('alice');
		expect(summary.indexed).toBe(true);
	});
});

describe('eitrAPI fetch wrappers', () => {
	let originalFetch: typeof globalThis.fetch;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
		// Override import.meta.env via a window.location.origin fallback works
		// because API_BASE pulls from import.meta.env.VITE_API_URL || origin.
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it('fetchEitrState hits /api/chain/eitr/state and returns parsed payload', async () => {
		const calls: string[] = [];
		globalThis.fetch = vi.fn(async (input: unknown) => {
			calls.push(String(input));
			return new Response(JSON.stringify({
				success: true,
				seasonId: 'S01',
				ledgerCreditTotal: 100,
				ledgerDebitTotal: 40,
				ledgerActiveTotal: 60,
				burnCreditTotal: 100,
				forgeCommitDebitTotal: 40,
				forgeRefundCreditTotal: 0,
				lastBlock: 500,
				generatedAt: '2026-05-12T00:00:00Z',
			}), { status: 200, headers: { 'content-type': 'application/json' } });
		}) as unknown as typeof globalThis.fetch;

		const snap = await fetchEitrState('S01');
		expect(snap.ledgerActiveTotal).toBe(60);
		expect(calls[0]).toContain('/api/chain/eitr/state');
		expect(calls[0]).toContain('seasonId=S01');
	});

	it('fetchEitrLedger forwards query filters', async () => {
		const calls: string[] = [];
		globalThis.fetch = vi.fn(async (input: unknown) => {
			calls.push(String(input));
			return new Response(JSON.stringify({
				success: true,
				seasonId: 'S01',
				entries: [],
				total: 0,
				limit: 50,
				offset: 0,
			}), { status: 200, headers: { 'content-type': 'application/json' } });
		}) as unknown as typeof globalThis.fetch;

		await fetchEitrLedger({ seasonId: 'S01', account: 'alice', direction: 'credit', sourceType: 'burn', limit: 10 });
		expect(calls[0]).toContain('/api/chain/eitr/ledger');
		expect(calls[0]).toContain('account=alice');
		expect(calls[0]).toContain('direction=credit');
		expect(calls[0]).toContain('sourceType=burn');
		expect(calls[0]).toContain('limit=10');
	});

	it('fetchEitrAccount throws on non-200 response with server error message', async () => {
		globalThis.fetch = vi.fn(async () =>
			new Response(JSON.stringify({ success: false, error: 'Invalid username' }), {
				status: 400, headers: { 'content-type': 'application/json' },
			}),
		) as unknown as typeof globalThis.fetch;

		await expect(fetchEitrAccount('bad', 'S01')).rejects.toThrow(/Invalid username/);
	});

	it('fetchEitrState honors AbortSignal', async () => {
		const controller = new AbortController();
		globalThis.fetch = vi.fn(async (_input: unknown, init?: { signal?: AbortSignal }) => {
			if (init?.signal?.aborted) throw new DOMException('aborted', 'AbortError');
			return new Promise(() => {}); // never resolves
		}) as unknown as typeof globalThis.fetch;

		controller.abort();
		await expect(fetchEitrState('S01', controller.signal)).rejects.toThrow();
	});
});
