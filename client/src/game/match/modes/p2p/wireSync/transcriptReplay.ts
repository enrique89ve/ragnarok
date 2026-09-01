import type { ActionEnvelopeWire, ActionLeaf } from '../../../../protocol/transcript';

export type TranscriptReplayResult = Readonly<{
	accepted: boolean;
	sent: number;
	total: number;
}>;

/**
 * Re-emit a contiguous suffix of the signed transcript without hiding a
 * transport rejection. A partial replay cannot repair the receiver's chain,
 * so callers must quarantine the session when `accepted` is false.
 */
export function replayTranscriptLeaves(input: {
	readonly matchId: string;
	readonly leaves: readonly ActionLeaf[];
	readonly fromTurn: number;
	readonly send: (message: ActionEnvelopeWire) => boolean;
}): TranscriptReplayResult {
	const leaves = input.leaves.slice(input.fromTurn);
	let sent = 0;
	for (const leaf of leaves) {
		const accepted = input.send({
			type: 'action_envelope',
			matchId: input.matchId,
			seq: leaf.seq,
			prevHash: leaf.prevHash,
			action: leaf.action,
			sig: leaf.sig,
		});
		if (!accepted) {
			return { accepted: false, sent, total: leaves.length };
		}
		sent += 1;
	}
	return { accepted: true, sent, total: leaves.length };
}
