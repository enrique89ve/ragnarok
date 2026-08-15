import { describe, expect, it } from 'vitest';

import {
	normalizeRawOp,
	rawJsonByteLength,
	GLOBAL_RAW_JSON_BYTE_CEILING,
	DAILY_QUEST_CLAIM_RAW_JSON_BYTE_LIMIT,
	RUNE_EXCHANGE_RAW_JSON_BYTE_LIMIT,
} from './normalize';
import type { RawHiveOp } from './types';

const CANONICAL_ID = 'ragnarok-cards';

function makeRaw(overrides: Partial<RawHiveOp> = {}): RawHiveOp {
	return {
		customJsonId: CANONICAL_ID,
		json: '{"action":"daily_quest_claim","slot":0,"quest_type":"win_games"}',
		broadcaster: 'alice',
		trxId: 'trx-1',
		opInTrx: 0,
		blockNum: 100,
		timestamp: Date.UTC(2026, 4, 20, 12),
		requiredPostingAuths: ['alice'],
		requiredAuths: [],
		...overrides,
	};
}

function rawJsonWithByteLength(action: string, targetBytes: number): string {
	const prefix = `{"action":"${action}","pad":"`;
	const overhead = rawJsonByteLength(prefix) + rawJsonByteLength('"}');
	const padLength = targetBytes - overhead;
	if (padLength < 0) throw new Error(`targetBytes ${targetBytes} too small for action ${action}`);
	return `${prefix}${'a'.repeat(padLength)}"}`;
}

describe('normalizeRawOp hostile input hardening', () => {
	it('ignores foreign ids without parsing their JSON', () => {
		const result = normalizeRawOp(makeRaw({
			customJsonId: 'some-other-app',
			json: '{definitely not json',
		}));

		expect(result.status).toBe('ignore');
		expect((result as { reason: string }).reason).toContain('not a ragnarok op');
	});

	it('ignores a foreign id even with an oversized JSON body', () => {
		const result = normalizeRawOp(makeRaw({
			customJsonId: 'foreign-app',
			json: 'x'.repeat(GLOBAL_RAW_JSON_BYTE_CEILING + 1),
		}));

		expect(result.status).toBe('ignore');
	});

	it('rejects malformed JSON on an accepted id without throwing', () => {
		const result = normalizeRawOp(makeRaw({ json: '{not json' }));

		expect(result.status).toBe('reject');
		expect((result as { reason: string }).reason).toContain('malformed JSON');
	});

	it('rejects a null JSON body', () => {
		const result = normalizeRawOp(makeRaw({ json: 'null' }));
		expect(result.status).toBe('reject');
		expect((result as { reason: string }).reason).toContain('not a JSON object');
	});

	it('rejects an array JSON body', () => {
		const result = normalizeRawOp(makeRaw({ json: '[]' }));
		expect(result.status).toBe('reject');
	});

	it('rejects a primitive JSON body', () => {
		expect(normalizeRawOp(makeRaw({ json: '42' })).status).toBe('reject');
		expect(normalizeRawOp(makeRaw({ json: '"hello"' })).status).toBe('reject');
		expect(normalizeRawOp(makeRaw({ json: 'true' })).status).toBe('reject');
	});

	it('rejects a canonical op missing the action field', () => {
		const result = normalizeRawOp(makeRaw({ json: '{"slot":0}' }));
		expect(result.status).toBe('reject');
		expect((result as { reason: string }).reason).toContain('action');
	});

	it('rejects a canonical op with an unknown action', () => {
		const result = normalizeRawOp(makeRaw({ json: '{"action":"steal_everything"}' }));
		expect(result.status).toBe('reject');
		expect((result as { reason: string }).reason).toContain('unknown action');
	});

	it('rejects a raw json above the global pre-parse byte ceiling', () => {
		const result = normalizeRawOp(makeRaw({ json: 'x'.repeat(GLOBAL_RAW_JSON_BYTE_CEILING + 1) }));
		expect(result.status).toBe('reject');
		expect((result as { reason: string }).reason).toContain('byte ceiling');
	});
});

describe('normalizeRawOp authority binding', () => {
	it('rejects a broadcaster that is not a required authority', () => {
		const result = normalizeRawOp(makeRaw({
			broadcaster: 'mallory',
			requiredPostingAuths: ['alice'],
			requiredAuths: [],
		}));
		expect(result.status).toBe('reject');
		expect((result as { reason: string }).reason).toContain('broadcaster');
	});

	it('accepts a posting action signed by posting authority', () => {
		const result = normalizeRawOp(makeRaw());
		expect(result.status).toBe('ok');
	});

	it('accepts a posting action signed only by active authority', () => {
		const result = normalizeRawOp(makeRaw({
			requiredPostingAuths: [],
			requiredAuths: ['alice'],
		}));
		expect(result.status).toBe('ok');
		if (result.status === 'ok') expect(result.op.usedActiveAuth).toBe(true);
	});

	it('rejects an active-only action signed only by posting authority', () => {
		const result = normalizeRawOp(makeRaw({
			customJsonId: 'rp_card_transfer',
			json: '{"nft_id":"x","to":"bob"}',
			requiredPostingAuths: ['alice'],
			requiredAuths: [],
		}));
		expect(result.status).toBe('reject');
		expect((result as { reason: string }).reason).toContain('active');
	});

	it('accepts an active-only action signed by active authority', () => {
		const result = normalizeRawOp(makeRaw({
			customJsonId: 'rp_card_transfer',
			json: '{"nft_id":"x","to":"bob"}',
			requiredPostingAuths: [],
			requiredAuths: ['alice'],
		}));
		expect(result.status).toBe('ok');
		if (result.status === 'ok') expect(result.op.usedActiveAuth).toBe(true);
	});
});

describe('rawJsonByteLength', () => {
	it('counts ASCII bytes exactly', () => {
		expect(rawJsonByteLength('abc')).toBe(3);
		expect(rawJsonByteLength('')).toBe(0);
	});

	it('counts multibyte UTF-8 bytes correctly', () => {
		expect(rawJsonByteLength('héllo')).toBe(6);
		expect(rawJsonByteLength('神話')).toBe(6);
		expect(rawJsonByteLength('⚡')).toBe(3);
	});
});

describe('per-action raw JSON byte ceilings', () => {
	it('accepts a daily_quest_claim at exactly 200 bytes and rejects 201', () => {
		const atLimit = rawJsonWithByteLength('daily_quest_claim', DAILY_QUEST_CLAIM_RAW_JSON_BYTE_LIMIT);
		expect(rawJsonByteLength(atLimit)).toBe(DAILY_QUEST_CLAIM_RAW_JSON_BYTE_LIMIT);

		const ok = normalizeRawOp(makeRaw({ json: atLimit }));
		expect(ok.status).toBe('ok');

		const over = rawJsonWithByteLength('daily_quest_claim', DAILY_QUEST_CLAIM_RAW_JSON_BYTE_LIMIT + 1);
		expect(rawJsonByteLength(over)).toBe(DAILY_QUEST_CLAIM_RAW_JSON_BYTE_LIMIT + 1);
		const rejected = normalizeRawOp(makeRaw({ json: over }));
		expect(rejected.status).toBe('reject');
		expect((rejected as { reason: string }).reason).toContain('daily_quest_claim');
	});

	it('accepts a rune_exchange at exactly 180 bytes and rejects 181', () => {
		const atLimit = rawJsonWithByteLength('rune_exchange', RUNE_EXCHANGE_RAW_JSON_BYTE_LIMIT);
		expect(rawJsonByteLength(atLimit)).toBe(RUNE_EXCHANGE_RAW_JSON_BYTE_LIMIT);

		const ok = normalizeRawOp(makeRaw({ json: atLimit }));
		expect(ok.status).toBe('ok');

		const over = rawJsonWithByteLength('rune_exchange', RUNE_EXCHANGE_RAW_JSON_BYTE_LIMIT + 1);
		expect(rawJsonByteLength(over)).toBe(RUNE_EXCHANGE_RAW_JSON_BYTE_LIMIT + 1);
		const rejected = normalizeRawOp(makeRaw({ json: over }));
		expect(rejected.status).toBe('reject');
		expect((rejected as { reason: string }).reason).toContain('rune_exchange');
	});

	it('measures the raw.json string, not an estimated Hive envelope', () => {
		const raw = makeRaw({ json: '{"action":"daily_quest_claim","slot":0,"quest_type":"win_games"}' });
		const result = normalizeRawOp(raw);
		expect(result.status).toBe('ok');
		expect(rawJsonByteLength(raw.json)).toBeLessThan(DAILY_QUEST_CLAIM_RAW_JSON_BYTE_LIMIT);
	});
});
