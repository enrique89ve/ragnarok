/**
 * Canonical action ordering for the legacy match transcript.
 *
 * The gameplay wire is turn based: a command is accepted only after the
 * previous canonical state has been committed. Both peers can therefore
 * derive the next order from the same lifecycle counter instead of from
 * socket arrival time. Keeping the write behind this small helper prevents
 * individual Chess/Cards/Poker handlers from inventing their own counters.
 */

import { usePeerStore } from '../stores/peerStore';

/**
 * Commit one accepted gameplay action and return its canonical order.
 *
 * `null` is deliberately fail-closed: an action without a bound lifecycle
 * cannot safely enter a transcript that may later be compared between peers.
 */
export function commitNextP2PCanonicalAction(input: {
	readonly actionId: string;
	readonly actorId: string;
}): number | null {
	if (!input.actionId || !input.actorId) return null;
	const peer = usePeerStore.getState();
	const lifecycle = peer.battleLifecycle;
	if (!lifecycle || lifecycle.phase === 'resolved' || lifecycle.phase === 'cancelled') return null;
	const canonicalOrder = lifecycle.lastCanonicalOrder + 1;
	if (!Number.isSafeInteger(canonicalOrder) || canonicalOrder <= 0) return null;
	const next = peer.recordCanonicalAction({
		actionId: input.actionId,
		actorId: input.actorId,
		canonicalOrder,
	});
	if (!next || next.lastCanonicalOrder !== canonicalOrder || !next.acceptedActionIds.includes(input.actionId)) return null;
	return canonicalOrder;
}

/**
 * Commit competitive battle only after the chess reducer accepted a legal
 * move. Mulligan/cards actions may precede this move in the transcript, but
 * they never make leaving or reconnect expiry produce a competitive result.
 */
export function startP2PBattleFromAcceptedChessAction(input: {
	readonly moveId: string;
	readonly actorId: string;
	readonly canonicalOrder: number;
}): boolean {
	const peer = usePeerStore.getState();
	const next = peer.recordBattleStarted(input);
	return next?.phase === 'battle';
}
