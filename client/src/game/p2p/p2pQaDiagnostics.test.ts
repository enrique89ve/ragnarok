import { beforeEach, describe, expect, it } from 'vitest';

import {
	clearP2PQaSnapshot,
	publishP2PQaSnapshot,
	readP2PQaSnapshot,
} from './p2pQaDiagnostics';

const result = {
	kind: 'normal' as const,
	winnerId: 'peer-a',
	loserId: 'peer-b',
	eventId: 'result:3',
	canonicalOrder: 3,
};

describe('P2P QA semantic diagnostics', () => {
	beforeEach(() => clearP2PQaSnapshot());

	it('does not publish a partial terminal snapshot', () => {
		publishP2PQaSnapshot({
			matchId: 'match-1',
			canonicalOrder: 3,
			transcriptRoot: null,
			revisions: { chessRevision: 1, cardsRevision: 1, pokerRevision: 1 },
			hashes: { chess: 'chess', cards: 'cards', poker: 'poker' },
			result,
		});

		expect(readP2PQaSnapshot()).toBeNull();
	});

	it('publishes the complete canonical comparison surface', () => {
		publishP2PQaSnapshot({
			matchId: 'match-1',
			canonicalOrder: 3,
			transcriptRoot: 'root',
			revisions: { chessRevision: 1, cardsRevision: 1, pokerRevision: 1 },
			hashes: { chess: 'chess', cards: 'cards', poker: 'poker' },
			result,
		});

		expect(readP2PQaSnapshot()).toEqual({
			protocol: 'ragnarok-p2p-qa-v1',
			matchId: 'match-1',
			canonicalOrder: 3,
			transcriptRoot: 'root',
			revisions: { chessRevision: 1, cardsRevision: 1, pokerRevision: 1 },
			hashes: { chess: 'chess', cards: 'cards', poker: 'poker' },
			result,
		});
	});
});

