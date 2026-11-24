import { describe, expect, it } from 'vitest';
import {
	createInitialPokerSpellState,
	resolvePokerSpellEffect,
} from './pokerSpellUtils';
import {
	createSeededIdGen,
	seededRngFromString,
	withDeterministicIdGen,
	withDeterministicRng,
} from '../seededRng';
import { createCardInstance } from '../cards/cardTypeAdapter';
import type { PokerSpellCard } from '../../types/CardTypes';
import type { PokerCard } from '../../types/PokerCombatTypes';

const HOLE_CARDS_A: PokerCard[] = [
	{ suit: 'spades', value: 'A', numericValue: 14 },
	{ suit: 'hearts', value: 'K', numericValue: 13 },
];

const HOLE_CARDS_B: PokerCard[] = [
	{ suit: 'diamonds', value: 'Q', numericValue: 12 },
	{ suit: 'clubs', value: 'J', numericValue: 11 },
];

function makeSpell(effectType: 'fate_peek' | 'hole_swap'): PokerSpellCard {
	return {
		id: effectType === 'fate_peek' ? 90001 : 90002,
		name: effectType,
		manaCost: 1,
		description: 'test spell',
		type: 'poker_spell',
		rarity: 'common',
		pokerSpellEffect: {
			effectType,
			timing: 'pre_deal',
		},
	};
}

describe('poker spell and card instance determinism', () => {
	it('resolves hole_swap to identical canonical indices from both attacker and defender perspectives', () => {
		const seed = 'poker-spell:combat-1:0:PRE_FLOP:attacker:90002:0:0';
		const spell = makeSpell('hole_swap');

		const attackerView = withDeterministicRng(
			seededRngFromString(seed),
			() => resolvePokerSpellEffect(spell, 'player', createInitialPokerSpellState(), {
				playerHoleCards: HOLE_CARDS_A,
				opponentHoleCards: HOLE_CARDS_B,
				deck: [],
				canonicalPlayerRole: 'attacker',
			}),
		);

		const defenderView = withDeterministicRng(
			seededRngFromString(seed),
			() => resolvePokerSpellEffect(spell, 'opponent', createInitialPokerSpellState(), {
				playerHoleCards: HOLE_CARDS_B,
				opponentHoleCards: HOLE_CARDS_A,
				deck: [],
				canonicalPlayerRole: 'defender',
			}),
		);

		const attackerSwap = attackerView.immediateEffects?.[0]?.data as {
			playerCardIndex: number;
			opponentCardIndex: number;
		};
		const defenderSwap = defenderView.immediateEffects?.[0]?.data as {
			playerCardIndex: number;
			opponentCardIndex: number;
		};

		expect(attackerSwap.playerCardIndex).toBe(defenderSwap.opponentCardIndex);
		expect(attackerSwap.opponentCardIndex).toBe(defenderSwap.playerCardIndex);
	});

	it('resolves fate_peek deterministically across both peers for the same seed', () => {
		const seed = 'poker-spell:combat-1:0:PRE_FLOP:attacker:90001:0:0';
		const spell = makeSpell('fate_peek');

		const attackerView = withDeterministicRng(
			seededRngFromString(seed),
			() => resolvePokerSpellEffect(spell, 'player', createInitialPokerSpellState(), {
				playerHoleCards: HOLE_CARDS_A,
				opponentHoleCards: HOLE_CARDS_B,
				deck: [],
				canonicalPlayerRole: 'attacker',
			}),
		);

		const defenderView = withDeterministicRng(
			seededRngFromString(seed),
			() => resolvePokerSpellEffect(spell, 'opponent', createInitialPokerSpellState(), {
				playerHoleCards: HOLE_CARDS_B,
				opponentHoleCards: HOLE_CARDS_A,
				deck: [],
				canonicalPlayerRole: 'defender',
			}),
		);

		expect(attackerView.stateChanges.revealedOpponentCards).toEqual(
			defenderView.stateChanges.revealedPlayerCards,
		);
	});

	it('creates deterministic card instanceIds under withDeterministicIdGen', () => {
		const card = {
			id: 1001,
			name: 'Test Minion',
			manaCost: 2,
			type: 'minion' as const,
			rarity: 'common' as const,
			attack: 2,
			health: 3,
		};

		const peerA = withDeterministicIdGen(
			createSeededIdGen('deadbeef01234567', 'cmd-1'),
			() => createCardInstance(card).instanceId,
		);
		const peerB = withDeterministicIdGen(
			createSeededIdGen('deadbeef01234567', 'cmd-1'),
			() => createCardInstance(card).instanceId,
		);

		expect(peerA).toBe(peerB);
		expect(peerA).toMatch(/^instance-1001-/);
	});
});
