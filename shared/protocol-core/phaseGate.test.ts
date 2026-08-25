import { describe, expect, it } from 'vitest';
import { RAGNAROK_RUNTIME_CONFIGS } from '../runtimeConfig';
import { checkProtocolActionCapability, checkRuntimeCapability } from './phaseGate';

describe('protocol capability gates', () => {
	it('rejects market and pack writes in local gameplay regardless of NFTLox config', () => {
		const runtime = { ...RAGNAROK_RUNTIME_CONFIGS.local, nftLoxProtocolId: 'configured-but-disabled' };
		expect(checkProtocolActionCapability(runtime, 'market_list')).toMatchObject({ status: 'rejected', code: 'capability_disabled', capability: 'marketplace', phaseId: 'local-gameplay-v1' });
		expect(checkProtocolActionCapability(runtime, 'rune_exchange')).toMatchObject({ status: 'rejected', capability: 'packs' });
		expect(checkRuntimeCapability(runtime, 'nftLoxWrites')).toMatchObject({ status: 'rejected', capability: 'nftLoxWrites' });
	});

	it('preserves market and pack handlers in mainnet', () => {
		const runtime = RAGNAROK_RUNTIME_CONFIGS.mainnet;
		expect(checkProtocolActionCapability(runtime, 'market_buy')).toEqual({ status: 'allowed' });
		expect(checkProtocolActionCapability(runtime, 'pack_burn')).toEqual({ status: 'allowed' });
	});

	it('covers every market and pack action in local gameplay', () => {
		const runtime = RAGNAROK_RUNTIME_CONFIGS.local;
		for (const action of ['market_list', 'market_unlist', 'market_buy', 'market_offer', 'market_accept', 'market_reject'] as const) {
			expect(checkProtocolActionCapability(runtime, action)).toMatchObject({ status: 'rejected', capability: 'marketplace' });
		}
		for (const action of ['rune_exchange', 'pack_purchase', 'pack_commit', 'pack_reveal', 'legacy_pack_open', 'pack_mint', 'pack_distribute', 'pack_transfer', 'pack_burn'] as const) {
			expect(checkProtocolActionCapability(runtime, action)).toMatchObject({ status: 'rejected', capability: 'packs' });
		}
	});
});
