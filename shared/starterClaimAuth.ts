import { normalizeHiveUsername } from './p2pAvailability';
import {
	resolveWalletInvocationAuthMode,
	type ProtocolPhasePolicy,
	type WalletInvocationAuthMode,
} from './protocolPhase';

export type StarterClaimAuthMode = WalletInvocationAuthMode;

export function resolveStarterClaimAuthMode(policy: ProtocolPhasePolicy): StarterClaimAuthMode {
	return resolveWalletInvocationAuthMode(policy);
}

export type StarterClaimAuthMessageInput = {
	readonly username: string;
	readonly timestamp: number;
};

export function buildStarterClaimAuthMessage({
	username,
	timestamp,
}: StarterClaimAuthMessageInput): string {
	return `ragnarok-starter-claim:${normalizeHiveUsername(username)}:${timestamp}`;
}
