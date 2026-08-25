import { describe, expect, it } from 'vitest';
import { PROTOCOL_CAPABILITIES, PROTOCOL_PHASE_IDS, PROTOCOL_PHASE_POLICIES } from '@shared/protocolPhase';
import { RAGNAROK_RUNTIME_CONFIGS } from '@shared/runtimeConfig';
import { getCapabilityAvailability, getEarliestCapabilityPhase, shouldMountCapabilityRoute } from './phaseCapabilityGate';

describe('phase capability route gate', () => {
	it('does not mount MarketplacePage or PacksPage in local gameplay', () => {
		const runtime = RAGNAROK_RUNTIME_CONFIGS.local;
		expect(shouldMountCapabilityRoute(runtime, 'marketplace')).toBe(false);
		expect(shouldMountCapabilityRoute(runtime, 'packs')).toBe(false);
	});

	it('mounts both economic routes in mainnet', () => {
		const runtime = RAGNAROK_RUNTIME_CONFIGS.mainnet;
		expect(shouldMountCapabilityRoute(runtime, 'marketplace')).toBe(true);
		expect(shouldMountCapabilityRoute(runtime, 'packs')).toBe(true);
	});

	it.each([
		['marketplace', 'mainnet-v1', 'Available in Mainnet'],
		['packs', 'mainnet-v1', 'Available in Mainnet'],
		['nftLoxWrites', 'mainnet-v1', 'Available in Mainnet'],
		['officialRanking', 'mainnet-v1', 'Available in Mainnet'],
		['hiveBroadcast', 'hive-testnet-v1', 'Available in Hive Testnet'],
		['walletInvocation', 'hive-testnet-v1', 'Available in Hive Testnet'],
		['campaignPublish', 'hive-testnet-v1', 'Available in Hive Testnet'],
	] as const)('maps %s to its actual enabled profile', (capability, phaseId, title) => {
		const availability = getCapabilityAvailability(RAGNAROK_RUNTIME_CONFIGS.local, capability);
		expect(availability.enabledPhaseId).toBe(phaseId);
		expect(availability.title).toBe(title);
	});

	it('labels capabilities enabled in F1 as available now', () => {
		expect(getCapabilityAvailability(RAGNAROK_RUNTIME_CONFIGS.local, 'p2pProgression').title).toBe('Available now');
	});

	it.each(PROTOCOL_CAPABILITIES)('derives earliest enabled phase from canonical policy: %s', capability => {
		const expected = PROTOCOL_PHASE_IDS.find(phaseId => PROTOCOL_PHASE_POLICIES[phaseId][capability]);
		expect(getEarliestCapabilityPhase(capability)).toBe(expected);
	});
});
