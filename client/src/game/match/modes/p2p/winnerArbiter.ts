import { MATCH_RESULT_SIGNATURE_PREFIX } from '@shared/protocol-core/matchResultCommitment';
import type { DeckCardClaim } from '@shared/protocol-core/deckVerification';

export const P2P_MATCH_RESULT_SIGNATURE_DOMAIN = MATCH_RESULT_SIGNATURE_PREFIX;

export const P2P_WINNER_ARBITER_REJECT_REASONS = {
	runtimeProfile: 'runtime profile is missing',
	dualAnchor: 'ranked match requires dual-anchored match_anchor',
	pinnedPubkeys: 'match_anchor is missing pinned pubkeys',
	pinnedFacts: 'match_anchor is missing pinned deck or engine facts',
	participants: 'match_result participants do not match match_anchor',
	qaFullCatalog: 'QA full-catalog rewards are local feedback',
	nftCustody: 'full NFT ranked requires nft-custody deck evidence',
	transcriptRoots: 'missing signed transcript roots',
	transcriptMismatch: 'transcript_root_mismatch',
	winnerMismatch: 'winner mismatch',
	visibleReview: 'visible result review/sign flow required before Keychain',
	signatureVerification: 'ranked match_result signatures must verify against anchored pubkeys',
	dualSignatures: 'ranked match_result requires winner and loser signatures',
} as const;

export type P2PWinnerArbiterRejectReason =
	typeof P2P_WINNER_ARBITER_REJECT_REASONS[keyof typeof P2P_WINNER_ARBITER_REJECT_REASONS];

export type P2PWinnerArbiterRuntime = {
	readonly stage: string;
	readonly protocolId: string;
	readonly resetEpoch: string;
};

export type P2PWinnerArbiterParticipant = {
	readonly account: string;
	readonly sessionPubkey: string;
};

export type P2PWinnerArbiterAnchor = {
	readonly matchId: string;
	readonly playerA: string;
	readonly playerB: string;
	readonly pubkeyA?: string;
	readonly pubkeyB?: string;
	readonly deckHashA?: string;
	readonly deckHashB?: string;
	readonly engineHash?: string;
	readonly cardRegistryHash?: string;
	readonly dualAnchored: boolean;
};

export type P2PWinnerArbiterDeckEvidence =
	| {
		readonly kind: 'nft_custody';
		readonly verifiedAtMatchStart: boolean;
		readonly claimsByAccount: readonly P2PWinnerArbiterDeckClaims[];
	}
	| { readonly kind: 'qa_full_catalog' }
	| { readonly kind: 'result_only' };

export type P2PWinnerArbiterDeckClaims = {
	readonly account: string;
	readonly deckHash: string;
	readonly claims: readonly DeckCardClaim[];
};

export type P2PWinnerArbiterTranscript = {
	readonly localRoot: string | null;
	readonly remoteRoot: string | null;
	readonly deterministic: boolean;
	readonly finalizedBy: 'deterministic_transcript_finalizer' | 'untrusted';
	readonly cid?: string;
};

export type P2PWinnerArbiterResultFacts = {
	readonly winner: string;
	readonly loser: string;
	readonly replayWinner: string | null;
	readonly commitmentHash: string;
};

export type P2PWinnerArbiterSignedCommitment = {
	readonly signer: string;
	readonly signature: string;
	readonly verifiedByPinnedPubkey: boolean;
	readonly commitmentHash: string;
	readonly domain: string;
};

export type P2PWinnerArbiterCandidate = {
	readonly matchId: string;
	readonly seasonId: string;
	readonly runtime: P2PWinnerArbiterRuntime;
	readonly participants: readonly [P2PWinnerArbiterParticipant, P2PWinnerArbiterParticipant];
	readonly anchor: P2PWinnerArbiterAnchor | null;
	readonly deckEvidence: P2PWinnerArbiterDeckEvidence;
	readonly transcript: P2PWinnerArbiterTranscript;
	readonly result: P2PWinnerArbiterResultFacts;
	readonly review: {
		readonly visibleBeforeSigning: boolean;
	};
	readonly signatures: {
		readonly winner: P2PWinnerArbiterSignedCommitment | null;
		readonly loser: P2PWinnerArbiterSignedCommitment | null;
	};
};

export type P2PWinnerArbiterDecision =
	| {
		readonly status: 'verified';
		readonly matchId: string;
		readonly seasonId: string;
		readonly winner: string;
		readonly loser: string;
		readonly transcriptRoot: string;
		readonly transcriptCid: string | null;
		readonly commitmentHash: string;
		readonly effects: P2PWinnerArbiterVerifiedEffects;
	}
	| {
		readonly status: 'rejected';
		readonly reason: P2PWinnerArbiterRejectReason;
		readonly effects: P2PWinnerArbiterRejectedEffects;
	};

export type P2PWinnerArbiterVerifiedEffects = {
	readonly canBroadcastMatchResult: true;
	readonly canApplyP2PRankedRune: true;
	readonly canApplyElo: true;
	readonly rewardEvidence: 'verified_dual_signed_match_result';
};

export type P2PWinnerArbiterRejectedEffects = {
	readonly canBroadcastMatchResult: false;
	readonly canApplyP2PRankedRune: false;
	readonly canApplyElo: false;
	readonly rewardEvidence: 'none';
};

type ArbiterBlocker = (candidate: P2PWinnerArbiterCandidate) => P2PWinnerArbiterRejectReason | null;

const REJECTED_EFFECTS: P2PWinnerArbiterRejectedEffects = {
	canBroadcastMatchResult: false,
	canApplyP2PRankedRune: false,
	canApplyElo: false,
	rewardEvidence: 'none',
};

const VERIFIED_EFFECTS: P2PWinnerArbiterVerifiedEffects = {
	canBroadcastMatchResult: true,
	canApplyP2PRankedRune: true,
	canApplyElo: true,
	rewardEvidence: 'verified_dual_signed_match_result',
};

const ARBITER_BLOCKERS: readonly ArbiterBlocker[] = [
	requireRuntimeProfile,
	requireDualAnchor,
	requirePinnedParticipantPubkeys,
	requirePinnedAnchorFacts,
	requireResultParticipantsMatchAnchor,
	rejectQaFullCatalog,
	requireFullNftCustodyDeckEvidence,
	requireTranscriptRoots,
	requireMatchingDeterministicTranscript,
	requireReplayWinnerAgreement,
	requireVisibleReviewBeforeSigning,
	requireDualSignedCommitment,
];

export function verifyP2PWinnerArbiterCandidate(
	candidate: P2PWinnerArbiterCandidate,
): P2PWinnerArbiterDecision {
	for (const blocker of ARBITER_BLOCKERS) {
		const reason = blocker(candidate);
		if (reason) return reject(reason);
	}

	return {
		status: 'verified',
		matchId: candidate.matchId,
		seasonId: candidate.seasonId,
		winner: candidate.result.winner,
		loser: candidate.result.loser,
		transcriptRoot: candidate.transcript.localRoot ?? '',
		transcriptCid: candidate.transcript.cid ?? null,
		commitmentHash: candidate.result.commitmentHash,
		effects: VERIFIED_EFFECTS,
	};
}

function reject(reason: P2PWinnerArbiterRejectReason): P2PWinnerArbiterDecision {
	return {
		status: 'rejected',
		reason,
		effects: REJECTED_EFFECTS,
	};
}

function requireRuntimeProfile(candidate: P2PWinnerArbiterCandidate): P2PWinnerArbiterRejectReason | null {
	return hasText(candidate.runtime.stage)
		&& hasText(candidate.runtime.protocolId)
		&& hasText(candidate.runtime.resetEpoch)
		&& hasText(candidate.seasonId)
		? null
		: P2P_WINNER_ARBITER_REJECT_REASONS.runtimeProfile;
}

function requireDualAnchor(candidate: P2PWinnerArbiterCandidate): P2PWinnerArbiterRejectReason | null {
	return candidate.anchor?.dualAnchored === true && candidate.anchor.matchId === candidate.matchId
		? null
		: P2P_WINNER_ARBITER_REJECT_REASONS.dualAnchor;
}

function requirePinnedParticipantPubkeys(candidate: P2PWinnerArbiterCandidate): P2PWinnerArbiterRejectReason | null {
	const anchor = candidate.anchor;
	if (!anchor) return P2P_WINNER_ARBITER_REJECT_REASONS.pinnedPubkeys;
	if (!hasText(anchor.pubkeyA) || !hasText(anchor.pubkeyB)) {
		return P2P_WINNER_ARBITER_REJECT_REASONS.pinnedPubkeys;
	}

	for (const participant of candidate.participants) {
		const pinned = getPinnedPubkeyForAccount(anchor, participant.account);
		if (!hasText(participant.sessionPubkey) || pinned !== participant.sessionPubkey) {
			return P2P_WINNER_ARBITER_REJECT_REASONS.pinnedPubkeys;
		}
	}

	return null;
}

function requirePinnedAnchorFacts(candidate: P2PWinnerArbiterCandidate): P2PWinnerArbiterRejectReason | null {
	const anchor = candidate.anchor;
	if (!anchor) return P2P_WINNER_ARBITER_REJECT_REASONS.pinnedFacts;
	return hasText(anchor.deckHashA)
		&& hasText(anchor.deckHashB)
		&& hasText(anchor.engineHash)
		&& hasText(anchor.cardRegistryHash)
		? null
		: P2P_WINNER_ARBITER_REJECT_REASONS.pinnedFacts;
}

function requireResultParticipantsMatchAnchor(candidate: P2PWinnerArbiterCandidate): P2PWinnerArbiterRejectReason | null {
	const anchor = candidate.anchor;
	if (!anchor) return P2P_WINNER_ARBITER_REJECT_REASONS.participants;

	const anchorAccounts: readonly [string, string] = [
		normalizeAccount(anchor.playerA),
		normalizeAccount(anchor.playerB),
	];
	const resultAccounts: readonly [string, string] = [
		normalizeAccount(candidate.result.winner),
		normalizeAccount(candidate.result.loser),
	];
	const participantAccounts: readonly [string, string] = [
		normalizeAccount(candidate.participants[0].account),
		normalizeAccount(candidate.participants[1].account),
	];
	if (!hasTwoDistinctAccounts(anchorAccounts)) return P2P_WINNER_ARBITER_REJECT_REASONS.participants;
	if (!hasTwoDistinctAccounts(participantAccounts)) return P2P_WINNER_ARBITER_REJECT_REASONS.participants;
	if (!hasTwoDistinctAccounts(resultAccounts)) return P2P_WINNER_ARBITER_REJECT_REASONS.participants;
	if (!sameAccountSet(anchorAccounts, participantAccounts)) return P2P_WINNER_ARBITER_REJECT_REASONS.participants;
	if (!sameAccountSet(anchorAccounts, resultAccounts)) return P2P_WINNER_ARBITER_REJECT_REASONS.participants;

	return null;
}

function rejectQaFullCatalog(candidate: P2PWinnerArbiterCandidate): P2PWinnerArbiterRejectReason | null {
	return candidate.deckEvidence.kind === 'qa_full_catalog'
		? P2P_WINNER_ARBITER_REJECT_REASONS.qaFullCatalog
		: null;
}

function requireFullNftCustodyDeckEvidence(candidate: P2PWinnerArbiterCandidate): P2PWinnerArbiterRejectReason | null {
	if (candidate.deckEvidence.kind !== 'nft_custody') {
		return P2P_WINNER_ARBITER_REJECT_REASONS.nftCustody;
	}
	if (candidate.deckEvidence.verifiedAtMatchStart !== true) {
		return P2P_WINNER_ARBITER_REJECT_REASONS.nftCustody;
	}

	for (const participant of candidate.participants) {
		const evidence = getDeckEvidenceForAccount(candidate.deckEvidence.claimsByAccount, participant.account);
		const pinnedDeckHash = candidate.anchor ? getPinnedDeckHashForAccount(candidate.anchor, participant.account) : null;
		if (!evidence || evidence.claims.length === 0) return P2P_WINNER_ARBITER_REJECT_REASONS.nftCustody;
		if (!hasText(evidence.deckHash) || evidence.deckHash !== pinnedDeckHash) {
			return P2P_WINNER_ARBITER_REJECT_REASONS.nftCustody;
		}
		if (!evidence.claims.every(isNftCustodyClaim)) return P2P_WINNER_ARBITER_REJECT_REASONS.nftCustody;
	}

	return null;
}

function requireTranscriptRoots(candidate: P2PWinnerArbiterCandidate): P2PWinnerArbiterRejectReason | null {
	return hasText(candidate.transcript.localRoot) && hasText(candidate.transcript.remoteRoot)
		? null
		: P2P_WINNER_ARBITER_REJECT_REASONS.transcriptRoots;
}

function requireMatchingDeterministicTranscript(candidate: P2PWinnerArbiterCandidate): P2PWinnerArbiterRejectReason | null {
	return candidate.transcript.deterministic
		&& candidate.transcript.finalizedBy === 'deterministic_transcript_finalizer'
		&& candidate.transcript.localRoot === candidate.transcript.remoteRoot
		? null
		: P2P_WINNER_ARBITER_REJECT_REASONS.transcriptMismatch;
}

function requireReplayWinnerAgreement(candidate: P2PWinnerArbiterCandidate): P2PWinnerArbiterRejectReason | null {
	const winner = normalizeAccount(candidate.result.winner);
	const loser = normalizeAccount(candidate.result.loser);
	const replayWinner = normalizeAccount(candidate.result.replayWinner ?? '');
	if (!hasText(winner) || winner === loser) return P2P_WINNER_ARBITER_REJECT_REASONS.winnerMismatch;
	if (winner !== replayWinner) return P2P_WINNER_ARBITER_REJECT_REASONS.winnerMismatch;
	return null;
}

function requireVisibleReviewBeforeSigning(candidate: P2PWinnerArbiterCandidate): P2PWinnerArbiterRejectReason | null {
	return candidate.review.visibleBeforeSigning
		? null
		: P2P_WINNER_ARBITER_REJECT_REASONS.visibleReview;
}

function requireDualSignedCommitment(candidate: P2PWinnerArbiterCandidate): P2PWinnerArbiterRejectReason | null {
	const { loser, winner } = candidate.signatures;
	if (!winner || !loser) return P2P_WINNER_ARBITER_REJECT_REASONS.dualSignatures;
	if (!winner.verifiedByPinnedPubkey || !loser.verifiedByPinnedPubkey) {
		return P2P_WINNER_ARBITER_REJECT_REASONS.signatureVerification;
	}
	if (!isSignatureForResult(candidate, winner, candidate.result.winner)) {
		return P2P_WINNER_ARBITER_REJECT_REASONS.dualSignatures;
	}
	if (!isSignatureForResult(candidate, loser, candidate.result.loser)) {
		return P2P_WINNER_ARBITER_REJECT_REASONS.dualSignatures;
	}
	return null;
}

function isSignatureForResult(
	candidate: P2PWinnerArbiterCandidate,
	signature: P2PWinnerArbiterSignedCommitment,
	expectedSigner: string,
): boolean {
	return normalizeAccount(signature.signer) === normalizeAccount(expectedSigner)
		&& hasText(signature.signature)
		&& signature.commitmentHash === candidate.result.commitmentHash
		&& signature.domain === P2P_MATCH_RESULT_SIGNATURE_DOMAIN;
}

function getPinnedPubkeyForAccount(anchor: P2PWinnerArbiterAnchor, account: string): string | null {
	const normalized = normalizeAccount(account);
	if (normalized === normalizeAccount(anchor.playerA)) return anchor.pubkeyA ?? null;
	if (normalized === normalizeAccount(anchor.playerB)) return anchor.pubkeyB ?? null;
	return null;
}

function getPinnedDeckHashForAccount(anchor: P2PWinnerArbiterAnchor, account: string): string | null {
	const normalized = normalizeAccount(account);
	if (normalized === normalizeAccount(anchor.playerA)) return anchor.deckHashA ?? null;
	if (normalized === normalizeAccount(anchor.playerB)) return anchor.deckHashB ?? null;
	return null;
}

function getDeckEvidenceForAccount(
	claimsByAccount: readonly P2PWinnerArbiterDeckClaims[],
	account: string,
): P2PWinnerArbiterDeckClaims | null {
	const normalized = normalizeAccount(account);
	return claimsByAccount.find(entry => normalizeAccount(entry.account) === normalized) ?? null;
}

function isNftCustodyClaim(claim: DeckCardClaim): boolean {
	return claim.authority === 'nft-custody';
}

function sameAccountSet(left: readonly string[], right: readonly string[]): boolean {
	return left.length === right.length && left.every(account => right.includes(account));
}

function hasTwoDistinctAccounts(accounts: readonly [string, string]): boolean {
	return hasText(accounts[0]) && hasText(accounts[1]) && accounts[0] !== accounts[1];
}

function normalizeAccount(account: string): string {
	return account.trim().toLowerCase();
}

function hasText(value: string | null | undefined): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}
