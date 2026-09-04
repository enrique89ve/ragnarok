import type { GameCommandEnvelope } from '../../../../hooks/p2pEnvelope';

export type CardsCommandReplayResult = Readonly<{
	readonly accepted: boolean;
	readonly sent: number;
	readonly total: number;
}>;

/**
 * Re-emits the sender's signed Cards commands from the first sequence the
 * peer says it is missing. The normal game_command receiver remains the
 * authority boundary: this helper only selects and transports exact signed
 * envelopes, it never rewrites sequence numbers or payloads.
 */
export function replayCardsCommandEnvelopes(input: {
	readonly envelopes: readonly GameCommandEnvelope[];
	readonly fromSeq: number;
	/** Next sender sequence; proves the retained history covers the suffix. */
	readonly nextSeq: number;
	readonly send: (message: GameCommandEnvelope) => boolean;
}): CardsCommandReplayResult {
	if (!Number.isSafeInteger(input.fromSeq) || input.fromSeq < 0
		|| !Number.isSafeInteger(input.nextSeq) || input.nextSeq < input.fromSeq) {
		return { accepted: false, sent: 0, total: 0 };
	}
	const envelopes = input.envelopes
		.filter((envelope) => envelope.seq >= input.fromSeq)
		.sort((left, right) => left.seq - right.seq);
	const expectedCount = input.nextSeq - input.fromSeq;
	if (envelopes.length !== expectedCount
		|| envelopes.some((envelope, index) => envelope.seq !== input.fromSeq + index)) {
		return { accepted: false, sent: 0, total: expectedCount };
	}
	let sent = 0;
	for (const envelope of envelopes) {
		if (!input.send(envelope)) return { accepted: false, sent, total: envelopes.length };
		sent += 1;
	}
	return { accepted: true, sent, total: envelopes.length };
}
