import { P2P_LIMITS } from '../../shared/p2p-wire/p2pLimits';

export type ControlSlotClaim =
	| { readonly kind: 'incumbent' }
	| { readonly kind: 'candidate'; readonly replaceExistingCandidate: boolean }
	| { readonly kind: 'reject'; readonly reason: 'room_full' };

export function claimControlSlot(input: Readonly<{
	readonly hasIncumbent: boolean;
	readonly hasCandidate: boolean;
	readonly roomMemberCount: number;
	readonly roomMaxPeers?: number;
}>): ControlSlotClaim {
	const roomMaxPeers = input.roomMaxPeers ?? 2;
	if (input.hasIncumbent || input.hasCandidate) {
		return {
			kind: 'candidate',
			replaceExistingCandidate: input.hasCandidate,
		};
	}
	if (input.roomMemberCount >= roomMaxPeers) return { kind: 'reject', reason: 'room_full' };
	return { kind: 'incumbent' };
}

export function maxConnectionsPerMatchPeer(): number {
	return P2P_LIMITS.activeConnectionsPerMatchPeer + P2P_LIMITS.pendingReplacementPerPeer;
}
