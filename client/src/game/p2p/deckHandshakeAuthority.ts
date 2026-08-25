import type { DeckCardClaim } from '@shared/protocol-core/deckVerification';
import { canonicalStringify } from '@shared/protocol-core/hash';
import { fnv1a } from '@shared/protocol-core/broadcast-utils';
import { normalizeHiveUsername } from '@shared/p2pAvailability';
import type { CardsDeckAnnounce } from './cardsDeckHandshake';

export type DeckHandshakeSnapshot = Readonly<{
	readonly deck: CardsDeckAnnounce;
	readonly claims: readonly DeckCardClaim[];
	readonly deckHash: string;
	readonly claimsHash: string;
}>;

export type DeckHandshakeBinding =
	| { readonly status: 'bound'; readonly snapshot: DeckHandshakeSnapshot }
	| { readonly status: 'rejected'; readonly code: 'deck_claims_card_mismatch'; readonly detail: string };

export type DeckVerificationIdentity = 'pending' | 'approved' | 'rejected';

export function checkDeckVerificationIdentity(
	claimAccount: string,
	announcedAccount: string | null,
	seedResolved: boolean,
): DeckVerificationIdentity {
	if (!announcedAccount) return seedResolved ? 'rejected' : 'pending';
	return normalizeHiveUsername(claimAccount) === normalizeHiveUsername(announcedAccount)
		? 'approved'
		: 'rejected';
}

export function isCurrentDeckVerificationGeneration(
	capturedGeneration: number,
	currentGeneration: number,
): boolean {
	return capturedGeneration === currentGeneration;
}

export function canInitDeckHandshake(input: {
	readonly matchSeed: string | null;
	readonly myCanonicalSide: 'player' | 'opponent' | null;
	readonly localSnapshot: DeckHandshakeSnapshot | null;
	readonly remoteSnapshot: DeckHandshakeSnapshot | null;
	readonly sharedNetwork: boolean;
	readonly remoteVerification: 'pending' | 'checking' | 'approved' | 'rejected';
}): boolean {
	if (!input.matchSeed || !input.myCanonicalSide || !input.localSnapshot || !input.remoteSnapshot) return false;
	return !input.sharedNetwork || input.remoteVerification === 'approved';
}

export function createDeckHandshakeSnapshot(
	deck: CardsDeckAnnounce,
	claims: readonly DeckCardClaim[],
): DeckHandshakeSnapshot {
	return {
		deck,
		claims,
		deckHash: fnv1a(canonicalStringify(deck)),
		claimsHash: fnv1a(canonicalStringify(claims)),
	};
}

/** Binds ownership claims to the exact announced card multiset before init. */
export function bindDeckClaimsToAnnounce(
	deck: CardsDeckAnnounce,
	claims: readonly DeckCardClaim[],
): DeckHandshakeBinding {
	const announced = [...deck.cardIds].sort((a, b) => a - b);
	const claimed = claims.map(claim => claim.cardId).sort((a, b) => a - b);
	if (canonicalStringify(announced) !== canonicalStringify(claimed)) {
		return {
			status: 'rejected',
			code: 'deck_claims_card_mismatch',
			detail: `deck announced ${announced.length} card(s), but claims cover ${claimed.length}`,
		};
	}
	return { status: 'bound', snapshot: createDeckHandshakeSnapshot(deck, claims) };
}
