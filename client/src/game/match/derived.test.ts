import { describe, expect, it } from 'vitest';
import { ALL_CHAPTERS } from '../campaign';
import { deriveAuthority, deriveIntro, deriveIWonForPhase, deriveOpponentArmyForMode } from './derived';
import type { MatchContext } from './types';

const KNOWN_CHAPTER = ALL_CHAPTERS[0];
const KNOWN_MISSION = KNOWN_CHAPTER.missions[0];

const baseIdentity = {
	matchId: 'match-x',
	matchSeed: 'seed-x',
};

const aiCtx: MatchContext = {
	...baseIdentity,
	opponent: { kind: 'ai', difficulty: 'normal', deckSource: 'warband' },
	reward: { matchXp: { kind: 'none' }, rune: { kind: 'none' }, ranking: { kind: 'none' } },
};

const scriptedCtx: MatchContext = {
	...baseIdentity,
	opponent: {
		kind: 'scripted',
		script: {
			kind: 'campaign-mission',
			mission: KNOWN_MISSION,
			chapter: KNOWN_CHAPTER,
			difficulty: 'heroic',
		},
	},
	reward: { matchXp: { kind: 'percentage', multiplier: 0.1 }, rune: { kind: 'projected', source: 'campaign_first_clear' }, ranking: { kind: 'none' } },
};

const peerCtx: MatchContext = {
	...baseIdentity,
	opponent: {
		kind: 'peer',
		peerId: 'peer-z',
		myRole: 'first-mover',
		opponentUsername: null,
	},
	reward: { matchXp: { kind: 'percentage', multiplier: 1 }, rune: { kind: 'projected', source: 'p2p_ranked' }, ranking: { kind: 'elo' } },
};

describe('deriveAuthority', () => {
	it('returns local for ai opponent', () => {
		expect(deriveAuthority(aiCtx)).toEqual({ kind: 'local' });
	});

	it('returns local for scripted opponent', () => {
		expect(deriveAuthority(scriptedCtx)).toEqual({ kind: 'local' });
	});

	it('returns p2p-symmetric with myRole carried through for peer opponent', () => {
		expect(deriveAuthority(peerCtx)).toEqual({
			kind: 'p2p-symmetric',
			myRole: 'first-mover',
		});
	});
});

describe('deriveOpponentArmyForMode', () => {
	it('returns a non-null ArmySelection for ai opponent (delegates to single builder)', () => {
		const army = deriveOpponentArmyForMode(aiCtx);
		expect(army).not.toBeNull();
	});

	it('returns a non-null ArmySelection for scripted opponent (delegates to campaign builder)', () => {
		const army = deriveOpponentArmyForMode(scriptedCtx);
		expect(army).not.toBeNull();
	});

	it('returns null for peer opponent (army comes via the wire prop, not derivable)', () => {
		const army = deriveOpponentArmyForMode(peerCtx);
		expect(army).toBeNull();
	});
});

describe('deriveIntro', () => {
	it('returns none for ai (single) opponent regardless of seenChapterIds', () => {
		expect(deriveIntro(aiCtx, [])).toEqual({ kind: 'none' });
		expect(deriveIntro(aiCtx, [KNOWN_CHAPTER.id])).toEqual({ kind: 'none' });
	});

	it('returns none for peer opponent regardless of seenChapterIds', () => {
		expect(deriveIntro(peerCtx, [])).toEqual({ kind: 'none' });
		expect(deriveIntro(peerCtx, [KNOWN_CHAPTER.id])).toEqual({ kind: 'none' });
	});

	it('returns cinematic for scripted+campaign-mission when chapter has cinematicIntro and is not seen', () => {
		if (!KNOWN_CHAPTER.cinematicIntro) {
			// Sanity: this test only meaningful if KNOWN_CHAPTER actually has one.
			// All bundled chapters today carry an intro; if that ever stops, this
			// test should still be valid (we'd need to pick a chapter that has one).
			throw new Error('test fixture: KNOWN_CHAPTER must have cinematicIntro');
		}
		const intro = deriveIntro(scriptedCtx, []);
		expect(intro.kind).toBe('cinematic');
		if (intro.kind === 'cinematic') {
			expect(intro.chapter.id).toBe(KNOWN_CHAPTER.id);
			expect(intro.mission.id).toBe(KNOWN_MISSION.id);
		}
	});

	it('returns none when the chapter has already been seen', () => {
		expect(deriveIntro(scriptedCtx, [KNOWN_CHAPTER.id])).toEqual({ kind: 'none' });
	});

	it('returns none when the chapter does not have a cinematicIntro', () => {
		const ctxWithoutCinematic: MatchContext = {
			...scriptedCtx,
			opponent: {
				kind: 'scripted',
				script: {
					kind: 'campaign-mission',
					mission: KNOWN_MISSION,
					chapter: { ...KNOWN_CHAPTER, cinematicIntro: undefined },
					difficulty: 'normal',
				},
			},
		};
		expect(deriveIntro(ctxWithoutCinematic, [])).toEqual({ kind: 'none' });
	});
});

describe('deriveIWonForPhase', () => {
	describe('cards (viewer-relative frame)', () => {
		it('returns true when viewerWinner is "player" — local peer always sees themselves as player', () => {
			expect(deriveIWonForPhase({ kind: 'cards', viewerWinner: 'player' })).toBe(true);
		});

		it('returns false when viewerWinner is "opponent" — the other side won from local POV', () => {
			expect(deriveIWonForPhase({ kind: 'cards', viewerWinner: 'opponent' })).toBe(false);
		});
	});

	describe('chess (canonical frame)', () => {
		it('returns true when canonicalWinner matches myCanonicalSide (first-mover, I am first-mover)', () => {
			expect(deriveIWonForPhase({
				kind: 'chess',
				canonicalWinner: 'player',
				myCanonicalSide: 'player',
			})).toBe(true);
		});

		it('returns true when canonicalWinner matches myCanonicalSide (second-mover, I am second-mover)', () => {
			expect(deriveIWonForPhase({
				kind: 'chess',
				canonicalWinner: 'opponent',
				myCanonicalSide: 'opponent',
			})).toBe(true);
		});

		it('returns false when canonicalWinner differs from myCanonicalSide (first-mover won, I am second-mover)', () => {
			expect(deriveIWonForPhase({
				kind: 'chess',
				canonicalWinner: 'player',
				myCanonicalSide: 'opponent',
			})).toBe(false);
		});

		it('returns false when canonicalWinner differs from myCanonicalSide (second-mover won, I am first-mover)', () => {
			expect(deriveIWonForPhase({
				kind: 'chess',
				canonicalWinner: 'opponent',
				myCanonicalSide: 'player',
			})).toBe(false);
		});
	});
});
