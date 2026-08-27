import { checkRuntimeCapability, type ProtocolCapability } from '@shared/protocol-core/phaseGate';
import { PROTOCOL_PHASE_IDS, PROTOCOL_PHASE_POLICIES, type ProtocolPhaseId } from '@shared/protocolPhase';
import type { RagnarokRuntimeConfig } from '@shared/runtimeConfig';

export type CapabilityAvailability = {
	readonly enabledPhaseId: ProtocolPhaseId;
	readonly enabledPhaseLabel: 'Gameplay Validation' | 'Hive Testnet' | 'Mainnet';
	readonly title: 'Available now' | 'Available in Hive Testnet' | 'Available in Mainnet';
	readonly description: string;
};

const CAPABILITY_DESCRIPTIONS: Readonly<Record<ProtocolCapability, string>> = {
	localSettlement: 'This local replay capability is available during Gameplay Validation.',
	hiveBroadcast: 'External Hive broadcast is reserved for the Hive Testnet profile.',
	walletLogin: 'Login may establish identity without invoking a wallet operation.',
	walletInvocation: 'Explicit wallet invocation is reserved for the Hive Testnet profile.',
	p2pMatchAcceptance: 'Quick Match acceptance permits one explicit Posting signature per player before the P2P handshake.',
	marketplace: 'Marketplace mutations are reserved for the Mainnet profile.',
	packs: 'Pack mutations are reserved for the Mainnet profile.',
	nftLoxWrites: 'NFTLox writes are reserved for the Mainnet profile.',
	campaignPublish: 'External campaign publication is reserved for the Hive Testnet profile.',
	dailyQuestClaim: 'Daily quest claims use the local replay ledger during Gameplay Validation.',
	p2pProgression: 'P2P progression is persisted in local replay during Gameplay Validation.',
	officialRanking: 'Official ranking is reserved for the Mainnet profile.',
};

function phaseLabel(phaseId: ProtocolPhaseId): CapabilityAvailability['enabledPhaseLabel'] {
	if (phaseId === 'local-gameplay-v1') return 'Gameplay Validation';
	if (phaseId === 'hive-testnet-v1') return 'Hive Testnet';
	return 'Mainnet';
}

function phaseTitle(phaseId: ProtocolPhaseId): CapabilityAvailability['title'] {
	if (phaseId === 'local-gameplay-v1') return 'Available now';
	if (phaseId === 'hive-testnet-v1') return 'Available in Hive Testnet';
	return 'Available in Mainnet';
}

export function getEarliestCapabilityPhase(capability: ProtocolCapability): ProtocolPhaseId {
	const phaseId = PROTOCOL_PHASE_IDS.find(candidate => PROTOCOL_PHASE_POLICIES[candidate][capability]);
	if (!phaseId) throw new Error(`No protocol phase enables ${capability}`);
	return phaseId;
}

/** Pure route decision: callers can avoid mounting gated feature trees entirely. */
export function shouldMountCapabilityRoute(runtime: RagnarokRuntimeConfig, capability: ProtocolCapability): boolean {
	return checkRuntimeCapability(runtime, capability).status === 'allowed';
}

export function getCapabilityAvailability(runtime: RagnarokRuntimeConfig, capability: ProtocolCapability): CapabilityAvailability {
	const decision = checkRuntimeCapability(runtime, capability);
	const enabledPhaseId = getEarliestCapabilityPhase(capability);
	const availability: CapabilityAvailability = {
		enabledPhaseId,
		enabledPhaseLabel: phaseLabel(enabledPhaseId),
		title: phaseTitle(enabledPhaseId),
		description: CAPABILITY_DESCRIPTIONS[capability],
	};
	if (decision.status === 'allowed') {
		return {
			...availability,
			title: 'Available now',
			description: `Available in ${enabledPhaseId}.`,
		};
	}
	return availability;
}
