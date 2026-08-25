import { describe, expect, it } from 'vitest';
import { buildRagnarokRuntimeEvidence } from '@shared/runtimeConfig';
import { getRagnarokNetworkConfig } from '../../../config/networkConfig';
import { resolveP2PMatchEndRoute } from './lifecycle';

describe('P2P match-end routing', () => {
	it('routes local gameplay phases before preview or ranked Hive adapters', () => {
		const runtime = getRagnarokNetworkConfig();
		const evidence = buildRagnarokRuntimeEvidence(runtime);
		expect(resolveP2PMatchEndRoute(runtime)).toBe(evidence.phasePolicy.localSettlement ? 'local' : 'hive');
	});
});
