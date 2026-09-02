import { describe, expect, it } from 'vitest';

import {
	P2P_CONTROL_MAX_PAYLOAD_BYTES,
	parseP2PControlClientMessage,
	parseP2PControlServerMessage,
} from './control';

describe('P2P control wire contract', () => {
	it('accepts bounded signaling and transport control messages', () => {
		expect(parseP2PControlClientMessage({
			type: 'control_hello_v1',
			protocolVersion: 2,
			matchId: 'match-1',
			peerId: 'peer-a',
		})).toMatchObject({ type: 'control_hello_v1', peerId: 'peer-a' });
		expect(parseP2PControlClientMessage({
			type: 'ice_candidate_v1',
			protocolVersion: 2,
			matchId: 'match-1',
			transportEpoch: 1,
			candidate: 'candidate:1 1 UDP 123 127.0.0.1 12345 typ host',
			sdpMid: '0',
			sdpMLineIndex: 0,
		})).not.toBeNull();
		expect(parseP2PControlServerMessage({
			type: 'control_open_v1',
			protocolVersion: 2,
			matchId: 'match-1',
			peerId: 'peer-a',
			opponentPeerId: 'peer-b',
			role: 'offerer',
			transportEpoch: 1,
		})).not.toBeNull();
		expect(parseP2PControlClientMessage({
			type: 'phase_checkpoint_propose_v1',
			protocolVersion: 1,
			scope: 'round-boundary',
			matchId: 'match-1',
			epoch: 1,
			fromPhase: 'chess',
			toPhase: 'poker_combat',
			previousCheckpointId: '0'.repeat(64),
			stateRoot: '1'.repeat(64),
		})).toMatchObject({ type: 'phase_checkpoint_propose_v1' });
		expect(parseP2PControlClientMessage({
			type: 'poker_turn_started',
			combatId: 'combat-1',
			turnId: 'combat-1:pre_flop:player:0',
			phase: 'pre_flop',
			activePlayerId: 'player',
			actionsThisRound: 0,
			durationMs: 60_000,
			sentAtMs: 1,
		})).toMatchObject({ type: 'poker_turn_started' });
		expect(parseP2PControlClientMessage({
			type: 'poker_action_time_gate_v1',
			protocolVersion: 2,
			matchId: 'match-1',
			playerId: 'player',
			action: 'defend',
			origin: 'player',
			turnId: 'combat-1:pre_flop:player:0',
			decisionId: 'decision-1',
		})).toMatchObject({ type: 'poker_action_time_gate_v1' });
		expect(parseP2PControlServerMessage({
			type: 'poker_action_time_gate_ack_v1',
			protocolVersion: 1,
			matchId: 'match-1',
			turnId: 'combat-1:pre_flop:player:0',
			decisionId: 'decision-1',
			seq: 0,
			allowed: true,
		})).toMatchObject({ type: 'poker_action_time_gate_ack_v1', allowed: true });
		expect(parseP2PControlServerMessage({
			type: 'transport_committed_v1',
			protocolVersion: 2,
			matchId: 'match-1',
			transportEpoch: 1,
			kind: 'websocket-relay',
		})).toMatchObject({ type: 'transport_committed_v1', kind: 'websocket-relay' });
		expect(parseP2PControlClientMessage({
			type: 'transport_committed_v1',
			protocolVersion: 2,
			matchId: 'match-1',
			transportEpoch: 1,
			kind: 'websocket-relay',
		})).toBeNull();
		expect(parseP2PControlClientMessage({
			type: 'action_applied_v1',
			protocolVersion: 1,
			matchId: 'match-1',
			transportEpoch: 2,
			decisionId: 'decision-1',
			seq: 3,
			resultingStateHash: 'a'.repeat(64),
		})).toMatchObject({ type: 'action_applied_v1', seq: 3 });
		expect(parseP2PControlServerMessage({
			type: 'transport_reset_v2',
			protocolVersion: 2,
			matchId: 'match-1',
			transportEpoch: 2,
			reason: 'peer_reconnected',
			opponentPeerId: 'peer-a',
		})).toMatchObject({ type: 'transport_reset_v2', transportEpoch: 2 });
	});

	it('rejects unknown fields, wrong versions, invalid roles, and oversized SDP', () => {
		expect(parseP2PControlClientMessage({
			type: 'control_hello_v1', protocolVersion: 1, matchId: 'match-1', peerId: 'peer-a',
		})).toBeNull();
		expect(parseP2PControlClientMessage({
			type: 'control_hello_v1', protocolVersion: 2, matchId: 'match-1', peerId: 'peer-a', username: 'mallory',
		})).toBeNull();
		expect(parseP2PControlServerMessage({
			type: 'control_open_v1', protocolVersion: 2, matchId: 'match-1', peerId: 'peer-a', opponentPeerId: 'peer-b', role: 'host', transportEpoch: 1,
		})).toBeNull();
		expect(parseP2PControlClientMessage({
			type: 'webrtc_offer_v1', protocolVersion: 2, matchId: 'match-1', transportEpoch: 1, sdp: 'x'.repeat(12 * 1024 + 1),
		})).toBeNull();
		expect(parseP2PControlClientMessage({
			type: 'poker_turn_started',
			combatId: 'combat-1',
			turnId: 'wrong-turn-id',
			phase: 'pre_flop',
			activePlayerId: 'player',
			actionsThisRound: 0,
			durationMs: 60_000,
			sentAtMs: 1,
			unexpected: true,
		})).toBeNull();
		expect(parseP2PControlServerMessage({
			type: 'phase_checkpoint_commit_v1',
			protocolVersion: 1,
			scope: 'round-boundary',
			roomId: 'match-1',
			matchId: 'match-1',
			epoch: 1,
			fromPhase: 'chess',
			toPhase: 'poker_combat',
			previousCheckpointId: '0'.repeat(64),
			stateRoot: '1'.repeat(64),
			checkpointId: '2'.repeat(64),
		})).toMatchObject({ type: 'phase_checkpoint_commit_v1' });
		expect(P2P_CONTROL_MAX_PAYLOAD_BYTES).toBe(16 * 1024);
	});
});
