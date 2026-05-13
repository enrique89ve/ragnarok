/**
 * sessionRenewal.test.ts — ADR 0004 §Decision.6 B–E, issue 06.
 *
 * Covers `verifyInboundRenewal`:
 *   - Accept happy path.
 *   - Reject matchId mismatch (stale).
 *   - Reject invalid pubkey shape.
 *   - Reject when caller's `verifyHiveSig` returns false.
 *   - Idempotent: duplicate sig fingerprint = second accept is no-op.
 *   - Distinct sig fingerprints under same matchId both accepted in order.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
	_resetRenewalCacheForTests,
	buildRenewalMessage,
	isValidEphemeralPubkey,
	verifyInboundRenewal,
} from './sessionRenewal';

const MATCH_ID = 'm-renew-0001';
const NEW_PUBKEY = 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5XzA'; // 51-char base64url
const HIVE_SIG = 'STM_SIG_PLACEHOLDER_FOR_TEST_FIXTURES_AT_LEAST_LONG_ENOUGH_TO_VERIFY';

beforeEach(() => {
	_resetRenewalCacheForTests();
});

afterEach(() => {
	_resetRenewalCacheForTests();
});

describe('buildRenewalMessage', () => {
	it('is deterministic and parseable', () => {
		expect(buildRenewalMessage(MATCH_ID, NEW_PUBKEY))
			.toBe(`ragnarok session_renewal | ${MATCH_ID} | ${NEW_PUBKEY}`);
	});
});

describe('isValidEphemeralPubkey', () => {
	it('accepts base64url within 32–256 range', () => {
		expect(isValidEphemeralPubkey(NEW_PUBKEY)).toBe(true);
	});
	it('rejects too-short', () => {
		expect(isValidEphemeralPubkey('abc')).toBe(false);
	});
	it('rejects non-base64url chars', () => {
		expect(isValidEphemeralPubkey(`${NEW_PUBKEY}@`)).toBe(false);
	});
});

describe('verifyInboundRenewal', () => {
	const baseInput = () => ({
		matchId: MATCH_ID,
		newPubkey: NEW_PUBKEY,
		hiveSig: HIVE_SIG,
		activeMatchId: MATCH_ID,
		verifyHiveSig: async (msg: string, sig: string) => {
			expect(msg).toBe(buildRenewalMessage(MATCH_ID, NEW_PUBKEY));
			return sig === HIVE_SIG;
		},
	});

	it('accepts a valid renewal', async () => {
		const result = await verifyInboundRenewal(baseInput());
		expect(result).toEqual({ accepted: true });
	});

	it('rejects stale matchId', async () => {
		const result = await verifyInboundRenewal({ ...baseInput(), matchId: 'other' });
		expect(result.accepted).toBe(false);
		expect(result.reason).toMatch(/matchId mismatch/);
	});

	it('rejects malformed pubkey', async () => {
		const result = await verifyInboundRenewal({ ...baseInput(), newPubkey: 'x' });
		expect(result.accepted).toBe(false);
		expect(result.reason).toMatch(/shape invalid/);
	});

	it('rejects on hiveSig verification failure', async () => {
		const result = await verifyInboundRenewal({
			...baseInput(),
			verifyHiveSig: async () => false,
		});
		expect(result.accepted).toBe(false);
		expect(result.reason).toMatch(/hiveSig verification/);
	});

	it('idempotent: duplicate fingerprint is no-op second time', async () => {
		const first = await verifyInboundRenewal(baseInput());
		expect(first.accepted).toBe(true);
		const second = await verifyInboundRenewal(baseInput());
		expect(second.accepted).toBe(false);
		expect(second.reason).toMatch(/duplicate/);
	});

	it('different sig fingerprints under same matchId both accept', async () => {
		const first = await verifyInboundRenewal(baseInput());
		expect(first.accepted).toBe(true);
		const second = await verifyInboundRenewal({
			...baseInput(),
			hiveSig: `${HIVE_SIG}_v2`,
			verifyHiveSig: async () => true,
		});
		expect(second.accepted).toBe(true);
	});
});
