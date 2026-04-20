/**
 * disputeResolution.ts - Merkle-proof-based dispute submission
 *
 * When a player suspects cheating, they can submit a partial transcript
 * proof showing a specific move was part of the signed Merkle root.
 * This is broadcast as slash_evidence with reason='forged_move'.
 *
 * The dispute evidence includes:
 *   - The Merkle proof (sibling hashes + position)
 *   - The disputed move record
 *   - The Merkle root that was signed in the match_result
 *
 * Any observer can verify the proof client-side using TranscriptBuilder.verifyProof().
 */

import type { MoveRecord, MerkleProof } from './signedMove';
import { TranscriptBuilder } from './transcriptBuilder';
import { submitSlashEvidence } from './slashEvidence';
import { canonicalStringify, sha256Hash } from './hashUtils';
import type { HiveBroadcastResult } from '../HiveSync';

export interface DisputeEvidence {
	matchId: string;
	merkleRoot: string;
	disputedMoveIndex: number;
	move: MoveRecord;
	merkleProof: MerkleProof;
	reason: string;
}

export async function verifyMoveInTranscript(proof: MerkleProof): Promise<boolean> {
	return TranscriptBuilder.verifyProof(proof);
}

export async function submitMoveDispute(
	matchId: string,
	offender: string,
	evidence: DisputeEvidence,
	matchResultTrxId: string,
): Promise<HiveBroadcastResult> {
	const evidenceHash = await sha256Hash(canonicalStringify(evidence));

	return submitSlashEvidence({
		matchId,
		offender,
		reason: 'forged_move',
		trxId1: matchResultTrxId,
		trxId2: evidenceHash,
		notes: `Disputed move #${evidence.disputedMoveIndex}: ${evidence.move.action}. ` +
			`Merkle root: ${evidence.merkleRoot}. Proof valid: pending verification.`,
	});
}

export async function buildDisputeEvidence(
	matchId: string,
	transcript: TranscriptBuilder,
	moveIndex: number,
): Promise<DisputeEvidence | null> {
	const root = await transcript.buildMerkleTree();
	const proof = await transcript.getMerkleProof(moveIndex);
	const records = transcript.getBuiltRecords();

	if (!proof || !records || moveIndex >= records.length) return null;

	return {
		matchId,
		merkleRoot: root,
		disputedMoveIndex: moveIndex,
		move: records[moveIndex],
		merkleProof: proof,
		reason: 'forged_move',
	};
}
