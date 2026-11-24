import { WebSocket } from 'ws';

export const P2P_MAX_PENDING_SEND_BYTES = 256 * 1024;
const MAX_WEBSOCKET_FRAME_HEADER_BYTES = 10;

type SendSocket = Pick<WebSocket, 'readyState' | 'bufferedAmount' | 'send' | 'terminate'>;
type QueueBudgetSocket = Pick<WebSocket, 'readyState' | 'bufferedAmount'>;

export function canQueueP2PFrame(socket: QueueBudgetSocket, frame: string): boolean {
	if (socket.readyState !== WebSocket.OPEN) return false;
	const frameBytes = Buffer.byteLength(frame, 'utf8') + MAX_WEBSOCKET_FRAME_HEADER_BYTES;
	return socket.bufferedAmount + frameBytes <= P2P_MAX_PENDING_SEND_BYTES;
}

export function trySendP2PFrame(
	socket: SendSocket,
	frame: string,
): 'queued' | 'closed' | 'backpressure' | 'send_failed' {
	if (socket.readyState !== WebSocket.OPEN) return 'closed';

	const frameBytes = Buffer.byteLength(frame, 'utf8') + MAX_WEBSOCKET_FRAME_HEADER_BYTES;
	if (socket.bufferedAmount + frameBytes > P2P_MAX_PENDING_SEND_BYTES) {
		// A partial protocol stream cannot safely continue on this connection.
		socket.terminate();
		return 'backpressure';
	}
	try {
		socket.send(frame);
		return 'queued';
	} catch {
		return 'send_failed';
	}
}
