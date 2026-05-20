export const STARTER_COLLECTION_GATE_COPY = {
	title: 'No cards yet',
	body: 'Claim your Starter Pack to unlock your Collection.',
	cta: 'Claim Starter Pack',
} as const;

export function shouldGateCollectionBehindStarter(starterClaimed: boolean): boolean {
	return !starterClaimed;
}
