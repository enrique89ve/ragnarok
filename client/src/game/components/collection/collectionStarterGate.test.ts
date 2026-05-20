import { describe, expect, it } from 'vitest';
import {
	STARTER_COLLECTION_GATE_COPY,
	shouldGateCollectionBehindStarter,
} from './collectionStarterGate';

describe('collection starter gate', () => {
	it('hides collection cards until the starter pack is claimed', () => {
		expect(shouldGateCollectionBehindStarter(false)).toBe(true);
	});

	it('unlocks collection cards after the starter pack is claimed', () => {
		expect(shouldGateCollectionBehindStarter(true)).toBe(false);
	});

	it('uses starter claim copy for the gated empty state', () => {
		expect(STARTER_COLLECTION_GATE_COPY).toEqual({
			title: 'No cards yet',
			body: 'Claim your Starter Pack to unlock your Collection.',
			cta: 'Claim Starter Pack',
		});
	});
});
