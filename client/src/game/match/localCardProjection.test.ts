import { describe, expect, it } from 'vitest';
import { collectLocalWinnerCards } from './localCardProjection';
import type { GameState } from '../types';

const card = (id: number, instanceId: string, nftId?: string) => ({ instanceId, ['nft_id']: nftId, card: { id, name: `card-${id}`, manaCost: 1, type: 'minion', rarity: 'common' }, isPlayerOwned: true });

describe('local card progression authority', () => {
	it('uses account-bound starter UIDs and known NFT history only', () => {
		const gameState = { players: { player: { battlefield: [card(100, 'instance-not-uid'), card(2, 'nft-instance', 'nft-known'), card(3, 'nft-unknown', 'nft-unknown')], graveyard: [], hand: [] } } } as unknown as GameState;
		const result = collectLocalWinnerCards(gameState, 'alice', [{ updateId: 'old', uid: 'starter-100', ownerAccount: 'alice', cardId: 100, xp: 40, level: 1, eventId: 'e', timestamp: 1, sequence: '1:e' }, { updateId: 'old-nft', uid: 'nft-known', ownerAccount: 'alice', cardId: 2, xp: 20, level: 1, eventId: 'e', timestamp: 1, sequence: '1:e' }]);
		expect(result).toEqual(expect.arrayContaining([
			expect.objectContaining({ uid: 'starter-100', xpBefore: 40 }),
			expect.objectContaining({ uid: 'nft-known', xpBefore: 20 }),
		]));
		expect(result.some(cardInput => cardInput.uid === 'nft-unknown')).toBe(false);
	});
});
