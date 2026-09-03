import type { ManagedTransport } from '../transport/TransportManager';
import { createConnectionSupervisor } from './ConnectionSupervisor';
import { createDialCoordinator } from './DialCoordinator';
import { createReconnectQueue } from './ReconnectQueue';

const dialCoordinator = createDialCoordinator<ManagedTransport>();
const reconnectQueue = createReconnectQueue();

export const p2pConnectionSupervisor = createConnectionSupervisor<ManagedTransport>({
	dial: dialCoordinator,
	reconnect: reconnectQueue,
});

export function resetP2PConnectionSupervisor(): void {
	reconnectQueue.clear();
}
