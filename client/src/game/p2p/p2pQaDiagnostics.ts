import type {
	P2PCompetitionResult,
	P2PLogicalClock,
} from '@shared/p2p-wire/p2pCompetitionLifecycle';

export type P2PQaSemanticSnapshot = Readonly<{
	readonly protocol: 'ragnarok-p2p-qa-v1';
	readonly matchId: string;
	readonly canonicalOrder: number;
	readonly transcriptRoot: string;
	readonly revisions: Readonly<Pick<P2PLogicalClock, 'chessRevision' | 'cardsRevision' | 'pokerRevision'>>;
	readonly hashes: Readonly<{
		readonly chess: string;
		readonly cards: string;
		readonly poker: string;
	}>;
	readonly result: P2PCompetitionResult;
}>;

type P2PQaGlobal = typeof globalThis & {
	__RAGNAROK_P2P_QA__?: P2PQaSemanticSnapshot;
};

function qaGlobal(): P2PQaGlobal {
	return globalThis as P2PQaGlobal;
}

/**
 * Publish only the terminal-grade, canonical facts needed by the deployed
 * browser chaos gate. This is intentionally a non-UI diagnostic surface: it
 * contains no wallet material and never participates in gameplay authority.
 */
export function publishP2PQaSnapshot(input: {
	readonly matchId: string | null;
	readonly canonicalOrder: number;
	readonly transcriptRoot: string | null;
	readonly revisions: Readonly<Pick<P2PLogicalClock, 'chessRevision' | 'cardsRevision' | 'pokerRevision'>>;
	readonly hashes: Readonly<{
		readonly chess: string | null;
		readonly cards: string | null;
		readonly poker: string | null;
	}>;
	readonly result: P2PCompetitionResult | null;
}): void {
	if (
		!input.matchId
		|| !input.transcriptRoot
		|| !input.result
		|| !input.hashes.chess
		|| !input.hashes.cards
		|| !input.hashes.poker
	) {
		delete qaGlobal().__RAGNAROK_P2P_QA__;
		return;
	}

	qaGlobal().__RAGNAROK_P2P_QA__ = Object.freeze({
		protocol: 'ragnarok-p2p-qa-v1',
		matchId: input.matchId,
		canonicalOrder: input.canonicalOrder,
		transcriptRoot: input.transcriptRoot,
		revisions: Object.freeze({ ...input.revisions }),
		hashes: Object.freeze({
			chess: input.hashes.chess,
			cards: input.hashes.cards,
			poker: input.hashes.poker,
		}),
		result: input.result,
	});
}

export function clearP2PQaSnapshot(): void {
	delete qaGlobal().__RAGNAROK_P2P_QA__;
}

export function readP2PQaSnapshot(): P2PQaSemanticSnapshot | null {
	return qaGlobal().__RAGNAROK_P2P_QA__ ?? null;
}
