import type { PackagedMatchResult } from '../../../../../data/blockchain/types';

export type ResultProposalTranscriptRejection =
	| 'missing_transcript_root'
	| 'local_transcript_unavailable'
	| 'transcript_root_mismatch';

export type ResultProposalTranscriptCheck =
	| { status: 'ok'; localRoot: string; proposedRoot: string }
	| {
			status: 'rejected';
			reason: ResultProposalTranscriptRejection;
			localRoot?: string;
			proposedRoot?: string;
	  };

export function verifyResultProposalTranscriptRoot(input: {
	result: PackagedMatchResult;
	localRoot: string | null;
}): ResultProposalTranscriptCheck {
	if (input.result.matchType !== 'ranked') {
		return {
			status: 'ok',
			localRoot: input.localRoot ?? '',
			proposedRoot: input.result.transcriptRoot ?? '',
		};
	}

	const proposedRoot = input.result.transcriptRoot;
	if (!proposedRoot) {
		return {
			status: 'rejected',
			reason: 'missing_transcript_root',
			localRoot: input.localRoot ?? undefined,
		};
	}

	if (!input.localRoot) {
		return {
			status: 'rejected',
			reason: 'local_transcript_unavailable',
			proposedRoot,
		};
	}

	if (input.localRoot !== proposedRoot) {
		return {
			status: 'rejected',
			reason: 'transcript_root_mismatch',
			localRoot: input.localRoot,
			proposedRoot,
		};
	}

	return { status: 'ok', localRoot: input.localRoot, proposedRoot };
}
