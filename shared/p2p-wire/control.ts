import { z } from 'zod';

import {
	P2P_MATCH_TICKET_WS_PROTOCOL_PREFIX,
	type P2PTransportRole,
} from '../p2pAvailability';
import {
	PhaseCheckpointCommitSchema,
	PhaseCheckpointDisputeSchema,
	PhaseCheckpointProposalSchema,
} from './phaseCheckpoint';
import { CompactPokerActionSchema } from './combat';
import { ActionAppliedSchema } from './delivery';
import {
	PokerTurnClockProposalSchema,
	PokerTurnNotaryCommitSchema,
	PokerTurnNotaryDisputeSchema,
	PokerActionTimeGateAckSchema,
} from './pokerTimeNotary';
import {
	PokerEntryApprovalStateSchema,
	PokerEntryOpenSchema,
	PokerEntryReadySchema,
} from './pokerEntryApproval';

export const P2P_CONTROL_WS_PROTOCOL = 'ragnarok-p2p-control-v1';
export const P2P_CONTROL_WS_PROTOCOL_PREFIX = `${P2P_MATCH_TICKET_WS_PROTOCOL_PREFIX}control.`;
export const P2P_CONTROL_PROTOCOL_VERSION = 2 as const;
export const P2P_CONTROL_MAX_PAYLOAD_BYTES = 16 * 1024;
export const INITIAL_TRANSPORT_EPOCH = 1 as const;

const MatchIdSchema = z.string().min(1).max(256);
const PeerIdSchema = z.string().min(1).max(64);
const SdpSchema = z.string().min(1).max(12 * 1024);
const IceCandidateSchema = z.string().min(1).max(4 * 1024);
const SdpMidSchema = z.string().min(1).max(256);
const TransportEpochSchema = z.number().int().min(1).max(0xffff_ffff);

const ControlHelloSchema = z.object({
	type: z.literal('control_hello_v1'),
	protocolVersion: z.literal(P2P_CONTROL_PROTOCOL_VERSION),
	matchId: MatchIdSchema,
	peerId: PeerIdSchema,
}).strict();

const WebRtcOfferSchema = z.object({
	type: z.literal('webrtc_offer_v1'),
	protocolVersion: z.literal(P2P_CONTROL_PROTOCOL_VERSION),
	matchId: MatchIdSchema,
	transportEpoch: TransportEpochSchema,
	sdp: SdpSchema,
}).strict();

const WebRtcAnswerSchema = z.object({
	type: z.literal('webrtc_answer_v1'),
	protocolVersion: z.literal(P2P_CONTROL_PROTOCOL_VERSION),
	matchId: MatchIdSchema,
	transportEpoch: TransportEpochSchema,
	sdp: SdpSchema,
}).strict();

const IceCandidateSchemaEnvelope = z.object({
	type: z.literal('ice_candidate_v1'),
	protocolVersion: z.literal(P2P_CONTROL_PROTOCOL_VERSION),
	matchId: MatchIdSchema,
	transportEpoch: TransportEpochSchema,
	candidate: IceCandidateSchema,
	sdpMid: SdpMidSchema.nullable().optional(),
	sdpMLineIndex: z.number().int().min(0).max(1024).nullable().optional(),
}).strict();

const TransportKindSchema = z.enum(['webrtc', 'websocket-relay']);

export const P2P_TRANSPORT_FALLBACK_REASONS = [
	'unsupported',
	'timeout',
	'ice_failed',
	'data_channel_failed',
	'manual',
] as const;
export type P2PTransportFallbackReason = typeof P2P_TRANSPORT_FALLBACK_REASONS[number];

export const P2P_TRANSPORT_RESET_REASONS = [
	'peer_reconnected',
	'transport_failed',
	'server_recovery',
] as const;
export type P2PTransportResetReason = typeof P2P_TRANSPORT_RESET_REASONS[number];

const TransportReadySchema = z.object({
	type: z.literal('transport_ready_v1'),
	protocolVersion: z.literal(P2P_CONTROL_PROTOCOL_VERSION),
	matchId: MatchIdSchema,
	transportEpoch: TransportEpochSchema,
	kind: TransportKindSchema,
}).strict();

const TransportFallbackSchema = z.object({
	type: z.literal('transport_fallback_v1'),
	protocolVersion: z.literal(P2P_CONTROL_PROTOCOL_VERSION),
	matchId: MatchIdSchema,
	transportEpoch: TransportEpochSchema,
	reason: z.enum(P2P_TRANSPORT_FALLBACK_REASONS),
}).strict();

// A single `transport_ready_v1` is only a local advertisement.  Gameplay may
// open after both peers have selected the same transport and the control plane
// has emitted this bilateral commitment.  Keeping this as a server-only
// envelope prevents either peer from forging a commitment for the other.
const TransportCommittedSchema = z.object({
	type: z.literal('transport_committed_v1'),
	protocolVersion: z.literal(P2P_CONTROL_PROTOCOL_VERSION),
	matchId: MatchIdSchema,
	transportEpoch: TransportEpochSchema,
	kind: TransportKindSchema,
}).strict();

const TransportResetSchema = z.object({
	type: z.literal('transport_reset_v2'),
	protocolVersion: z.literal(P2P_CONTROL_PROTOCOL_VERSION),
	matchId: MatchIdSchema,
	transportEpoch: TransportEpochSchema,
	reason: z.enum(P2P_TRANSPORT_RESET_REASONS),
	opponentPeerId: PeerIdSchema,
}).strict();

const PokerActionControlSchema = z.object({
	type: z.literal('poker_action_time_gate_v1'),
	protocolVersion: z.literal(P2P_CONTROL_PROTOCOL_VERSION),
	matchId: MatchIdSchema,
	playerId: z.string().min(1).max(128),
	action: z.enum(['attack', 'counter', 'engage', 'brace', 'defend']),
	origin: z.enum(['player', 'timeout']),
	hpCommitment: z.number().int().min(0).max(500).optional(),
	compact: CompactPokerActionSchema.optional(),
	turnId: z.string().min(1).max(256),
	decisionId: z.string().min(1).max(256),
	seq: z.number().int().nonnegative().optional(),
	prevStateHash: z.string().min(1).max(256).optional(),
	signerPubkey: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional(),
	signature: z.string().regex(/^[A-Za-z0-9_-]{86}$/).optional(),
	sentAtMs: z.number().int().nonnegative().optional(),
}).strict();

export const P2PControlClientMessageSchema = z.discriminatedUnion('type', [
	ControlHelloSchema,
	WebRtcOfferSchema,
	WebRtcAnswerSchema,
	IceCandidateSchemaEnvelope,
	TransportReadySchema,
	TransportFallbackSchema,
	PokerActionControlSchema,
	PokerEntryOpenSchema,
	PokerEntryReadySchema,
	ActionAppliedSchema,
	// Referee proposals use the same authenticated Control WS as signaling.
	// They never enter the gameplay DataChannel.
	PhaseCheckpointProposalSchema,
	PokerTurnClockProposalSchema,
]);

export type P2PControlClientMessage = z.infer<typeof P2PControlClientMessageSchema>;

const ControlOpenSchema = z.object({
	type: z.literal('control_open_v1'),
	protocolVersion: z.literal(P2P_CONTROL_PROTOCOL_VERSION),
	matchId: MatchIdSchema,
	peerId: PeerIdSchema,
	opponentPeerId: PeerIdSchema,
	role: z.enum(['offerer', 'answerer']),
	transportEpoch: TransportEpochSchema,
}).strict();

const ControlPeerLeftSchema = z.object({
	type: z.literal('control_peer_left_v1'),
	protocolVersion: z.literal(P2P_CONTROL_PROTOCOL_VERSION),
	matchId: MatchIdSchema,
	opponentPeerId: PeerIdSchema,
}).strict();

const ControlErrorSchema = z.object({
	type: z.literal('control_error_v1'),
	protocolVersion: z.literal(P2P_CONTROL_PROTOCOL_VERSION),
	code: z.enum(['protocol', 'match_mismatch', 'role_required', 'role_conflict', 'rate_limited']),
}).strict();

export const P2PControlServerMessageSchema = z.discriminatedUnion('type', [
	ControlOpenSchema,
	ControlPeerLeftSchema,
	ControlErrorSchema,
	TransportResetSchema,
	WebRtcOfferSchema,
	WebRtcAnswerSchema,
	IceCandidateSchemaEnvelope,
	TransportReadySchema,
	TransportFallbackSchema,
	TransportCommittedSchema,
	PokerActionControlSchema,
	ActionAppliedSchema,
	PhaseCheckpointCommitSchema,
	PhaseCheckpointDisputeSchema,
	PokerTurnNotaryCommitSchema,
	PokerTurnNotaryDisputeSchema,
	PokerActionTimeGateAckSchema,
	PokerEntryApprovalStateSchema,
]);

export function readControlTransportEpoch(message: unknown): number | null {
	if (typeof message !== 'object' || message === null || !('transportEpoch' in message)) return null;
	const transportEpoch = message.transportEpoch;
	return typeof transportEpoch === 'number' && Number.isInteger(transportEpoch) && transportEpoch >= 1
		? transportEpoch
		: null;
}

export type P2PControlServerMessage = z.infer<typeof P2PControlServerMessageSchema>;

export function parseP2PControlClientMessage(input: unknown): P2PControlClientMessage | null {
	const parsed = P2PControlClientMessageSchema.safeParse(input);
	return parsed.success ? parsed.data : null;
}

export function parseP2PControlServerMessage(input: unknown): P2PControlServerMessage | null {
	const parsed = P2PControlServerMessageSchema.safeParse(input);
	return parsed.success ? parsed.data : null;
}

export function isP2PTransportRole(value: unknown): value is P2PTransportRole {
	return value === 'offerer' || value === 'answerer';
}
