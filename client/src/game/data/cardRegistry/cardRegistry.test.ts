import { describe, expect, it, vi } from 'vitest';
import type { GameContext } from '../../GameContext';
import type { CardData } from '../../types';
import type { Card, SpellEffect } from '../../types/CardTypes';
import executeSummon from '../../effects/handlers/spellEffect/summonHandler';
import allCards, {
	getCardById as getCardByIdFromAllCards,
	getCardsByType,
} from '../allCards';
import {
	clearRegistry,
	getAllCards as getAllCardsFromLegacyManagement,
	getCardById as getCardByIdFromLegacyManagement,
	getCardsByPredicate as getCardsByPredicateFromLegacyManagement,
	registerCard,
} from '../cardManagement/cardRegistry';
import {
	cardRegistry,
	getAllCards,
	getCardById,
	getCardsByPredicate,
} from './index';

describe('canonical card registry reads', () => {
	it('returns the canonical reference for a real card, token and miss', () => {
		const starter = cardRegistry.find(card => card.id === 100);
		const token = cardRegistry.find(card => card.id === 5034);

		expect(getCardById(100)).toBe(starter);
		expect(getCardById(5034)).toBe(token);
		expect(token?.category).toBe('token');
		expect(getCardById(-1)).toBeUndefined();
	});

	it('keeps both compatibility adapters on the same dataset and references', () => {
		const canonical = getCardById(5034);

		expect(allCards).toBe(cardRegistry);
		expect(getAllCards()).toBe(cardRegistry);
		expect(getAllCardsFromLegacyManagement()).toBe(cardRegistry);
		expect(getCardByIdFromAllCards(5034)).toBe(canonical);
		expect(getCardByIdFromLegacyManagement(5034)).toBe(canonical);
		expect(getCardsByType('minion')).toEqual(getCardsByPredicate(card => card.type === 'minion'));
		expect(getCardsByPredicateFromLegacyManagement(card => card.type === 'minion'))
			.toEqual(getCardsByPredicate(card => card.type === 'minion'));
	});

	it('does not let deprecated authoring mutations create or clear a read dataset', () => {
		const cardCount = cardRegistry.length;
		const legacyOnlyCard = {
			id: 999_999,
			name: 'Legacy-only fixture',
			type: 'minion',
			rarity: 'common',
			manaCost: 1,
			attack: 1,
			health: 1,
		} satisfies CardData;

		registerCard(legacyOnlyCard);
		clearRegistry();

		expect(getCardByIdFromLegacyManagement(legacyOnlyCard.id)).toBeUndefined();
		expect(getAllCardsFromLegacyManagement()).toBe(cardRegistry);
		expect(cardRegistry).toHaveLength(cardCount);
	});

	it('passes the canonical card reference through a legacy summon handler', () => {
		const board: Array<{ readonly card: unknown }> = [];
		const context = {
			logGameEvent: vi.fn(),
			currentPlayer: { board },
			opponentPlayer: { board: [] },
		} as unknown as GameContext;
		const effect = { summonCardId: 5034, count: 1 } as SpellEffect;
		const source = { id: 100, name: 'source' } as Card;

		const result = executeSummon(context, effect, source);

		expect(result.success).toBe(true);
		expect(board).toHaveLength(1);
		expect(board[0]?.card).toBe(getCardById(5034));
	});
});
