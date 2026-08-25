import { describe, expect, it, vi } from 'vitest';
import { CombatPhase } from '../../types/PokerCombatTypes';
import {
	deriveSpellcraftDecision,
	getSpellcraftReadyCopy,
	shouldPrepareLocalAiSpellcraftOpponent,
	shouldTickSpellcraftClock,
	submitSpellcraftReadyIntent,
} from './spellcraftDecision';

const localDecision = {
	phase: CombatPhase.SPELL_PET,
	isActive: true,
	isMulliganActive: false,
	processMode: 'local_ai' as const,
	isTransportConnected: true,
	isPlayerReady: false,
	isOpponentReady: true,
};

describe('Spellcraft decision policy', () => {
	it('keeps the local human window open until the explicit Ready intent', () => {
		const view = deriveSpellcraftDecision(localDecision);

		expect(view).toEqual({
			status: 'deciding',
			canPlayCards: true,
			canSubmitReady: true,
		});
		expect(getSpellcraftReadyCopy(view)).toEqual({
			label: 'Ready',
			detail: 'Play any affordable cards before the clock ends, then Ready.',
		});
	});

	it('locks card play after Ready while waiting for the other side', () => {
		expect(deriveSpellcraftDecision({
			...localDecision,
			isPlayerReady: true,
			isOpponentReady: false,
		})).toEqual({
			status: 'waiting_for_opponent',
			canPlayCards: false,
			canSubmitReady: false,
		});
	});

	it('fails closed for a disconnected peer and never grants a local Ready intent implicitly', () => {
		expect(deriveSpellcraftDecision({
			...localDecision,
			processMode: 'p2p',
			isTransportConnected: false,
		})).toEqual({
			status: 'disconnected',
			canPlayCards: false,
			canSubmitReady: false,
		});

		expect(deriveSpellcraftDecision({
			...localDecision,
			processMode: 'p2p',
			isTransportConnected: true,
		})).toEqual({
			status: 'deciding',
			canPlayCards: true,
			canSubmitReady: false,
		});
	});

	it('prepares and readies only the local AI opponent once per setup window', () => {
		expect(shouldPrepareLocalAiSpellcraftOpponent({
			phase: CombatPhase.SPELL_PET,
			isActive: true,
			isMulliganActive: false,
			processMode: 'local_ai',
			setupAlreadyApplied: false,
		})).toBe(true);
		expect(shouldPrepareLocalAiSpellcraftOpponent({
			phase: CombatPhase.SPELL_PET,
			isActive: true,
			isMulliganActive: false,
			processMode: 'p2p',
			setupAlreadyApplied: false,
		})).toBe(false);
		expect(shouldPrepareLocalAiSpellcraftOpponent({
			phase: CombatPhase.SPELL_PET,
			isActive: true,
			isMulliganActive: false,
			processMode: 'local_ai',
			setupAlreadyApplied: true,
		})).toBe(false);
	});

	it('keeps the Spellcraft clock ticking until the local Ready intent', () => {
		expect(shouldTickSpellcraftClock({
			phase: CombatPhase.SPELL_PET,
			isPlayerReady: false,
		})).toBe(true);
		expect(shouldTickSpellcraftClock({
			phase: CombatPhase.SPELL_PET,
			isPlayerReady: true,
		})).toBe(false);
		expect(shouldTickSpellcraftClock({
			phase: CombatPhase.FAITH,
			isPlayerReady: false,
		})).toBe(false);
	});

	it('routes a P2P Ready through the wire handler without mutating either engine slot locally', () => {
		const sendPeerReady = vi.fn(() => ({ status: 'sent' as const }));
		const applyLocalReady = vi.fn();
		const maybeClose = vi.fn();
		expect(submitSpellcraftReadyIntent({
			processMode: 'p2p', combatId: 'combat-a', handNumber: 2, playerId: 'alice',
			sendPeerReady, applyLocalReady, maybeClose,
		})).toBe('peer_sent');
		expect(sendPeerReady).toHaveBeenCalledWith({
			combatId: 'combat-a', handNumber: 2, actorPlayerId: 'alice',
		});
		expect(applyLocalReady).not.toHaveBeenCalled();
		expect(maybeClose).not.toHaveBeenCalled();
	});

	it('keeps P2P local state untouched when the wire rejects the Ready intent', () => {
		const applyLocalReady = vi.fn();
		const maybeClose = vi.fn();
		expect(submitSpellcraftReadyIntent({
			processMode: 'p2p', combatId: 'combat-a', handNumber: 2, playerId: 'alice',
			sendPeerReady: () => ({ status: 'rejected', reason: 'state_mismatch' }),
			applyLocalReady, maybeClose,
		})).toBe('peer_rejected');
		expect(applyLocalReady).not.toHaveBeenCalled();
		expect(maybeClose).not.toHaveBeenCalled();
	});

	it('keeps the local AI Ready path direct and closes through the engine once', () => {
		const sendPeerReady = vi.fn(() => ({ status: 'sent' as const }));
		const applyLocalReady = vi.fn();
		const maybeClose = vi.fn();
		expect(submitSpellcraftReadyIntent({
			processMode: 'local_ai', combatId: 'combat-a', handNumber: 0, playerId: 'human',
			sendPeerReady, applyLocalReady, maybeClose,
		})).toBe('local_applied');
		expect(sendPeerReady).not.toHaveBeenCalled();
		expect(applyLocalReady).toHaveBeenCalledWith('human');
		expect(maybeClose).toHaveBeenCalledTimes(1);
	});
});
