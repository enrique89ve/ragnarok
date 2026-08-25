/**
 * Convergence tests for `initializeGameSeeded` — the determinism
 * guarantee for the P2P symmetric-replay path. Two callers passing
 * fresh generators built from the same `matchSeed` must observe
 * byte-equivalent output (same deck order, same hand instanceIds,
 * same opponent draws).
 *
 * No `selectedDeckId` is passed — the player receives the fixed canonical
 * starter deck while the opponent catalog fallback remains driven by the
 * injected RNG. localStorage is not touched in that path.
 */

import { afterEach, describe, it, expect, vi } from 'vitest';
import { createLocalCampaignSettlement } from '@shared/protocol-core/localCampaignSettlement';
import { createProtocolRuntimeFingerprint } from '@shared/protocolPhase';
import { STARTER_ENTITLEMENT, isStarterEntitlementCardId } from '@shared/schemas/starterEntitlement';
import { getStarterUid } from '@/data/schemas/HiveTypes';
import { collectLocalWinnerCards } from '../match/localCardProjection';
import { initializeGameSeeded, type InitializeGameSeededOpts } from './gameUtils';
import { createSeededRng, createSeededIdGen } from './seededRng';

const SEED_A = '5b3a8c1d4e7f9a2b5b3a8c1d4e7f9a2b5b3a8c1d4e7f9a2b5b3a8c1d4e7f9a2b';
const SEED_B = 'deadbeefcafef00ddeadbeefcafef00ddeadbeefcafef00ddeadbeefcafef00d';

afterEach(() => vi.unstubAllGlobals());

function buildOpts(seed: string): InitializeGameSeededOpts {
	return {
		rng: createSeededRng(seed),
		playerIdGen: createSeededIdGen(seed, 'p1'),
		opponentIdGen: createSeededIdGen(seed, 'p2'),
	};
}

function playerDeckIds(state: ReturnType<typeof initializeGameSeeded>): number[] {
	return [
		...state.players.player.hand.map(instance => Number(instance.card.id)),
		...state.players.player.deck.map(card => Number(card.id)),
	];
}

describe('initializeGameSeeded convergence', () => {
	it('two calls with the same seed produce byte-equivalent state', () => {
		const a = initializeGameSeeded(buildOpts(SEED_A));
		const b = initializeGameSeeded(buildOpts(SEED_A));
		expect(a).toEqual(b);
	});

	it('hand instanceIds match across calls with the same seed', () => {
		const a = initializeGameSeeded(buildOpts(SEED_A));
		const b = initializeGameSeeded(buildOpts(SEED_A));
		const aIds = a.players.player.hand.map(c => c.instanceId);
		const bIds = b.players.player.hand.map(c => c.instanceId);
		expect(aIds).toEqual(bIds);
		expect(aIds.length).toBeGreaterThan(0);
	});

	it('player and opponent hand instanceIds are disjoint (separate namespaces)', () => {
		const state = initializeGameSeeded(buildOpts(SEED_A));
		const playerIds = new Set(state.players.player.hand.map(c => c.instanceId));
		const opponentIds = new Set(state.players.opponent.hand.map(c => c.instanceId));
		const overlap = [...playerIds].filter(id => opponentIds.has(id));
		expect(overlap).toEqual([]);
	});

	it('different seeds produce different state', () => {
		const a = initializeGameSeeded(buildOpts(SEED_A));
		const b = initializeGameSeeded(buildOpts(SEED_B));
		expect(a).not.toEqual(b);
	});

	it('keeps the canonical starter player deck fixed while opponent fallback follows the seed', () => {
		const a = initializeGameSeeded(buildOpts(SEED_A));
		const b = initializeGameSeeded(buildOpts(SEED_B));
		const aPlayerIds = playerDeckIds(a);
		const bPlayerIds = playerDeckIds(b);
		const aOpponentIds = [
			...a.players.opponent.hand.map(instance => Number(instance.card.id)),
			...a.players.opponent.deck.map(card => Number(card.id)),
		];
		const bOpponentIds = [
			...b.players.opponent.hand.map(instance => Number(instance.card.id)),
			...b.players.opponent.deck.map(card => Number(card.id)),
		];
		expect(aPlayerIds).toEqual(STARTER_ENTITLEMENT.heroDecks.mage);
		expect(bPlayerIds).toEqual(STARTER_ENTITLEMENT.heroDecks.mage);
		expect(aOpponentIds).not.toEqual(bOpponentIds);
	});

	it('uses the selected starter hero class when no saved or explicit deck exists', () => {
		const state = initializeGameSeeded({ ...buildOpts(SEED_A), selectedHeroClass: 'warrior' });
		expect(playerDeckIds(state)).toEqual(STARTER_ENTITLEMENT.heroDecks.warrior);
	});

	it('preserves an explicit handshake deck over the local starter fallback', () => {
		const explicitDeck = initializeGameSeeded({ ...buildOpts(SEED_A), playerHeroClass: 'rogue' });
		const explicitCards = [
			...explicitDeck.players.player.hand.map(instance => instance.card),
			...explicitDeck.players.player.deck,
		];
		const state = initializeGameSeeded({
			...buildOpts(SEED_A),
			selectedHeroClass: 'mage',
			playerDeckCards: explicitCards,
		});
		expect(playerDeckIds(state)).toEqual(STARTER_ENTITLEMENT.heroDecks.rogue);
	});

	it('preserves a saved deck over the local starter fallback', () => {
		vi.stubGlobal('localStorage', {
			getItem: vi.fn(() => JSON.stringify([{ id: 'saved-mage', cards: { 20001: 30 } }])),
		});
		const state = initializeGameSeeded({
			...buildOpts(SEED_A),
			selectedDeckId: 'saved-mage',
			selectedHeroClass: 'mage',
		});
		expect(playerDeckIds(state)).toEqual(Array<number>(30).fill(20001));
	});

	it('retains the legacy catalog fallback only for a non-starter class', () => {
		const state = initializeGameSeeded({ ...buildOpts(SEED_A), playerHeroClass: 'paladin' });
		const playerIds = playerDeckIds(state);
		expect(playerIds).toHaveLength(30);
		expect(playerIds.some(cardId => !isStarterEntitlementCardId(cardId))).toBe(true);
	});

	it('projects Card XP and a local level-up from the real player bootstrap', () => {
		const state = initializeGameSeeded(buildOpts(SEED_A));
		const starterUid = getStarterUid(100);
		const cards = collectLocalWinnerCards(state, 'alice', [{
			updateId: 'previous-starter-100',
			uid: starterUid,
			ownerAccount: 'alice',
			cardId: 100,
			xp: 40,
			level: 1,
			eventId: 'previous-match',
			timestamp: 1,
			sequence: '1:previous-match',
		}]);
		const record = createLocalCampaignSettlement({
			runtimeFingerprint: createProtocolRuntimeFingerprint({
				stage: 'local',
				phaseId: 'local-gameplay-v1',
				protocolId: 'rk_game_testnet',
				resetEpoch: 'campaign-bootstrap-test',
				seasonStart: '2026-08-24T00:00:00Z',
				indexStartBlock: 1,
			}),
			account: 'alice',
			campaignId: 'war-of-pantheons',
			missionId: 'norse-1',
			difficulty: 'normal',
			matchId: 'campaign-bootstrap-match',
			matchSeed: SEED_A,
			turnCount: 6,
			firstClear: true,
			runeAmount: 2,
			seasonId: 'local-season',
			cards,
			timestamp: 2,
		});

		expect(cards.length).toBeGreaterThan(0);
		expect(cards.every(card => isStarterEntitlementCardId(card.cardId))).toBe(true);
		expect(record.cardXp).not.toHaveLength(0);
		expect(record.cardXp.find(card => card.uid === starterUid)).toMatchObject({
			xpBefore: 40,
			xpAfter: 50,
			levelBefore: 1,
			levelAfter: 2,
			didLevelUp: true,
			levelUpId: expect.any(String),
		});
	});

	it('hand size is exactly 3 per player', () => {
		const state = initializeGameSeeded(buildOpts(SEED_A));
		expect(state.players.player.hand).toHaveLength(3);
		expect(state.players.opponent.hand).toHaveLength(3);
	});

	it('remaining deck has 27 cards per player (30 - 3 drawn)', () => {
		const state = initializeGameSeeded(buildOpts(SEED_A));
		expect(state.players.player.deck).toHaveLength(27);
		expect(state.players.opponent.deck).toHaveLength(27);
	});

	it('all generated instanceIds are UUID-shape strings', () => {
		const state = initializeGameSeeded(buildOpts(SEED_A));
		const uuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
		for (const card of state.players.player.hand) {
			expect(card.instanceId).toMatch(uuidShape);
		}
		for (const card of state.players.opponent.hand) {
			expect(card.instanceId).toMatch(uuidShape);
		}
	});

});
