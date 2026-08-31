import type { MatchAcceptanceProof, MatchOffer } from '@shared/p2pMatchAcceptance';
import type { MatchmakingDelegationProof } from '@shared/p2pMatchDelegation';
import type { EphemeralSigningKey, SessionKey } from '../protocol/sessionKey';

export type CachedMatchmakingDelegation = Readonly<{
	delegation: MatchmakingDelegationProof;
	ephemeralKey: EphemeralSigningKey;
}>;

export type CachedMatchAcceptance = Readonly<{
	offer: MatchOffer;
	proof: MatchAcceptanceProof;
	sessionKey: SessionKey;
}>;

let cachedAcceptance: CachedMatchAcceptance | null = null;
let cachedDelegation: CachedMatchmakingDelegation | null = null;

export function cacheMatchmakingDelegation(value: CachedMatchmakingDelegation): void {
	cachedDelegation = value;
}

export function getCachedMatchmakingDelegation(): CachedMatchmakingDelegation | null {
	return cachedDelegation;
}

export function clearCachedMatchmakingDelegation(): void {
	cachedDelegation = null;
}

export function cacheMatchAcceptance(value: CachedMatchAcceptance): void {
	cachedAcceptance = value;
}

export function getCachedMatchAcceptance(): CachedMatchAcceptance | null {
	return cachedAcceptance;
}

export function clearCachedMatchAcceptance(): void {
	cachedAcceptance = null;
}
