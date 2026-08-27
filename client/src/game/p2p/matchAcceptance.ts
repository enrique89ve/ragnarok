import type { MatchAcceptanceProof, MatchOffer } from '@shared/p2pMatchAcceptance';
import type { SessionKey } from '../protocol/sessionKey';

export type CachedMatchAcceptance = Readonly<{
	offer: MatchOffer;
	proof: MatchAcceptanceProof;
	sessionKey: SessionKey;
}>;

let cachedAcceptance: CachedMatchAcceptance | null = null;

export function cacheMatchAcceptance(value: CachedMatchAcceptance): void {
	cachedAcceptance = value;
}

export function getCachedMatchAcceptance(): CachedMatchAcceptance | null {
	return cachedAcceptance;
}

export function clearCachedMatchAcceptance(): void {
	cachedAcceptance = null;
}
