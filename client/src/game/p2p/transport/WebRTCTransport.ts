import { debug } from '../../config/debugConfig';
import { parseWireMessage } from '../messageSchemas';
import type { P2PMessage } from '../messages';
import {
	P2P_CONTROL_PROTOCOL_VERSION,
	P2P_CONTROL_WS_PROTOCOL,
	P2P_CONTROL_WS_PROTOCOL_PREFIX,
	parseP2PControlServerMessage,
	type P2PControlClientMessage,
} from '@shared/p2p-wire/control';
import type { P2PMatchTicket } from '@shared/p2pAvailability';
import type {
	GameTransport,
	TransportMessageListener,
	TransportState,
	TransportStateListener,
} from './transportTypes';

export type WebRTCIceServerConfig = {
	readonly urls: string | string[];
	readonly username?: string;
	readonly credential?: string;
};

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

export function buildP2PControlWebSocketUrl(options: Pick<WebRTCTransportOptions, 'controlUrl' | 'roomId' | 'peerId'>): string {
	return `${options.controlUrl}?match=${encodeURIComponent(options.roomId)}&peer=${encodeURIComponent(options.peerId)}`;
}

export function buildP2PControlWebSocketProtocols(matchTicket: P2PMatchTicket): string[] {
	return [
		P2P_CONTROL_WS_PROTOCOL,
		`${P2P_CONTROL_WS_PROTOCOL_PREFIX}${matchTicket.token}`,
	];
}

function isOpenDataChannel(channel: RTCDataChannel | null): channel is RTCDataChannel {
	return channel?.readyState === 'open';
}

function safeConnectTimeout(value: number | undefined): number {
	if (!Number.isFinite(value)) return 10_000;
	return Math.min(30_000, Math.max(1_000, Math.floor(value ?? 10_000)));
}

export function createWebRTCTransport(options: WebRTCTransportOptions): GameTransport & {
	readonly peer: string;
} {
	const messageListeners = new Set<TransportMessageListener>();
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
	const pendingIceCandidates: WebRTCIceCandidateInit[] = [];

	const setState = (next: TransportState): void => {
		if (state === next) return;
		state = next;
		for (const listener of stateListeners) {
			try { listener(next); } catch (error) { debug.error('[WebRTCTransport] state listener failed:', error); }
		}
	};

	const rejectPending = (error: Error): void => {
		const reject = rejectConnect;
		rejectConnect = null;
		resolveConnect = null;
		connectPromise = null;
		if (reject) reject(error);
	};

	const resolvePending = (): void => {
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

	const fail = (message: string): void => {
		if (closed || state === 'failed') return;
		const error = new Error(message);
		setState('failed');
		rejectPending(error);
		disposeResources();
	};

	const sendControl = (message: P2PControlClientMessage): void => {
		if (socket?.readyState !== WebSocket.OPEN) {
			fail('Control WebSocket is not open');
			return;
		}
		try { socket.send(JSON.stringify(message)); } catch { fail('Control WebSocket send failed'); }
	};

	const emitMessage = (message: P2PMessage): void => {
		for (const listener of messageListeners) {
			try { listener(message); } catch (error) { debug.error('[WebRTCTransport] message listener failed:', error); }
		}
	};

	const maybeResolveDataChannel = (): void => {
		if (!isOpenDataChannel(dataChannel) || state === 'connected') return;
		setState('connected');
		resolvePending();
		sendControl({
			type: 'transport_ready_v1',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			matchId: options.roomId,
			kind: 'webrtc',
		});
	};

	const attachDataChannel = (channel: RTCDataChannel): void => {
		if (dataChannel && dataChannel !== channel) {
			try { channel.close(); } catch { /* already closed */ }
			return;
		}
		dataChannel = channel;
		channel.onopen = maybeResolveDataChannel;
		channel.onmessage = (event: MessageEvent<unknown>) => {
			if (typeof event.data !== 'string') return;
			let parsed: unknown;
			try { parsed = JSON.parse(event.data); } catch { return; }
			const message = parseWireMessage(parsed);
			if (message) emitMessage(message);
		};
		channel.onerror = () => fail('WebRTC DataChannel error');
		channel.onclose = () => {
			if (!closed && state !== 'failed') fail('WebRTC DataChannel closed');
		};
		if (channel.readyState === 'open') maybeResolveDataChannel();
	};

	const setupPeerConnection = (): RTCPeerConnection | null => {
		if (peerConnection) return peerConnection;
		if (typeof RTCPeerConnection === 'undefined') {
			fail('WebRTC is unavailable in this browser');
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
			if (connection.connectionState === 'failed' || connection.connectionState === 'closed') fail('WebRTC peer connection failed');
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
			fail('Malformed Control WebSocket message');
			return;
		}
		if (message.type === 'control_error_v1') {
			fail(`Control WebSocket rejected: ${message.code}`);
			return;
		}
		if (message.type === 'control_peer_left_v1') {
			fail('Control peer left the match');
			return;
		}
		if (message.type === 'control_open_v1') {
			if (message.matchId !== options.roomId || message.peerId !== options.peerId || message.role !== options.matchTicket.role) {
				fail('Control WebSocket identity mismatch');
				return;
			}
			remotePeer = message.opponentPeerId;
			const connection = setupPeerConnection();
			if (connection && message.role === 'offerer') void createOffer(connection).catch(() => fail('WebRTC offer failed'));
			return;
		}
		if (message.type === 'webrtc_offer_v1') {
			if (!peerConnection) return fail('WebRTC offer arrived before control open');
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
			if (!peerConnection) return fail('WebRTC answer arrived before control open');
			await peerConnection.setRemoteDescription({ type: 'answer', sdp: message.sdp });
			remoteDescriptionSet = true;
			for (const candidate of pendingIceCandidates.splice(0)) await peerConnection.addIceCandidate(candidate);
			return;
		}
		if (message.type === 'ice_candidate_v1') {
			if (!peerConnection) return fail('ICE candidate arrived before control open');
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
		connectPromise = new Promise<void>((resolve, reject) => {
			resolveConnect = resolve;
			rejectConnect = reject;
			timeoutHandle = setTimeout(() => fail('WebRTC transport connection timed out'), safeConnectTimeout(options.connectTimeoutMs));
			const control = new WebSocket(buildP2PControlWebSocketUrl(options), buildP2PControlWebSocketProtocols(options.matchTicket));
			socket = control;
			control.onopen = () => sendControl({ type: 'control_hello_v1', protocolVersion: P2P_CONTROL_PROTOCOL_VERSION, matchId: options.roomId, peerId: options.peerId });
			control.onmessage = event => { void handleControlMessage(event.data).catch(() => fail('Control WebSocket message handling failed')); };
			control.onerror = () => fail('Control WebSocket error');
			control.onclose = () => { if (!closed && state !== 'failed') fail('Control WebSocket closed'); };
		});
		return connectPromise;
	};

	const close = (): void => {
		if (closed) return;
		closed = true;
		if (timeoutHandle) clearTimeout(timeoutHandle);
		if (state !== 'connected') rejectPending(new Error('WebRTC transport closed before connecting'));
		disposeResources();
		setState('closed');
	};

	return {
		kind: 'webrtc',
		get state(): TransportState { return state; },
		connect,
		send: (message: P2PMessage): void => {
			if (!isOpenDataChannel(dataChannel)) return;
			try { dataChannel.send(JSON.stringify(message)); } catch { fail('WebRTC DataChannel send failed'); }
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
		get peer(): string { return remotePeer; },
	};
}
