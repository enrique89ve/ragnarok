export type RemotePokerDecisionLedger = {
	readonly seen: Set<string>;
	readonly order: string[];
};

export function hasRemotePokerDecision(ledger: RemotePokerDecisionLedger, decisionId: string): boolean {
	return ledger.seen.has(decisionId);
}

/** Commits only an engine-applied decision and evicts oldest IDs deterministically. */
export function commitRemotePokerDecision(
	ledger: RemotePokerDecisionLedger,
	decisionId: string,
	maxEntries: number,
): boolean {
	if (ledger.seen.has(decisionId)) return false;
	ledger.seen.add(decisionId);
	ledger.order.push(decisionId);
	while (ledger.order.length > maxEntries) {
		const evicted = ledger.order.shift();
		if (evicted !== undefined) ledger.seen.delete(evicted);
	}
	return true;
}
