import {
	checkProtocolCapability,
	resolveProtocolPhasePolicy,
	type ProtocolCapability,
	type ProtocolPhaseId,
} from '../protocolPhase';
import { getRagnarokRuntimePhase, type RagnarokRuntimeConfig } from '../runtimeConfig';
import type { ProtocolAction } from './types';

export type { ProtocolCapability } from '../protocolPhase';

export type ProtocolCapabilityGateResult =
	| { readonly status: 'allowed' }
	| { readonly status: 'rejected'; readonly code: 'capability_disabled'; readonly capability: ProtocolCapability; readonly phaseId: ProtocolPhaseId };

const MARKET_ACTIONS = new Set<ProtocolAction>([
	'market_list', 'market_unlist', 'market_buy', 'market_offer', 'market_accept', 'market_reject',
]);
const PACK_ACTIONS = new Set<ProtocolAction>([
	'rune_exchange', 'pack_purchase', 'pack_commit', 'pack_reveal', 'legacy_pack_open',
	'pack_mint', 'pack_distribute', 'pack_transfer', 'pack_burn',
]);

export function protocolCapabilityForAction(action: ProtocolAction): ProtocolCapability | null {
	if (MARKET_ACTIONS.has(action)) return 'marketplace';
	if (PACK_ACTIONS.has(action)) return 'packs';
	if (action === 'match_anchor' || action === 'match_result') return 'hiveBroadcast';
	if (action === 'campaign_result') return 'campaignPublish';
	return null;
}

export function checkRuntimeCapability(runtime: RagnarokRuntimeConfig, capability: ProtocolCapability): ProtocolCapabilityGateResult {
	return checkProtocolCapability(resolveProtocolPhasePolicy(getRagnarokRuntimePhase(runtime)), capability);
}

export function checkProtocolActionCapability(runtime: RagnarokRuntimeConfig, action: ProtocolAction): ProtocolCapabilityGateResult {
	const capability = protocolCapabilityForAction(action);
	return capability ? checkRuntimeCapability(runtime, capability) : { status: 'allowed' };
}
