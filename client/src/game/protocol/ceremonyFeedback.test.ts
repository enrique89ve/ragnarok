import { describe, expect, it, vi } from 'vitest';

import { RAGNAROK_RUNTIME_CONFIGS, type RagnarokRuntimeConfig } from '@shared/runtimeConfig';
import {
	buildCeremonyEvidenceFilename,
	buildCeremonyEvidencePayload,
	buildCeremonyRuntimeEvidence,
} from './ceremonyFeedback';

const QA_CONFIG: RagnarokRuntimeConfig = {
	...RAGNAROK_RUNTIME_CONFIGS.testnet,
	resetEpoch: 'qa-s0-feedback-pass',
};

describe('ceremonyFeedback', () => {
	it('builds runtime evidence with reset epoch and QA full-catalog flag', () => {
		const evidence = buildCeremonyRuntimeEvidence(QA_CONFIG);

		expect(evidence.stage).toBe('testnet');
		expect(evidence.protocolId).toBe('rk_game_testnet');
		expect(evidence.collectionId).toBe('ragnarok-testnet');
		expect(evidence.resetEpoch).toBe('qa-s0-feedback-pass');
		expect(evidence.qaFullCatalogEnabled).toBe(true);
		expect(evidence.storageNamespace).toContain('qa-s0-feedback-pass');
	});

	it('normalizes account and includes session events in the export payload', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1_765_000_000_000);

		const payload = buildCeremonyEvidencePayload(
			{
				ceremony: 'rune_pack_exchange',
				account: ' Alice ',
				context: {
					packType: 'standard',
					quantity: 2,
				},
			},
			QA_CONFIG,
			[
				{
					timestamp: 1_765_000_000_100,
					kind: 'ceremony_rune_pack_exchange_confirmed',
					payload: { trxId: 'trx-1' },
				},
			],
		);

		expect(payload.account).toBe('alice');
		expect(payload.exportedAt).toBe(1_765_000_000_000);
		expect(payload.runtime.resetEpoch).toBe('qa-s0-feedback-pass');
		expect(payload.context).toEqual({ packType: 'standard', quantity: 2 });
		expect(payload.events).toHaveLength(1);

		vi.restoreAllMocks();
	});

	it('builds deterministic, safe filenames', () => {
		const filename = buildCeremonyEvidenceFilename({
			ceremony: 'daily_quest_claim',
			account: 'Alice.Example',
			exportedAt: 1_765_000_000_000,
			runtime: buildCeremonyRuntimeEvidence(QA_CONFIG),
		});

		expect(filename).toBe('ragnarok-ceremony-daily-quest-claim-alice-example-qa-s0-feedback-pass-1765000000000');
	});
});
