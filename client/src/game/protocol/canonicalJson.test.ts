/**
 * canonicalJson.test.ts — DECISIONS.md §D2 conformance.
 *
 * Covers:
 *   - Object-key reorder produces identical output (the core determinism
 *     guarantee).
 *   - Nested objects + arrays preserve recursive sorting.
 *   - Every disallowed type throws an Error mentioning what was rejected.
 *   - A representative action payload is pinned to a sha256 — any engine
 *     drift on number/string serialization breaks this snapshot.
 */

import { describe, it, expect } from 'vitest';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

import { canonicalize } from './canonicalJson';

const sha256Hex = (s: string): string =>
	bytesToHex(sha256(new TextEncoder().encode(s)));

describe('canonicalize — accepted types', () => {
	it('serializes primitives identically to JSON', () => {
		expect(canonicalize(null)).toBe('null');
		expect(canonicalize(true)).toBe('true');
		expect(canonicalize(false)).toBe('false');
		expect(canonicalize(0)).toBe('0');
		expect(canonicalize(-7)).toBe('-7');
		expect(canonicalize(42)).toBe('42');
		expect(canonicalize('hello')).toBe('"hello"');
		expect(canonicalize('a"b\\c')).toBe('"a\\"b\\\\c"');
	});

	it('serializes arrays preserving element order', () => {
		expect(canonicalize([])).toBe('[]');
		expect(canonicalize([1, 'a', null, true])).toBe('[1,"a",null,true]');
	});

	it('sorts object keys at every level', () => {
		const out = canonicalize({ b: 1, a: 2, c: { z: 1, y: 2, x: 3 } });
		expect(out).toBe('{"a":2,"b":1,"c":{"x":3,"y":2,"z":1}}');
	});

	it('produces identical output for differently-ordered equivalent objects', () => {
		const a = canonicalize({ seq: 0, action: { type: 'playCard', cardId: 'c-1' } });
		const b = canonicalize({ action: { cardId: 'c-1', type: 'playCard' }, seq: 0 });
		expect(a).toBe(b);
	});

	it('handles nested arrays of objects', () => {
		const out = canonicalize({
			leaves: [
				{ seq: 1, action: 'b' },
				{ action: 'a', seq: 0 },
			],
		});
		expect(out).toBe('{"leaves":[{"action":"b","seq":1},{"action":"a","seq":0}]}');
	});

	it('accepts an Object.create(null) plain object', () => {
		const o: Record<string, unknown> = Object.create(null);
		o.k = 1;
		expect(canonicalize(o)).toBe('{"k":1}');
	});
});

describe('canonicalize — rejected types', () => {
	it('throws on undefined', () => {
		expect(() => canonicalize(undefined)).toThrow(/undefined/);
	});

	it('throws on NaN', () => {
		expect(() => canonicalize(NaN)).toThrow(/non-finite/);
	});

	it('throws on Infinity / -Infinity', () => {
		expect(() => canonicalize(Infinity)).toThrow(/non-finite/);
		expect(() => canonicalize(-Infinity)).toThrow(/non-finite/);
	});

	it('throws on non-integer numbers', () => {
		expect(() => canonicalize(1.5)).toThrow(/non-integer/);
		expect(() => canonicalize(0.1)).toThrow(/non-integer/);
	});

	it('throws on Date', () => {
		expect(() => canonicalize(new Date())).toThrow(/Date/);
	});

	it('throws on Map', () => {
		expect(() => canonicalize(new Map())).toThrow(/Map/);
	});

	it('throws on Set', () => {
		expect(() => canonicalize(new Set())).toThrow(/Set/);
	});

	it('throws on RegExp', () => {
		expect(() => canonicalize(/foo/)).toThrow(/RegExp/);
	});

	it('throws on bigint', () => {
		expect(() => canonicalize(BigInt(10))).toThrow(/bigint/);
	});

	it('throws on symbol', () => {
		expect(() => canonicalize(Symbol('x'))).toThrow(/symbol/);
	});

	it('throws on function', () => {
		expect(() => canonicalize(() => undefined)).toThrow(/function/);
	});

	it('throws on a typed array (Uint8Array)', () => {
		expect(() => canonicalize(new Uint8Array([1, 2, 3]))).toThrow(/TypedArray/);
	});

	it('throws when a nested object contains an undefined value', () => {
		expect(() => canonicalize({ a: 1, b: undefined })).toThrow(/undefined/);
	});

	it('throws on class instances (non-plain object)', () => {
		class Foo {
			x = 1;
		}
		expect(() => canonicalize(new Foo())).toThrow(/Foo/);
	});
});

describe('canonicalize — cross-engine determinism pin', () => {
	it('hashes a representative action payload to a fixed sha256', () => {
		// Representative envelope inner — keys deliberately unsorted on input
		// so a regression that drops sorting changes the canonical bytes.
		const payload = {
			seq: 7,
			prevHash: '00'.repeat(32),
			action: {
				type: 'playCard',
				cardId: 'c-42',
				targetType: 'minion',
				targetId: 'opp-3',
				insertionIndex: 2,
			},
			broadcaster: 'A',
		};
		const canonical = canonicalize(payload);
		// Sanity: the canonical form has its top-level keys alphabetically
		// sorted and the inner action keys likewise.
		expect(canonical).toBe(
			'{"action":{"cardId":"c-42","insertionIndex":2,"targetId":"opp-3","targetType":"minion","type":"playCard"},"broadcaster":"A","prevHash":"0000000000000000000000000000000000000000000000000000000000000000","seq":7}',
		);
		// Sha256 of the canonical bytes — pinned so any engine-level
		// behaviour shift in JSON.stringify (e.g. surrogate-pair handling)
		// would surface as a test failure rather than silent wire drift.
		expect(sha256Hex(canonical)).toBe(
			'0a6b06f6e9fd656f9d25a1ea88f23af597f379c983a49ede66b1e09773127ebb',
		);
	});
});
