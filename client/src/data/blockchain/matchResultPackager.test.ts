import { describe, expect, it, vi } from 'vitest';
import type { HiveCardAsset } from '../schemas/HiveTypes';
import type { MatchPackagerInput } from './types';
import { packageMatchResult } from './matchResultPackager';
import type { CardData, CardInstance, GameState, Player } from '../../game/types';

vi.mock('./replayDB', () => ({
	getPlayerNonce: vi.fn(async () => ({ highestMatchNonce: 0 })),
	advancePlayerNonce: vi.fn(async () => undefined),
}));

function makeCard(id: number): CardData {
	return {
		id,
		name: `Card ${id}`,
		type: 'minion',
		rarity: 'common',
		category: 'genesis',
		attack: 1,
		health: 1,
	};
}

function makeNftInstance(uid: string, cardId: number): CardInstance {
	return {
		instanceId: uid,
		nft_id: uid,
		card: makeCard(cardId),
	};
}

function makePlayer(id: 'player' | 'opponent', battlefield: CardInstance[]): Player {
	return {
		id,
		name: id,
		hand: [],
		battlefield,
		deck: [],
		graveyard: [],
		secrets: [],
		mana: { current: 0, max: 0, overloaded: 0, pendingOverload: 0 },
		health: 30,
		maxHealth: 30,
		heroClass: 'Warrior',
		heroPower: { name: 'Hero Power', cost: 2, used: false },
		cardsPlayedThisTurn: 0,
		attacksPerformedThisTurn: 0,
	};
}

function makeGameState(winner: 'player' | 'opponent'): GameState {
	return {
		players: {
			player: makePlayer('player', []),
			opponent: makePlayer('opponent', [makeNftInstance('opponent-nft-1', 20001)]),
		},
		currentTurn: 'player',
		turnNumber: 4,
		gamePhase: 'game_over',
		winner,
		gameLog: [],
	};
}

function makeInput(): MatchPackagerInput {
	return {
		matchId: 'match-1',
		matchType: 'ranked',
		playerUsername: 'alice',
		opponentUsername: 'bob',
		playerHeroId: 'odin',
		opponentHeroId: 'thor',
		startTime: Date.now() - 1_000,
		seed: 'seed-1',
		playerCardUids: [],
		opponentCardUids: [{ uid: 'opponent-nft-1', cardId: 20001, source: 'nft' }],
		playerEloBefore: 1000,
		opponentEloBefore: 1000,
	};
}

function makeCollection(): HiveCardAsset[] {
	return [{
		uid: 'opponent-nft-1',
		cardId: 20001,
		ownerId: 'bob',
		ownershipSource: 'nft',
		edition: 'alpha',
		foil: 'standard',
		rarity: 'common',
		level: 1,
		xp: 0,
		name: 'Opponent NFT',
		type: 'minion',
	}];
}

describe('packageMatchResult', () => {
	it('rewards the actual winning NFT cards even when the local player used no cards', async () => {
		const result = await packageMatchResult(
			makeGameState('opponent'),
			makeInput(),
			makeCollection(),
			new Map([[20001, 'common']]),
		);

		expect(result.xpRewards).toEqual([
			{
				cardUid: 'opponent-nft-1',
				cardId: 20001,
				source: 'nft',
				xpBefore: 0,
				xpGained: 10,
				xpAfter: 10,
				levelBefore: 1,
				levelAfter: 1,
				didLevelUp: false,
			},
		]);
	});
});
