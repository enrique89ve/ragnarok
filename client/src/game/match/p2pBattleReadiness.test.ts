import { describe, expect, it } from 'vitest';

import type { P2PMatchTicket } from '@shared/p2pAvailability';
import type { ArmySelection } from '../types/ChessTypes';
import { computeP2PBattleReadiness, type P2PBattleReadinessInput } from './p2pBattleReadiness';
import type { P2PBattleReadyProof } from '../p2p/battleReady';

const army: ArmySelection = {
	king: { id: 'king', name: 'King', heroClass: 'warrior', description: '' },
	queen: { id: 'queen', name: 'Queen', heroClass: 'warrior', description: '' },
	rook: { id: 'rook', name: 'Rook', heroClass: 'warrior', description: '' },
	bishop: { id: 'bishop', name: 'Bishop', heroClass: 'warrior', description: '' },
	knight: { id: 'knight', name: 'Knight', heroClass: 'warrior', description: '' },
};

function proof(overrides: Partial<P2PBattleReadyProof> = {}): P2PBattleReadyProof {
	return {
		matchId: 'match-1',
		engineHash: 'engine-v1',
		rulesetHash: 'rules-v1',
		loadoutHash: 'loadout-a',
		initialStateRoot: 'root-v1',
		...overrides,
	};
}

function ticket(overrides: Partial<P2PMatchTicket> = {}): P2PMatchTicket {
	return {
		token: 'ticket-token',
		roomId: 'match-1',
		peerId: 'peer-a',
		expiresAt: 2_000,
		scope: 'matchmaking',
		...overrides,
	};
}

function baseInput(overrides: Partial<P2PBattleReadinessInput> = {}): P2PBattleReadinessInput {
	return {
		activeMatchKind: 'peer',
		serverMatchCommitted: true,
		localAcceptanceVerified: true,
		remoteAcceptanceVerified: true,
		matchTicket: ticket(),
		expectedRoomId: 'match-1',
		expectedPeerId: 'peer-a',
		connectionState: 'connected',
		remotePeerId: 'peer-b',
		matchId: 'match-1',
		matchSeed: 'seed-1',
		opponentArmy: army,
		p2pInitApplied: true,
		expectedRemoteLoadoutHash: 'loadout-b',
		localBattleReady: proof(),
		remoteBattleReady: proof({ loadoutHash: 'loadout-b' }),
		now: 1_000,
		...overrides,
	};
}

describe('computeP2PBattleReadiness', () => {
	it('opens the committed match only after both acceptances and proofs agree', () => {
		expect(computeP2PBattleReadiness(baseInput())).toEqual({ ready: true });
	});

	it('keeps the game closed while the opponent acceptance is missing', () => {
		const result = computeP2PBattleReadiness(baseInput({ remoteAcceptanceVerified: false }));

		expect(result).toEqual({ ready: false, reason: 'Opponent match acceptance is not verified' });
	});

	it('rejects a stale or misbound matchmaking ticket', () => {
		expect(computeP2PBattleReadiness(baseInput({ matchTicket: ticket({ roomId: 'other-room' }) }))).toEqual({
			ready: false,
			reason: 'Relay ticket does not match this room',
		});
		expect(computeP2PBattleReadiness(baseInput({ matchTicket: ticket({ expiresAt: 1_000 }) }))).toEqual({
			ready: false,
			reason: 'Relay ticket has expired',
		});
	});

	it('rejects divergent engine or initial-state proofs before mounting the coordinator', () => {
		expect(computeP2PBattleReadiness(baseInput({
			remoteBattleReady: proof({ engineHash: 'engine-v2', loadoutHash: 'loadout-b' }),
		}))).toEqual({ ready: false, reason: 'Game engine mismatch' });
		expect(computeP2PBattleReadiness(baseInput({
			remoteBattleReady: proof({ initialStateRoot: 'root-v2', loadoutHash: 'loadout-b' }),
		}))).toEqual({ ready: false, reason: 'Initial state root mismatch' });
	});

	it('rejects a BattleReady loadout claim that differs from the announced opponent deck', () => {
		expect(computeP2PBattleReadiness(baseInput({
		remoteBattleReady: proof({ loadoutHash: 'forged-loadout' }),
	}))).toEqual({
		ready: false,
		reason: 'Opponent loadout proof does not match the announced loadout',
	});
	});

	it('does not open while the opponent loadout commitment is still unavailable', () => {
		expect(computeP2PBattleReadiness(baseInput({ expectedRemoteLoadoutHash: null }))).toEqual({
		ready: false,
		reason: 'Opponent loadout commitment is not available',
	});
	});

	it('keeps direct challenge compatibility without weakening the bilateral BattleReady gate', () => {
		const result = computeP2PBattleReadiness(baseInput({
			serverMatchCommitted: false,
			localAcceptanceVerified: false,
			remoteAcceptanceVerified: false,
			matchTicket: null,
			expectedRoomId: null,
			expectedPeerId: null,
		}));

		expect(result).toEqual({ ready: true });
		expect(computeP2PBattleReadiness(baseInput({
			serverMatchCommitted: false,
			localAcceptanceVerified: false,
			remoteAcceptanceVerified: false,
			matchTicket: null,
			expectedRoomId: null,
			expectedPeerId: null,
			remoteBattleReady: null,
		}))).toEqual({ ready: false, reason: 'Opponent battle-ready proof is not complete' });
	});
});
