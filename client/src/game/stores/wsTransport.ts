/**
 * wsTransport.ts — server-mediated transport that mimics the subset of
 * `peerjs` DataConnection consumed by `useP2PSync` and `peerStore`.
 *
 * Why: the WebRTC + STUN/TURN/PeerJS-broker stack proved unreliable across
 * environments (Chrome internal DNS broken under WSL2, NAT hairpinning
 * absent on same-machine peers, public TURN credentials revoked). This
 * relay-via-WS approach trades direct P2P for guaranteed connectivity by
 * routing all messages through the game's own Express server (`/ws/p2p`).
 *
 * Compatibility surface — must keep these stable for the WebRTC upgrade
 * path to swap transports later without touching `useP2PSync`:
 *   .on(event, listener), .off(event, listener)  for 'data'|'open'|'close'|'error'
 *   .send(data)
 *   .close()
 *   .peer    → remote peer id (string)
 *   .open    → boolean, true once both peers are present in the room
 *
 * The runtime cast in `peerStore.ts` is `as unknown as DataConnection`,
 * which is sound as long as the consumed surface above stays a subset.
 */

import { debug } from '../config/debugConfig';

type TransportEvent = 'data' | 'open' | 'close' | 'error';
type Listener = (...args: unknown[]) => void;

interface OpenPayload {
	readonly isHost: boolean;
	readonly remotePeerId: string;
}

export interface LocalWebSocketTransportOptions {
	readonly url: string;       // e.g. 'ws://localhost:5000/ws/p2p'
	readonly roomId: string;
	readonly peerId: string;
}

export class LocalWebSocketTransport {
	private ws: WebSocket | null = null;
	private listeners: Map<TransportEvent, Set<Listener>> = new Map();
	private _open = false;
	private _remotePeer = '';
	private _isHost = false;
	private _closed = false;

	constructor(private readonly options: LocalWebSocketTransportOptions) {}

	/** Open the WS connection and wait for the server's `__sys event=open`. */
	connect(): void {
		const wsUrl = `${this.options.url}?room=${encodeURIComponent(this.options.roomId)}&peer=${encodeURIComponent(this.options.peerId)}`;
		debug.log(`[WSTransport] connecting to ${wsUrl.replace(/peer=[^&]+/, 'peer=…')}`);

		const ws = new WebSocket(wsUrl);
		this.ws = ws;

		ws.onmessage = (ev: MessageEvent) => this.handleMessage(ev);
		ws.onerror = () => this.emit('error', new Error('WebSocket error'));
		ws.onclose = (ev: CloseEvent) => {
			debug.log(`[WSTransport] closed code=${ev.code} reason=${ev.reason || 'n/a'}`);
			if (this._open && !this._closed) this.emit('close');
			this._open = false;
			this._closed = true;
		};
	}

	/** Returns the remote peer id once the room is full; empty string before. */
	get peer(): string { return this._remotePeer; }
	get open(): boolean { return this._open; }
	get isHostHint(): boolean { return this._isHost; }

	on(event: TransportEvent, listener: Listener): void {
		let bucket = this.listeners.get(event);
		if (!bucket) { bucket = new Set(); this.listeners.set(event, bucket); }
		bucket.add(listener);
	}

	off(event: TransportEvent, listener: Listener): void {
		this.listeners.get(event)?.delete(listener);
	}

	send(data: unknown): void {
		const ws = this.ws;
		if (!ws || ws.readyState !== WebSocket.OPEN) return;
		try {
			ws.send(JSON.stringify(data));
		} catch (err) {
			debug.warn('[WSTransport] send failed:', err);
		}
	}

	close(): void {
		this._closed = true;
		this._open = false;
		try { this.ws?.close(); } catch { /* already closed */ }
		this.ws = null;
	}

	private handleMessage(ev: MessageEvent): void {
		const raw = ev.data;
		if (typeof raw !== 'string') {
			debug.warn('[WSTransport] received non-string frame, dropping');
			return;
		}

		let parsed: unknown;
		try { parsed = JSON.parse(raw); }
		catch (err) {
			debug.warn('[WSTransport] failed to parse incoming JSON:', err);
			return;
		}

		if (!parsed || typeof parsed !== 'object') return;
		const msg = parsed as { type?: unknown };

		if (msg.type === '__sys') {
			this.handleSys(msg as { type: '__sys'; event?: unknown; isHost?: unknown; remotePeerId?: unknown; reason?: unknown });
			return;
		}

		// Application payload — forward verbatim. `useP2PSync` expects to see
		// the same object shape it would have received via DataConnection.
		this.emit('data', parsed);
	}

	private handleSys(msg: {
		readonly type: '__sys';
		readonly event?: unknown;
		readonly isHost?: unknown;
		readonly remotePeerId?: unknown;
		readonly reason?: unknown;
	}): void {
		switch (msg.event) {
			case 'open': {
				if (this._open) return; // dedupe accidental re-opens
				if (typeof msg.remotePeerId !== 'string') {
					this.emit('error', new Error('open without remotePeerId'));
					return;
				}
				this._isHost = !!msg.isHost;
				this._remotePeer = msg.remotePeerId;
				this._open = true;
				debug.log(`[WSTransport] open isHost=${this._isHost} remotePeerId=${this._remotePeer.slice(0, 8)}…`);
				const payload: OpenPayload = { isHost: this._isHost, remotePeerId: this._remotePeer };
				this.emit('open', payload);
				return;
			}
			case 'close':
				if (this._open) {
					this._open = false;
					this.emit('close');
				}
				return;
			case 'error': {
				const reason = typeof msg.reason === 'string' ? msg.reason : 'unknown';
				debug.warn(`[WSTransport] server error: ${reason}`);
				this.emit('error', new Error(reason));
				return;
			}
			default:
				debug.warn('[WSTransport] unknown __sys event:', msg.event);
		}
	}

	private emit(event: TransportEvent, ...args: unknown[]): void {
		const bucket = this.listeners.get(event);
		if (!bucket) return;
		for (const listener of bucket) {
			try { listener(...args); }
			catch (err) { debug.error(`[WSTransport] listener for '${event}' threw:`, err); }
		}
	}
}

/** Build the WS URL from the current page origin. */
export function deriveRelayUrl(): string {
	if (typeof window === 'undefined') {
		throw new Error('deriveRelayUrl requires a browser environment');
	}
	const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
	return `${proto}//${window.location.host}/ws/p2p`;
}
