import { describe, expect, it } from 'vitest';
import { cardId } from '@shared/schemas/ids';
import { NftUidSchema } from '@shared/protocol-core/playerCollection';
import {
	P2P_MATCH_RESULT_SIGNATURE_DOMAIN,
	P2P_WINNER_ARBITER_REJECT_REASONS,
	type P2PWinnerArbiterAnchor,
	type P2PWinnerArbiterCandidate,
	type P2PWinnerArbiterSignedCommitment,
	verifyP2PWinnerArbiterCandidate,
} from './winnerArbiter';

const BASE_ANCHOR: P2PWinnerArbiterAnchor = {
	matchId: 'match-s0-001',
	playerA: 'alice',
	playerB: 'bob',
	pubkeyA: 'pub-alice',
	pubkeyB: 'pub-bob',
	deckHashA: 'deck-a',
	deckHashB: 'deck-b',
	engineHash: 'engine-1',
	cardRegistryHash: 'registry-1',
	dualAnchored: true,
};

const BASE_WINNER_SIGNATURE: P2PWinnerArbiterSignedCommitment = {
	signer: 'alice',
	signature: 'sig-winner',
	verifiedByPinnedPubkey: true,
	commitmentHash: 'commitment-1',
	domain: P2P_MATCH_RESULT_SIGNATURE_DOMAIN,
};

const BASE_LOSER_SIGNATURE: P2PWinnerArbiterSignedCommitment = {
	signer: 'bob',
	signature: 'sig-loser',
	verifiedByPinnedPubkey: true,
	commitmentHash: 'commitment-1',
	domain: P2P_MATCH_RESULT_SIGNATURE_DOMAIN,
};

const BASE_CANDIDATE: P2PWinnerArbiterCandidate = {
	matchId: 'match-s0-001',
	seasonId: 'S01',
	runtime: {
		stage: 'testnet',
		protocolId: 'ragnarok-testnet',
		resetEpoch: 'qa-s0-arbiter',
	},
	participants: [
		{ account: 'alice', sessionPubkey: 'pub-alice' },
		{ account: 'bob', sessionPubkey: 'pub-bob' },
	],
	anchor: BASE_ANCHOR,
	deckEvidence: {
		kind: 'nft_custody',
		verifiedAtMatchStart: true,
		claimsByAccount: [
			{
				account: 'alice',
				deckHash: 'deck-a',
				claims: [
					{ authority: 'nft-custody', nftUid: NftUidSchema.parse('alice-nft-1'), cardId: cardId(101) },
				],
			},
			{
				account: 'bob',
				deckHash: 'deck-b',
				claims: [
					{ authority: 'nft-custody', nftUid: NftUidSchema.parse('bob-nft-1'), cardId: cardId(102) },
				],
			},
		],
	},
	transcript: {
		localRoot: 'a'.repeat(64),
		remoteRoot: 'a'.repeat(64),
		deterministic: true,
		finalizedBy: 'deterministic_transcript_finalizer',
		cid: 'ipfs://transcript-cid',
	},
	result: {
		winner: 'alice',
		loser: 'bob',
		replayWinner: 'alice',
		commitmentHash: 'commitment-1',
	},
	review: {
		visibleBeforeSigning: true,
	},
	signatures: {
		winner: BASE_WINNER_SIGNATURE,
		loser: BASE_LOSER_SIGNATURE,
	},
};

	describe('verifyP2PWinnerArbiterCandidate', () => {
	it('verifies full NFT ranked evidence with dual anchor, replay agreement, visible review, and winner-posted signature', () => {
		expect(verifyP2PWinnerArbiterCandidate(BASE_CANDIDATE)).toEqual({
			status: 'verified',
			matchId: 'match-s0-001',
			seasonId: 'S01',
			winner: 'alice',
			loser: 'bob',
			transcriptRoot: 'a'.repeat(64),
			transcriptCid: 'ipfs://transcript-cid',
			commitmentHash: 'commitment-1',
			effects: {
				canBroadcastMatchResult: true,
				canApplyP2PRankedRune: true,
				canApplyElo: true,
				rewardEvidence: 'verified_winner_posted_match_result',
			},
		});
	});

	it('rejects missing runtime profile data before checking settlement evidence', () => {
		expect(rejectReason({
			runtime: {
				...BASE_CANDIDATE.runtime,
				resetEpoch: '',
			},
		})).toBe(P2P_WINNER_ARBITER_REJECT_REASONS.runtimeProfile);
	});

	it('rejects result-only evidence without a dual match_anchor', () => {
		expect(rejectReason({
			anchor: null,
			deckEvidence: { kind: 'result_only' },
		})).toBe(P2P_WINNER_ARBITER_REJECT_REASONS.dualAnchor);
	});

	it('rejects anchors without pinned participant pubkeys', () => {
		const { pubkeyB: _pubkeyB, ...anchorWithoutBobPubkey } = BASE_ANCHOR;

		expect(rejectReason({
			anchor: anchorWithoutBobPubkey,
		})).toBe(P2P_WINNER_ARBITER_REJECT_REASONS.pinnedPubkeys);
	});

	it('rejects anchors without pinned deck, engine, and registry facts', () => {
		const { deckHashB: _deckHashB, ...anchorWithoutDeckHash } = BASE_ANCHOR;

		expect(rejectReason({
			anchor: anchorWithoutDeckHash,
		})).toBe(P2P_WINNER_ARBITER_REJECT_REASONS.pinnedFacts);
	});

	it('rejects match_result participants that do not match the match_anchor', () => {
		expect(rejectReason({
			result: {
				...BASE_CANDIDATE.result,
				loser: 'charlie',
			},
		})).toBe(P2P_WINNER_ARBITER_REJECT_REASONS.participants);
	});

	it('rejects candidate participants that do not match the match_anchor', () => {
		expect(rejectReason({
			participants: [
				BASE_CANDIDATE.participants[0],
				{ account: 'charlie', sessionPubkey: 'pub-charlie' },
			],
			result: {
				...BASE_CANDIDATE.result,
				loser: 'charlie',
			},
		})).toBe(P2P_WINNER_ARBITER_REJECT_REASONS.pinnedPubkeys);
	});

	it('rejects self-play match_anchor evidence before settlement', () => {
		expect(rejectReason({
			anchor: {
				...BASE_ANCHOR,
				playerB: 'alice',
			},
		})).toBe(P2P_WINNER_ARBITER_REJECT_REASONS.pinnedPubkeys);
	});

	it('rejects non-NFT custody deck evidence for economic ranked settlement', () => {
		expect(rejectReason({
			deckEvidence: { kind: 'result_only' },
		})).toBe(P2P_WINNER_ARBITER_REJECT_REASONS.nftCustody);
	});

	it('rejects NFT custody deck evidence that was not verified before match start', () => {
		expect(rejectReason({
			deckEvidence: {
				...BASE_CANDIDATE.deckEvidence,
				kind: 'nft_custody',
				verifiedAtMatchStart: false,
			},
		})).toBe(P2P_WINNER_ARBITER_REJECT_REASONS.nftCustody);
	});

	it('rejects NFT custody deck evidence that does not match anchored deck hashes', () => {
		expect(rejectReason({
			deckEvidence: {
				...BASE_CANDIDATE.deckEvidence,
				kind: 'nft_custody',
				claimsByAccount: [
					{
						...BASE_CANDIDATE.deckEvidence.claimsByAccount[0],
						deckHash: 'other-deck',
					},
					BASE_CANDIDATE.deckEvidence.claimsByAccount[1],
				],
			},
		})).toBe(P2P_WINNER_ARBITER_REJECT_REASONS.nftCustody);
	});

	it('rejects QA full-catalog evidence as local feedback only', () => {
		expect(rejectReason({
			deckEvidence: { kind: 'qa_full_catalog' },
		})).toBe(P2P_WINNER_ARBITER_REJECT_REASONS.qaFullCatalog);
	});

	it('rejects missing signed transcript roots', () => {
		expect(rejectReason({
			transcript: {
				...BASE_CANDIDATE.transcript,
				remoteRoot: null,
			},
		})).toBe(P2P_WINNER_ARBITER_REJECT_REASONS.transcriptRoots);
	});

	it('rejects transcript root mismatch', () => {
		expect(rejectReason({
			transcript: {
				...BASE_CANDIDATE.transcript,
				remoteRoot: 'b'.repeat(64),
			},
		})).toBe(P2P_WINNER_ARBITER_REJECT_REASONS.transcriptMismatch);
	});

	it('rejects transcript roots not produced by the deterministic finalizer', () => {
		expect(rejectReason({
			transcript: {
				...BASE_CANDIDATE.transcript,
				finalizedBy: 'untrusted',
			},
		})).toBe(P2P_WINNER_ARBITER_REJECT_REASONS.transcriptMismatch);
	});

	it('rejects a winner that does not match replay-derived facts', () => {
		expect(rejectReason({
			result: {
				...BASE_CANDIDATE.result,
				replayWinner: 'bob',
			},
		})).toBe(P2P_WINNER_ARBITER_REJECT_REASONS.winnerMismatch);
	});

	it('rejects hidden Keychain signing before visible result review', () => {
		expect(rejectReason({
			review: {
				visibleBeforeSigning: false,
			},
		})).toBe(P2P_WINNER_ARBITER_REJECT_REASONS.visibleReview);
	});

	it('accepts a winner-posted result when the loser does not countersign', () => {
		expect(rejectReason({
			signatures: {
				...BASE_CANDIDATE.signatures,
				loser: null,
			},
		})).toBe('verified');
	});

	it('rejects a result with no winner signature', () => {
		expect(rejectReason({
			signatures: {
				winner: null,
				loser: null,
			},
		})).toBe(P2P_WINNER_ARBITER_REJECT_REASONS.winnerPostedSignature);
	});

	it('rejects signatures that were not verified against anchored pubkeys', () => {
		expect(rejectReason({
			signatures: {
				...BASE_CANDIDATE.signatures,
				winner: {
					...BASE_WINNER_SIGNATURE,
					verifiedByPinnedPubkey: false,
				},
			},
		})).toBe(P2P_WINNER_ARBITER_REJECT_REASONS.signatureVerification);
	});

	it('rejects a winner signature over a different commitment', () => {
		expect(rejectReason({
			signatures: {
				...BASE_CANDIDATE.signatures,
				winner: {
					...BASE_WINNER_SIGNATURE,
					commitmentHash: 'other-commitment',
				},
			},
		})).toBe(P2P_WINNER_ARBITER_REJECT_REASONS.winnerPostedSignature);
	});
});

function rejectReason(
	overrides: Partial<P2PWinnerArbiterCandidate>,
): string {
	const decision = verifyP2PWinnerArbiterCandidate({
		...BASE_CANDIDATE,
		...overrides,
	});
	return decision.status === 'rejected' ? decision.reason : 'verified';
}
