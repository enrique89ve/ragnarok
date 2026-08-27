import { describe, expect, it } from 'vitest';
import {
	PROTOCOL_PHASE_POLICIES,
	checkProtocolCapability,
	createProtocolRuntimeFingerprint,
	getProtocolPhaseId,
	resolveProtocolPhasePolicy,
	resolveWalletInvocationAuthMode,
} from './protocolPhase';

describe('protocol phase profiles', () => {
	it('maps every runtime phase to the conservative migration profile', () => {
		expect(getProtocolPhaseId('local')).toBe('local-gameplay-v1');
		expect(getProtocolPhaseId('qa-season-0')).toBe('local-gameplay-v1');
		expect(getProtocolPhaseId('alfa-testnet')).toBe('local-gameplay-v1');
		expect(getProtocolPhaseId('generic-testnet')).toBe('local-gameplay-v1');
		expect(getProtocolPhaseId('closed-beta')).toBe('hive-testnet-v1');
		expect(getProtocolPhaseId('mainnet')).toBe('mainnet-v1');
	});

	it('keeps local gameplay settlement complete but external capabilities closed', () => {
		const policy = resolveProtocolPhasePolicy('alfa-testnet');

		expect(policy).toMatchObject({
			phaseId: 'local-gameplay-v1',
			settlement: 'local-replay',
			economy: 'local-simulation',
			wallet: 'login-only',
			localSettlement: true,
			hiveBroadcast: false,
			walletLogin: true,
			walletInvocation: false,
			p2pMatchAcceptance: true,
			p2pProgression: true,
			dailyQuestClaim: true,
			marketplace: false,
			packs: false,
			nftLoxWrites: false,
			campaignPublish: false,
			officialRanking: false,
		});

		expect(checkProtocolCapability(policy, 'localSettlement')).toEqual({ status: 'allowed' });
		expect(checkProtocolCapability(policy, 'walletLogin')).toEqual({ status: 'allowed' });
		expect(checkProtocolCapability(policy, 'p2pProgression')).toEqual({ status: 'allowed' });
		expect(checkProtocolCapability(policy, 'walletInvocation')).toEqual({
			status: 'rejected', code: 'capability_disabled', capability: 'walletInvocation', phaseId: 'local-gameplay-v1',
		});
		expect(checkProtocolCapability(policy, 'hiveBroadcast')).toEqual({
			status: 'rejected', code: 'capability_disabled', capability: 'hiveBroadcast', phaseId: 'local-gameplay-v1',
		});
		expect(checkProtocolCapability(policy, 'marketplace')).toEqual({
			status: 'rejected', code: 'capability_disabled', capability: 'marketplace', phaseId: 'local-gameplay-v1',
		});
		expect(checkProtocolCapability(policy, 'packs')).toEqual({
			status: 'rejected', code: 'capability_disabled', capability: 'packs', phaseId: 'local-gameplay-v1',
		});
		expect(checkProtocolCapability(policy, 'nftLoxWrites')).toEqual({
			status: 'rejected', code: 'capability_disabled', capability: 'nftLoxWrites', phaseId: 'local-gameplay-v1',
		});
		expect(resolveWalletInvocationAuthMode(policy)).toBe('unsigned-local');
		expect(resolveWalletInvocationAuthMode(PROTOCOL_PHASE_POLICIES['hive-testnet-v1'])).toBe('hive-body-auth');
		expect(resolveWalletInvocationAuthMode(PROTOCOL_PHASE_POLICIES['mainnet-v1'])).toBe('hive-body-auth');
	});

	it('exposes stable policy variants without mutable combinations', () => {
		expect(PROTOCOL_PHASE_POLICIES['hive-testnet-v1']).toMatchObject({
		settlement: 'hive-replay', economy: 'hive-testnet', wallet: 'explicit-only',
		localSettlement: false, hiveBroadcast: true, walletLogin: true, walletInvocation: true,
		p2pProgression: true, officialRanking: false,
	});

		expect(PROTOCOL_PHASE_POLICIES['mainnet-v1']).toMatchObject({
		settlement: 'hive-canonical', economy: 'canonical', nftLoxWrites: true, officialRanking: true,
	});
	});

	it('covers every concrete capability in every profile', () => {
		const capabilities = [
			'localSettlement', 'hiveBroadcast', 'walletLogin', 'walletInvocation', 'p2pMatchAcceptance',
			'marketplace', 'packs', 'nftLoxWrites', 'campaignPublish',
			'dailyQuestClaim', 'p2pProgression', 'officialRanking',
		] as const;

		for (const policy of Object.values(PROTOCOL_PHASE_POLICIES)) {
			for (const capability of capabilities) {
				const decision = checkProtocolCapability(policy, capability);
				expect(decision.status, `${policy.phaseId}:${capability}`).toMatch(/allowed|rejected/);
				if (decision.status === 'rejected') {
					expect(decision.code).toBe('capability_disabled');
				}
			}
		}
	});

	it('creates a stable fingerprint and changes it for phase or epoch boundaries', () => {
		const base = {
			stage: 'testnet' as const,
			phaseId: 'local-gameplay-v1' as const,
			protocolId: 'rk_game_testnet',
			resetEpoch: 'alfa-testnet-1',
			seasonStart: '2026-06-14T23:28:54Z',
			indexStartBlock: 109016418,
		};
		const fingerprint = createProtocolRuntimeFingerprint(base);
		expect(fingerprint.representation).toBe('["testnet","local-gameplay-v1","rk_game_testnet","alfa-testnet-1","2026-06-14T23:28:54Z",109016418]');
		expect(createProtocolRuntimeFingerprint(base)).toEqual(fingerprint);
		expect(createProtocolRuntimeFingerprint({ ...base, resetEpoch: 'alfa-testnet-2' }).representation).not.toBe(fingerprint.representation);
		expect(createProtocolRuntimeFingerprint({ ...base, phaseId: 'hive-testnet-v1' }).representation).not.toBe(fingerprint.representation);
	});
});
