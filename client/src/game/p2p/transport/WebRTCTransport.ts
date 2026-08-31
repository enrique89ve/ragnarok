import { debug } from '../../config/debugConfig';
import { parseWireMessage } from '../messageSchemas';
import type { P2PMessage } from '../messages';
import {
	P2P_CONTROL_PROTOCOL_VERSION,
	parseP2PControlServerMessage,
	type P2PControlClientMessage,
	type P2PControlServerMessage,
	type P2PTransportFallbackReason,
} from '@shared/p2p-wire/control';
import type { P2PIceServerConfig } from '@shared/p2p-wire/transportConfig';
import type { P2PMatchTicket } from '@shared/p2pAvailability';
import type {
	GameTransport,
	TransportMessageListener,
	TransportStatsSnapshot,
	TransportState,
	TransportStateListener,
} from './transportTypes';
import { createTransportFailure } from './transportTypes';
import {
	buildP2PControlWebSocketProtocols,
	buildP2PControlWebSocketUrl,
} from './P2PControlChannel';
export {
	buildP2PControlWebSocketProtocols,
	buildP2PControlWebSocketUrl,
} from './P2PControlChannel';

export type WebRTCIceServerConfig = P2PIceServerConfig;

type WebRTCIceCandidateInit = {
	readonly candidate: string;
	readonly sdpMid?: string | null;
	readonly sdpMLineIndex?: number | null;
};

export type WebRTCTransportOptions = {
	readonly controlUrl: string;
	readonly roomId: string;
	readonly peerId: string;
	readonly matchTicket: P2PMatchTicket;
	readonly iceServers?: readonly WebRTCIceServerConfig[];
	readonly connectTimeoutMs?: number;
};

export type WebRTCControlState = 'idle' | 'connecting' | 'connected' | 'degraded' | 'closed';

/** Hard cap shared with the relay so every transport rejects oversized frames. */
export const MAX_P2P_FRAME_BYTES = 16 * 1024;
const MAX_DATA_CHANNEL_BUFFERED_BYTES = 256 * 1024;

function isOpenDataChannel(channel: RTCDataChannel | null): channel is RTCDataChannel {
	return channel?.readyState === 'open';
}

function safeConnectTimeout(value: number | undefined): number {
	if (!Number.isFinite(value)) return 10_000;
	return Math.min(30_000, Math.max(1_000, Math.floor(value ?? 10_000)));
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Readonly<Record<string, unknown>>, key: string): string | null {
	const value = record[key];
	return typeof value === 'string' && value.length > 0 ? value.toLowerCase() : null;
}

function readFiniteNumber(record: Readonly<Record<string, unknown>>, key: string): number | null {
	const value = record[key];
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function createWebRTCTransport(options: WebRTCTransportOptions): GameTransport & {
	readonly peer: string;
	readonly controlState: WebRTCControlState;
	readonly sendControlMessage: (message: P2PControlClientMessage) => void;
	readonly onControlMessage: (listener: (message: P2PControlServerMessage) => void) => () => void;
	readonly getStats: () => Promise<TransportStatsSnapshot | null>;
} {
	const messageListeners = new Set<TransportMessageListener>();
	const controlMessageListeners = new Set<(message: P2PControlServerMessage) => void>();
	const stateListeners = new Set<TransportStateListener>();
	let state: TransportState = 'idle';
	let socket: WebSocket | null = null;
	let peerConnection: RTCPeerConnection | null = null;
	let dataChannel: RTCDataChannel | null = null;
	let connectPromise: Promise<void> | null = null;
	let resolveConnect: (() => void) | null = null;
	let rejectConnect: ((error: Error) => void) | null = null;
	let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
	let remotePeer = '';
	let closed = false;
	let remoteDescriptionSet = false;
	let controlState: WebRTCControlState = 'idle';
	let fallbackSent = false;
	let connectStartedAtMs: number | null = null;
	let connectedAtMs: number | null = null;
	const pendingIceCandidates: WebRTCIceCandidateInit[] = [];

	const setState = (next: TransportState): void => {
		if (state === next) return;
		state = next;
		for (const listener of stateListeners) {
			try { listener(next); } catch (error) { debug.error('[WebRTCTransport] state listener failed:', error); }
		}
	};

	const clearConnectTimeout = (): void => {
		if (!timeoutHandle) return;
		clearTimeout(timeoutHandle);
		timeoutHandle = null;
	};

	const rejectPending = (error: Error): void => {
		clearConnectTimeout();
		const reject = rejectConnect;
		rejectConnect = null;
		resolveConnect = null;
		connectPromise = null;
		if (reject) reject(error);
	};

	const resolvePending = (): void => {
		clearConnectTimeout();
		const resolve = resolveConnect;
		rejectConnect = null;
		resolveConnect = null;
		connectPromise = null;
		if (resolve) resolve();
	};

	const disposeResources = (): void => {
		try { dataChannel?.close(); } catch { /* already closed */ }
		try { peerConnection?.close(); } catch { /* already closed */ }
		try { socket?.close(); } catch { /* already closed */ }
	};

	const sendFallback = (reason: P2PTransportFallbackReason): void => {
		if (fallbackSent || socket?.readyState !== WebSocket.OPEN) return;
		fallbackSent = true;
		try {
			socket.send(JSON.stringify({
				type: 'transport_fallback_v1',
				protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
				matchId: options.roomId,
				reason,
			}));
		} catch { /* the control socket is already closing */ }
	};

	const fail = (
		failure: Error | string,
		reason?: P2PTransportFallbackReason,
		notifyPeer = true,
	): void => {
		if (closed || state === 'failed') return;
		if (state !== 'connected' && notifyPeer && reason) sendFallback(reason);
		const error = typeof failure === 'string'
			? createTransportFailure(failure, reason)
			: reason
				? createTransportFailure(failure.message, reason)
				: failure;
		controlState = 'closed';
		setState('failed');
		rejectPending(error);
		disposeResources();
	};

	const failControl = (message: string, reason: P2PTransportFallbackReason = 'ice_failed'): void => {
		if (state === 'connected') {
			debug.warn(`[WebRTCTransport] ${message}; restarting the authenticated control and gameplay session`);
			fail(message, reason, false);
			return;
		}
		fail(message, reason);
	};

	const sendControl = (message: P2PControlClientMessage): void => {
		if (socket?.readyState !== WebSocket.OPEN) {
			failControl('Control WebSocket is not open');
			return;
		}
		try { socket.send(JSON.stringify(message)); }
		catch {
			failControl('Control WebSocket send failed');
		}
	};

	const sendTransportReady = (): void => {
		if (socket?.readyState !== WebSocket.OPEN) {
			const error = createTransportFailure('Control WebSocket is not open', 'ice_failed');
			failControl(error.message, 'ice_failed');
			throw error;
		}
		try {
			socket.send(JSON.stringify({
				type: 'transport_ready_v1',
				protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
				matchId: options.roomId,
				kind: 'webrtc',
			}));
		} catch (error) {
			const failure = error instanceof Error
				? error
				: createTransportFailure('Control WebSocket send failed', 'ice_failed');
			failControl(failure.message, 'ice_failed');
			throw failure;
		}
	};

	const emitMessage = (message: P2PMessage): void => {
		for (const listener of messageListeners) {
			try { listener(message); } catch (error) { debug.error('[WebRTCTransport] message listener failed:', error); }
		}
	};

	const emitControlMessage = (message: P2PControlServerMessage): void => {
		for (const listener of controlMessageListeners) {
			try { listener(message); } catch (error) { debug.error('[WebRTCTransport] control message listener failed:', error); }
		}
	};

	const maybeResolveDataChannel = (): void => {
		if (!isOpenDataChannel(dataChannel) || state === 'connected') return;
		try {
			// The transport is not connected until the authenticated control
			// plane has accepted this readiness announcement. This keeps the
			// manager from exposing a gameplay-open state with no referee signal.
			sendTransportReady();
		} catch {
			return;
		}
		connectedAtMs = Date.now();
		setState('connected');
		resolvePending();
	};

	const getStats = async (): Promise<TransportStatsSnapshot | null> => {
		const connection = peerConnection;
		if (!connection) return null;
		const collectedAtMs = Date.now();
		const base: TransportStatsSnapshot = {
			collectedAtMs,
			connectDurationMs: connectStartedAtMs === null
				? null
				: (connectedAtMs ?? collectedAtMs) - connectStartedAtMs,
			connectionState: connection.connectionState || null,
			iceConnectionState: connection.iceConnectionState || null,
			iceGatheringState: connection.iceGatheringState || null,
			signalingState: connection.signalingState || null,
			candidatePair: null,
		};
		if (typeof connection.getStats !== 'function') return base;

		try {
			const report = await connection.getStats();
			const records: Readonly<Record<string, unknown>>[] = [];
			report.forEach(value => {
				if (isRecord(value)) records.push(value);
			});
			const localCandidates = new Map<string, Readonly<Record<string, unknown>>>();
			const remoteCandidates = new Map<string, Readonly<Record<string, unknown>>>();
			let selectedPair: Readonly<Record<string, unknown>> | null = null;
			let succeededPair: Readonly<Record<string, unknown>> | null = null;
			for (const record of records) {
				const type = readString(record, 'type');
				const id = record.id;
				if (typeof id === 'string') {
					if (type === 'local-candidate') localCandidates.set(id, record);
					if (type === 'remote-candidate') remoteCandidates.set(id, record);
				}
				if (type !== 'candidate-pair' || readString(record, 'state') !== 'succeeded') continue;
				if (!succeededPair) succeededPair = record;
				if (record.selected === true || record.nominated === true) selectedPair = record;
			}
			const pair = selectedPair ?? succeededPair;
			if (!pair) return base;
			const localId = pair.localCandidateId;
			const remoteId = pair.remoteCandidateId;
			const local = typeof localId === 'string' ? localCandidates.get(localId) : undefined;
			const remote = typeof remoteId === 'string' ? remoteCandidates.get(remoteId) : undefined;
			return {
				...base,
				candidatePair: {
					localCandidateType: local ? readString(local, 'candidateType') : null,
					remoteCandidateType: remote ? readString(remote, 'candidateType') : null,
					protocol: readString(pair, 'protocol') ?? (local ? readString(local, 'protocol') : null),
					currentRoundTripTimeMs: (() => {
						const seconds = readFiniteNumber(pair, 'currentRoundTripTime');
						return seconds === null ? null : seconds * 1000;
					})(),
					bytesSent: readFiniteNumber(pair, 'bytesSent'),
					bytesReceived: readFiniteNumber(pair, 'bytesReceived'),
				},
			};
		} catch (error) {
			debug.warn('[WebRTCTransport] getStats failed:', error);
			return base;
		}
	};

	const attachDataChannel = (channel: RTCDataChannel): void => {
		const activeChannel = channel;
		if (dataChannel && dataChannel !== activeChannel) {
			try { activeChannel.close(); } catch { /* already closed */ }
			return;
		}
		dataChannel = activeChannel;
		activeChannel.onopen = maybeResolveDataChannel;
		activeChannel.onmessage = (event: MessageEvent<unknown>) => {
			if (typeof event.data !== 'string') return;
			if (new TextEncoder().encode(event.data).byteLength > MAX_P2P_FRAME_BYTES) {
				debug.warn('[WebRTCTransport] dropped oversized DataChannel frame');
				return;
			}
			let parsed: unknown;
			try { parsed = JSON.parse(event.data); } catch { return; }
			const message = parseWireMessage(parsed);
			if (message) emitMessage(message);
		};
		activeChannel.onerror = () => fail('WebRTC DataChannel error', 'data_channel_failed');
		activeChannel.onclose = () => {
			if (!closed && state !== 'failed') fail('WebRTC DataChannel closed', 'data_channel_failed');
		};
		if (activeChannel.readyState === 'open') maybeResolveDataChannel();
	};

	const setupPeerConnection = (): RTCPeerConnection | null => {
		if (peerConnection) return peerConnection;
		if (typeof RTCPeerConnection === 'undefined') {
			fail('WebRTC is unavailable in this browser', 'unsupported');
			return null;
		}
		const connection = new RTCPeerConnection({ iceServers: [...(options.iceServers ?? [])] });
		peerConnection = connection;
		connection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
			const candidate = event.candidate;
			if (!candidate) return;
			sendControl({
				type: 'ice_candidate_v1',
				protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
				matchId: options.roomId,
				candidate: candidate.candidate,
				sdpMid: candidate.sdpMid,
				sdpMLineIndex: candidate.sdpMLineIndex,
			});
		};
		connection.ondatachannel = (event: RTCDataChannelEvent) => attachDataChannel(event.channel);
		connection.onconnectionstatechange = () => {
			if (connection.connectionState === 'failed' || connection.connectionState === 'closed') fail('WebRTC peer connection failed', 'ice_failed');
		};
		return connection;
	};

	const createOffer = async (connection: RTCPeerConnection): Promise<void> => {
		attachDataChannel(connection.createDataChannel('ragnarok-game', { ordered: true }));
		const offer = await connection.createOffer();
		await connection.setLocalDescription(offer);
		if (connection.localDescription?.type !== 'offer' || !connection.localDescription.sdp) throw new Error('WebRTC offer missing SDP');
		sendControl({
			type: 'webrtc_offer_v1',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			matchId: options.roomId,
			sdp: connection.localDescription.sdp,
		});
	};

	const handleControlMessage = async (input: unknown): Promise<void> => {
		const message = parseP2PControlServerMessage(input);
		if (!message) {
			failControl('Malformed Control WebSocket message');
			return;
		}
		if (message.type === 'control_error_v1') {
			failControl(`Control WebSocket rejected: ${message.code}`);
			return;
		}
		if (message.type === 'phase_checkpoint_commit_v1'
			|| message.type === 'phase_checkpoint_dispute_v1'
			|| message.type === 'poker_turn_notary_commit_v1'
			|| message.type === 'poker_turn_notary_dispute_v1'
			|| message.type === 'poker_action_time_gate_v1') {
			emitControlMessage(message);
			return;
		}
		if (message.type === 'transport_fallback_v1') {
			if (state !== 'connected') fail('Opponent selected relay transport', message.reason, false);
			return;
		}
		if (message.type === 'transport_ready_v1') return;
		if (message.type === 'control_peer_left_v1') {
			if (state === 'connected') {
				failControl('Opponent control connection lost');
				return;
			}
			fail('Control peer left before WebRTC connection completed');
			return;
		}
		if (message.type === 'control_open_v1') {
			if (message.matchId !== options.roomId || message.peerId !== options.peerId || message.role !== options.matchTicket.role) {
				failControl('Control WebSocket identity mismatch');
				return;
			}
			controlState = 'connected';
			remotePeer = message.opponentPeerId;
			const connection = setupPeerConnection();
			if (connection && message.role === 'offerer') void createOffer(connection).catch(() => failControl('WebRTC offer failed'));
			return;
		}
		if (message.type === 'webrtc_offer_v1') {
			if (!peerConnection) return failControl('WebRTC offer arrived before control open');
			await peerConnection.setRemoteDescription({ type: 'offer', sdp: message.sdp });
			remoteDescriptionSet = true;
			for (const candidate of pendingIceCandidates.splice(0)) await peerConnection.addIceCandidate(candidate);
			const answer = await peerConnection.createAnswer();
			await peerConnection.setLocalDescription(answer);
			if (peerConnection.localDescription?.type !== 'answer' || !peerConnection.localDescription.sdp) throw new Error('WebRTC answer missing SDP');
			sendControl({ type: 'webrtc_answer_v1', protocolVersion: P2P_CONTROL_PROTOCOL_VERSION, matchId: options.roomId, sdp: peerConnection.localDescription.sdp });
			return;
		}
		if (message.type === 'webrtc_answer_v1') {
			if (!peerConnection) return failControl('WebRTC answer arrived before control open');
			await peerConnection.setRemoteDescription({ type: 'answer', sdp: message.sdp });
			remoteDescriptionSet = true;
			for (const candidate of pendingIceCandidates.splice(0)) await peerConnection.addIceCandidate(candidate);
			return;
		}
		if (message.type === 'ice_candidate_v1') {
			if (!peerConnection) return failControl('ICE candidate arrived before control open');
			const candidate = { candidate: message.candidate, sdpMid: message.sdpMid, sdpMLineIndex: message.sdpMLineIndex } satisfies WebRTCIceCandidateInit;
			if (remoteDescriptionSet) await peerConnection.addIceCandidate(candidate);
			else pendingIceCandidates.push(candidate);
		}
	};

	const connect = (): Promise<void> => {
		if (state === 'connected') return Promise.resolve();
		if (connectPromise) return connectPromise;
		if (closed) return Promise.reject(new Error('WebRTC transport is closed'));
		if (options.matchTicket.role !== 'offerer' && options.matchTicket.role !== 'answerer') return Promise.reject(new Error('WebRTC transport requires a signed transport role'));
		if (typeof WebSocket === 'undefined') return Promise.reject(new Error('WebSocket is unavailable in this browser'));
		setState('connecting');
		controlState = 'connecting';
		connectStartedAtMs = Date.now();
		connectedAtMs = null;
		connectPromise = new Promise<void>((resolve, reject) => {
			resolveConnect = resolve;
			rejectConnect = reject;
			timeoutHandle = setTimeout(() => fail('WebRTC transport connection timed out', 'timeout'), safeConnectTimeout(options.connectTimeoutMs));
			const control = new WebSocket(buildP2PControlWebSocketUrl(options), buildP2PControlWebSocketProtocols(options.matchTicket));
			socket = control;
			control.onopen = () => sendControl({ type: 'control_hello_v1', protocolVersion: P2P_CONTROL_PROTOCOL_VERSION, matchId: options.roomId, peerId: options.peerId });
			control.onmessage = event => {
				let payload: unknown = event.data;
				if (typeof payload === 'string') {
					try { payload = JSON.parse(payload); }
					catch {
						failControl('Malformed Control WebSocket JSON');
						return;
					}
				}
				void handleControlMessage(payload).catch(() => {
					failControl('Control WebSocket message handling failed');
				});
			};
			control.onerror = () => {
				failControl('Control WebSocket error');
			};
			control.onclose = () => {
				if (closed) return;
				failControl('Control WebSocket closed');
			};
		});
		return connectPromise;
	};

	const close = (): void => {
		if (closed) return;
		closed = true;
		controlState = 'closed';
		if (state !== 'connected') rejectPending(new Error('WebRTC transport closed before connecting'));
		disposeResources();
		setState('closed');
	};

	return {
		kind: 'webrtc',
		get state(): TransportState { return state; },
		get controlState(): WebRTCControlState { return controlState; },
		connect,
		send: (message: P2PMessage): void => {
			if (!isOpenDataChannel(dataChannel)) throw new Error('WebRTC DataChannel is not open');
			const payload = JSON.stringify(message);
			const payloadBytes = new TextEncoder().encode(payload).byteLength;
			if (payloadBytes > MAX_P2P_FRAME_BYTES) {
				throw new Error('WebRTC DataChannel payload exceeds the 16KB frame limit');
			}
			if ((dataChannel.bufferedAmount ?? 0) > MAX_DATA_CHANNEL_BUFFERED_BYTES) {
				throw new Error('WebRTC DataChannel backpressure limit reached');
			}
			try { dataChannel.send(payload); }
			catch (error) {
				const sendError = error instanceof Error ? error : new Error('WebRTC DataChannel send failed');
				fail(sendError, 'data_channel_failed');
				throw sendError;
			}
		},
		onMessage: (listener: TransportMessageListener): (() => void) => {
			messageListeners.add(listener);
			return () => messageListeners.delete(listener);
		},
		onStateChange: (listener: TransportStateListener): (() => void) => {
			stateListeners.add(listener);
			return () => stateListeners.delete(listener);
		},
		close,
		sendControlMessage: sendControl,
		onControlMessage: (listener): (() => void) => {
			controlMessageListeners.add(listener);
			return () => controlMessageListeners.delete(listener);
		},
		getStats,
		get peer(): string { return remotePeer; },
	};
}
