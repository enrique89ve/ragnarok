import { describe, expect, it } from 'vitest';
import {
	createBattleSessionIdentity,
	normalizeBattleMode,
	resolveBattleHistoryHydration,
} from './battleHistoryRules';
import type { BattleHistoryEntry, BattleHistoryState } from './types';

const sampleBattle: BattleHistoryEntry = {
	id: 'battle-1',
	timestamp: 1000,
	duration: 0,
	turns: 1,
	result: 'incomplete',
	playerHero: 'Leif',
	playerHeroClass: 'Warrior',
	opponentHero: 'AI',
	opponentHeroClass: 'Mage',
	opponentType: 'ai',
	pokerHandsWon: 0,
	pokerHandsLost: 0,
	chessPiecesCaptured: 0,
	chessPiecesLost: 0,
	damageDealt: 0,
	damageReceived: 0,
	cardsPlayed: 0,
	minionsKilled: 0,
	mode: 'pve',
};

describe('createBattleSessionIdentity', () => {
	it('builds a deterministic battle id from injected time, entropy, and mode', () => {
		expect(createBattleSessionIdentity({
			mode: 'pvp',
			startedAt: 1234567890,
			randomFraction: 0.5,
		})).toEqual({
			sessionId: 'battle_1234567890_i00000_pvp',
			startedAt: 1234567890,
			mode: 'pvp',
		});
	});

	it('rejects invalid entropy instead of producing malformed ids', () => {
		expect(() => createBattleSessionIdentity({
			mode: 'pve',
			startedAt: 1234567890,
			randomFraction: 1,
		})).toThrow('[0, 1)');
	});
});

describe('normalizeBattleMode', () => {
	it('defaults missing or unknown modes to pve', () => {
		expect(normalizeBattleMode(undefined)).toBe('pve');
		expect(normalizeBattleMode('pvp')).toBe('pvp');
		expect(normalizeBattleMode('practice')).toBe('practice');
		expect(normalizeBattleMode('campaign')).toBe('campaign');
		expect(normalizeBattleMode('unknown' as never)).toBe('pve');
	});
});

describe('resolveBattleHistoryHydration', () => {
	it('hydrates persisted battles but never trusts a stale currentBattleId', () => {
		const currentState: BattleHistoryState = {
			battles: [],
			currentBattleId: 'live-battle',
		};

		expect(resolveBattleHistoryHydration({
			battles: [sampleBattle],
			currentBattleId: 'stale-battle',
		}, currentState)).toEqual({
			battles: [sampleBattle],
			currentBattleId: null,
		});
	});

	it('falls back to current battles when persisted data has the wrong shape', () => {
		const currentState: BattleHistoryState = {
			battles: [sampleBattle],
			currentBattleId: 'live-battle',
		};

		expect(resolveBattleHistoryHydration({ battles: null }, currentState)).toEqual({
			battles: [sampleBattle],
			currentBattleId: null,
		});
	});
});
