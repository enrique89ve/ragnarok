import { normalizeHiveUsername } from './p2pAvailability';

export type P2PQueueStarterClaimState = 'starter-claimed' | 'starter-unclaimed';

export type P2PQueueAuthMessageInput = {
	readonly username: string;
	readonly peerId: string;
	readonly starterClaimed: boolean;
	readonly timestamp: number;
};

export function p2pQueueStarterClaimState(starterClaimed: boolean): P2PQueueStarterClaimState {
	return starterClaimed ? 'starter-claimed' : 'starter-unclaimed';
}

export function buildP2PQueueAuthMessage({
	username,
	peerId,
	starterClaimed,
	timestamp,
}: P2PQueueAuthMessageInput): string {
	return [
		'ragnarok-queue',
		normalizeHiveUsername(username),
		peerId,
		p2pQueueStarterClaimState(starterClaimed),
		String(timestamp),
	].join(':');
}
