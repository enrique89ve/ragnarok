import { canonicalStringify, sha256Hash } from './hash';

export const MATCH_RESULT_SIGNATURE_PREFIX = 'ragnarok match_result v1';

export interface CompactMatchResultCommitmentInput {
	m: string;
	w: string;
	l: string;
	n: number;
	h: string;
	s: string;
	v: number;
	c: string;
	tr: string;
	tc: string;
}

export interface CompactMatchResultCommitmentFields {
	matchId: string;
	winner: string;
	loser: string;
	nonce: number;
	resultHash: string;
	seed: string;
	version: number;
	cardHex?: string;
	transcriptRoot: string;
	transcriptCid?: string;
}

export function buildCompactMatchResultCommitmentInput(
	fields: CompactMatchResultCommitmentFields,
): CompactMatchResultCommitmentInput {
	return {
		m: fields.matchId,
		w: fields.winner,
		l: fields.loser,
		n: fields.nonce,
		h: fields.resultHash,
		s: fields.seed,
		v: fields.version,
		c: fields.cardHex ?? '',
		tr: fields.transcriptRoot,
		tc: fields.transcriptCid ?? '',
	};
}

export async function computeCompactMatchResultCommitmentHash(
	input: CompactMatchResultCommitmentInput,
): Promise<string> {
	return sha256Hash(canonicalStringify(input));
}

export function buildMatchResultSignatureMessage(commitmentHash: string): string {
	return `${MATCH_RESULT_SIGNATURE_PREFIX} | ${commitmentHash}`;
}
