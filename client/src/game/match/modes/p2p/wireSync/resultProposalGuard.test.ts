import { describe, expect, it } from 'vitest';
import type { PackagedMatchResult } from '../../../../../data/blockchain/types';
import { verifyResultProposalTranscriptRoot } from './resultProposalGuard';

function makeResult(overrides: Partial<PackagedMatchResult> = {}): PackagedMatchResult {
	return {
		matchId: 'match-1',
		timestamp: 1,
		matchType: 'ranked',
		winner: {
			username: 'alice',
			heroClass: 'warrior',
			heroId: 'odin',
			finalHp: 20,
			damageDealt: 10,
			pokerHandsWon: 1,
			cardsUsed: [],
		},
		loser: {
			username: 'bob',
			heroClass: 'warrior',
			heroId: 'thor',
			finalHp: 0,
			damageDealt: 4,
			pokerHandsWon: 0,
			cardsUsed: [],
		},
		duration: 1000,
		totalRounds: 4,
		eloChanges: {
			winner: { before: 1000, after: 1016, delta: 16 },
			loser: { before: 1000, after: 984, delta: -16 },
		},
		xpRewards: [],
		runeRewards: { winner: 2, loser: 0 },
		seed: 'seed-1',
		hash: 'result-hash-1',
		version: 1,
		result_nonce: 1,
		...overrides,
	};
}

describe('verifyResultProposalTranscriptRoot', () => {
	it('accepts ranked result when proposed and local roots match', () => {
		const result = makeResult({ transcriptRoot: 'a'.repeat(64) });

		expect(verifyResultProposalTranscriptRoot({
			result,
			localRoot: 'a'.repeat(64),
		})).toEqual({
			status: 'ok',
			localRoot: 'a'.repeat(64),
			proposedRoot: 'a'.repeat(64),
		});
	});

	it('rejects ranked result without a proposed transcript root', () => {
		expect(verifyResultProposalTranscriptRoot({
			result: makeResult(),
			localRoot: 'a'.repeat(64),
		})).toEqual({
			status: 'rejected',
			reason: 'missing_transcript_root',
			localRoot: 'a'.repeat(64),
		});
	});

	it('rejects ranked result when the local transcript is unavailable', () => {
		expect(verifyResultProposalTranscriptRoot({
			result: makeResult({ transcriptRoot: 'a'.repeat(64) }),
			localRoot: null,
		})).toEqual({
			status: 'rejected',
			reason: 'local_transcript_unavailable',
			proposedRoot: 'a'.repeat(64),
		});
	});

	it('rejects ranked result when the local root differs', () => {
		expect(verifyResultProposalTranscriptRoot({
			result: makeResult({ transcriptRoot: 'a'.repeat(64) }),
			localRoot: 'b'.repeat(64),
		})).toEqual({
			status: 'rejected',
			reason: 'transcript_root_mismatch',
			localRoot: 'b'.repeat(64),
			proposedRoot: 'a'.repeat(64),
		});
	});
});
