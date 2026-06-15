import { normalizeHiveUsername } from './p2pAvailability';

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
