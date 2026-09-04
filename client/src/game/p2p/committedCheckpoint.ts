import type { P2PLogicalClock, P2PLogicalDomain } from '../../../../shared/p2p-wire/p2pCompetitionLifecycle';

export type CommittedCheckpoint = Readonly<{
	readonly commandId: string;
	readonly root: string;
	readonly canonicalOrder: number;
	readonly revisions: P2PLogicalClock;
	readonly domain: P2PLogicalDomain;
}>;

/**
 * Record a post-commit root only after the canonical lifecycle accepted the
 * command. A root from an earlier order or a different logical clock is not a
 * checkpoint; callers must keep the previous one and fail closed upstream.
 */
export function commitCheckpoint(input: {
	readonly previous: CommittedCheckpoint | null;
	readonly commandId: string;
	readonly root: string;
	readonly domain: P2PLogicalDomain;
	readonly clock: P2PLogicalClock;
}): CommittedCheckpoint | null {
	if (!input.commandId || !input.root) return null;
	if (!Number.isSafeInteger(input.clock.canonicalOrder) || input.clock.canonicalOrder <= 0) return null;
	if (input.previous && input.clock.canonicalOrder <= input.previous.canonicalOrder) return null;
	return {
		commandId: input.commandId,
		root: input.root,
		canonicalOrder: input.clock.canonicalOrder,
		revisions: input.clock,
		domain: input.domain,
	};
}

export function sameCheckpoint(
	left: CommittedCheckpoint | null,
	right: CommittedCheckpoint | null,
): boolean {
	if (!left || !right) return left === right;
	return left.commandId === right.commandId
		&& left.root === right.root
		&& left.canonicalOrder === right.canonicalOrder
		&& left.domain === right.domain
		&& left.revisions.chessRevision === right.revisions.chessRevision
		&& left.revisions.cardsRevision === right.revisions.cardsRevision
		&& left.revisions.pokerRevision === right.revisions.pokerRevision;
}
