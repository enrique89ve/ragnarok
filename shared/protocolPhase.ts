import type { RagnarokRuntimePhase, RagnarokNetworkStage } from './runtimeConfig';

export const PROTOCOL_PHASE_IDS = [
	'local-gameplay-v1',
	'hive-testnet-v1',
	'mainnet-v1',
] as const;
export type ProtocolPhaseId = typeof PROTOCOL_PHASE_IDS[number];

export type SettlementScope = 'local-replay' | 'hive-replay' | 'hive-canonical';
export type EconomyScope = 'local-simulation' | 'hive-testnet' | 'canonical';
export type WalletPolicy = 'login-only' | 'explicit-only';

export type ProtocolCapability =
	| 'localSettlement'
	| 'hiveBroadcast'
	| 'walletLogin'
	| 'walletInvocation'
	| 'marketplace'
	| 'packs'
	| 'nftLoxWrites'
	| 'campaignPublish'
	| 'dailyQuestClaim'
	| 'p2pProgression'
	| 'officialRanking';

export const PROTOCOL_CAPABILITIES = [
	'localSettlement', 'hiveBroadcast', 'walletLogin', 'walletInvocation',
	'marketplace', 'packs', 'nftLoxWrites', 'campaignPublish', 'dailyQuestClaim',
	'p2pProgression', 'officialRanking',
] as const satisfies ReadonlyArray<ProtocolCapability>;

type ProtocolPhasePolicyBase = {
	readonly phaseId: ProtocolPhaseId;
	readonly settlement: SettlementScope;
	readonly economy: EconomyScope;
	readonly wallet: WalletPolicy;
	readonly localSettlement: boolean;
	readonly hiveBroadcast: boolean;
	readonly walletLogin: boolean;
	readonly walletInvocation: boolean;
	readonly marketplace: boolean;
	readonly packs: boolean;
	readonly nftLoxWrites: boolean;
	readonly campaignPublish: boolean;
	readonly dailyQuestClaim: boolean;
	readonly p2pProgression: boolean;
	readonly officialRanking: boolean;
};

export type ProtocolPhasePolicy =
	| (ProtocolPhasePolicyBase & {
		readonly phaseId: 'local-gameplay-v1';
		readonly settlement: 'local-replay';
		readonly economy: 'local-simulation';
		readonly wallet: 'login-only';
		readonly localSettlement: true;
		readonly hiveBroadcast: false;
		readonly walletLogin: true;
		readonly walletInvocation: false;
		readonly marketplace: false;
		readonly packs: false;
		readonly nftLoxWrites: false;
		readonly campaignPublish: false;
		readonly dailyQuestClaim: true;
		readonly p2pProgression: true;
		readonly officialRanking: false;
	})
	| (ProtocolPhasePolicyBase & {
		readonly phaseId: 'hive-testnet-v1';
		readonly settlement: 'hive-replay';
		readonly economy: 'hive-testnet';
		readonly wallet: 'explicit-only';
		readonly localSettlement: false;
		readonly hiveBroadcast: true;
		readonly walletLogin: true;
		readonly walletInvocation: true;
		readonly marketplace: false;
		readonly packs: false;
		readonly nftLoxWrites: false;
		readonly campaignPublish: true;
		readonly dailyQuestClaim: true;
		readonly p2pProgression: true;
		readonly officialRanking: false;
	})
	| (ProtocolPhasePolicyBase & {
		readonly phaseId: 'mainnet-v1';
		readonly settlement: 'hive-canonical';
		readonly economy: 'canonical';
		readonly wallet: 'explicit-only';
		readonly localSettlement: false;
		readonly hiveBroadcast: true;
		readonly walletLogin: true;
		readonly walletInvocation: true;
		readonly marketplace: true;
		readonly packs: true;
		readonly nftLoxWrites: true;
		readonly campaignPublish: true;
		readonly dailyQuestClaim: true;
		readonly p2pProgression: true;
		readonly officialRanking: true;
	});

export const PROTOCOL_PHASE_POLICIES: Readonly<Record<ProtocolPhaseId, ProtocolPhasePolicy>> = {
	'local-gameplay-v1': {
		phaseId: 'local-gameplay-v1',
		settlement: 'local-replay',
		economy: 'local-simulation',
		wallet: 'login-only',
		localSettlement: true,
		hiveBroadcast: false,
		walletLogin: true,
		walletInvocation: false,
		marketplace: false,
		packs: false,
		nftLoxWrites: false,
		campaignPublish: false,
		dailyQuestClaim: true,
		p2pProgression: true,
		officialRanking: false,
	},
	'hive-testnet-v1': {
		phaseId: 'hive-testnet-v1',
		settlement: 'hive-replay',
		economy: 'hive-testnet',
		wallet: 'explicit-only',
		localSettlement: false,
		hiveBroadcast: true,
		walletLogin: true,
		walletInvocation: true,
		marketplace: false,
		packs: false,
		nftLoxWrites: false,
		campaignPublish: true,
		dailyQuestClaim: true,
		p2pProgression: true,
		officialRanking: false,
	},
	'mainnet-v1': {
		phaseId: 'mainnet-v1',
		settlement: 'hive-canonical',
		economy: 'canonical',
		wallet: 'explicit-only',
		localSettlement: false,
		hiveBroadcast: true,
		walletLogin: true,
		walletInvocation: true,
		marketplace: true,
		packs: true,
		nftLoxWrites: true,
		campaignPublish: true,
		dailyQuestClaim: true,
		p2pProgression: true,
		officialRanking: true,
	},
};

export type ProtocolCapabilityRejection = {
	readonly status: 'rejected';
	readonly code: 'capability_disabled';
	readonly capability: ProtocolCapability;
	readonly phaseId: ProtocolPhaseId;
};

export type ProtocolCapabilityDecision =
	| { readonly status: 'allowed' }
	| ProtocolCapabilityRejection;

export type WalletInvocationAuthMode = 'unsigned-local' | 'hive-body-auth';

export function resolveWalletInvocationAuthMode(policy: ProtocolPhasePolicy): WalletInvocationAuthMode {
	return checkProtocolCapability(policy, 'walletInvocation').status === 'allowed'
		? 'hive-body-auth'
		: 'unsigned-local';
}

export function getProtocolPhaseId(runtimePhase: RagnarokRuntimePhase): ProtocolPhaseId {
	if (runtimePhase === 'closed-beta') return 'hive-testnet-v1';
	if (runtimePhase === 'mainnet') return 'mainnet-v1';
	return 'local-gameplay-v1';
}

export function resolveProtocolPhasePolicy(runtimePhase: RagnarokRuntimePhase): ProtocolPhasePolicy {
	return PROTOCOL_PHASE_POLICIES[getProtocolPhaseId(runtimePhase)];
}

export function checkProtocolCapability(
	policy: ProtocolPhasePolicy,
	capability: ProtocolCapability,
): ProtocolCapabilityDecision {
	if (policy[capability]) return { status: 'allowed' };
	return {
		status: 'rejected',
		code: 'capability_disabled',
		capability,
		phaseId: policy.phaseId,
	};
}

export type ProtocolRuntimeFingerprintInput = {
	readonly stage: RagnarokNetworkStage;
	readonly phaseId: ProtocolPhaseId;
	readonly protocolId: string;
	readonly resetEpoch: string;
	readonly seasonStart: string;
	readonly indexStartBlock: number;
};

export type ProtocolRuntimeFingerprint = ProtocolRuntimeFingerprintInput & {
	readonly representation: string;
};

export function createProtocolRuntimeFingerprint(
	input: ProtocolRuntimeFingerprintInput,
): ProtocolRuntimeFingerprint {
	const normalized: ProtocolRuntimeFingerprintInput = {
		stage: input.stage,
		phaseId: input.phaseId,
		protocolId: input.protocolId,
		resetEpoch: input.resetEpoch,
		seasonStart: input.seasonStart,
		indexStartBlock: input.indexStartBlock,
	};
	return {
		...normalized,
		representation: JSON.stringify([
			normalized.stage,
			normalized.phaseId,
			normalized.protocolId,
			normalized.resetEpoch,
			normalized.seasonStart,
			normalized.indexStartBlock,
		]),
	};
}

export type ProtocolFingerprintValidationError = Error & { code: 'fingerprint_mismatch' };

export function parseProtocolRuntimeFingerprint(value: unknown): ProtocolRuntimeFingerprint {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		const error = new Error('invalid protocol runtime fingerprint') as ProtocolFingerprintValidationError;
		error.code = 'fingerprint_mismatch';
		throw error;
	}
	const candidate = value as Record<string, unknown>;
	const stages: readonly RagnarokNetworkStage[] = ['local', 'testnet', 'mainnet'];
	if (!stages.includes(candidate.stage as RagnarokNetworkStage)
		|| !PROTOCOL_PHASE_IDS.includes(candidate.phaseId as ProtocolPhaseId)
		|| typeof candidate.protocolId !== 'string' || candidate.protocolId.length === 0
		|| typeof candidate.resetEpoch !== 'string' || candidate.resetEpoch.length === 0
		|| typeof candidate.seasonStart !== 'string' || candidate.seasonStart.length === 0
		|| typeof candidate.indexStartBlock !== 'number' || !Number.isInteger(candidate.indexStartBlock) || candidate.indexStartBlock < 1
		|| typeof candidate.representation !== 'string') {
		const error = new Error('invalid protocol runtime fingerprint') as ProtocolFingerprintValidationError;
		error.code = 'fingerprint_mismatch';
		throw error;
	}
	const fingerprint = createProtocolRuntimeFingerprint({
		stage: candidate.stage as RagnarokNetworkStage,
		phaseId: candidate.phaseId as ProtocolPhaseId,
		protocolId: candidate.protocolId,
		resetEpoch: candidate.resetEpoch,
		seasonStart: candidate.seasonStart,
		indexStartBlock: candidate.indexStartBlock,
	});
	if (fingerprint.representation !== candidate.representation) {
		const error = new Error('invalid protocol runtime fingerprint representation') as ProtocolFingerprintValidationError;
		error.code = 'fingerprint_mismatch';
		throw error;
	}
	return fingerprint;
}
