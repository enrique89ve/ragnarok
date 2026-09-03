export const RAGNAROK_LOGICAL_PROTOCOLS = [
	'control/2',
	'gameplay/2',
	'integrity/1',
	'heartbeat/1',
	'resume/1',
] as const;

export type RagnarokLogicalProtocol = typeof RAGNAROK_LOGICAL_PROTOCOLS[number];

const CONTROL_TYPES = new Set([
	'control_hello_v1',
	'control_open_v1',
	'control_peer_left_v1',
	'control_error_v1',
	'webrtc_offer_v1',
	'webrtc_answer_v1',
	'ice_candidate_v1',
	'transport_ready_v1',
	'transport_fallback_v1',
	'transport_committed_v1',
	'transport_reset_v2',
	'p2p_leave',
]);

const INTEGRITY_TYPES = new Set([
	'hash_check',
	'hash_mismatch',
	'poker_hash_check',
	'wasm_hash_check',
	'version_check',
	'transition_receipt_v1',
	'phase_checkpoint_propose_v1',
	'phase_checkpoint_commit_v1',
	'phase_checkpoint_dispute_v1',
	'battle_ready_v1',
]);

const HEARTBEAT_TYPES = new Set(['ping', 'pong', 'heartbeat']);

const RESUME_TYPES = new Set([
	'session_authorize',
	'session_renewal',
	'session_resumed',
	'state_sync_request',
]);

export function classifyLogicalProtocol(messageType: string): RagnarokLogicalProtocol {
	if (CONTROL_TYPES.has(messageType)) return 'control/2';
	if (INTEGRITY_TYPES.has(messageType)) return 'integrity/1';
	if (HEARTBEAT_TYPES.has(messageType)) return 'heartbeat/1';
	if (RESUME_TYPES.has(messageType)) return 'resume/1';
	return 'gameplay/2';
}

export function mayDropProtocolSilently(protocol: RagnarokLogicalProtocol): boolean {
	return protocol === 'heartbeat/1';
}
