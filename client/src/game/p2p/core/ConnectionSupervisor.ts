import type { DialCoordinator } from './DialCoordinator';
import type { ReconnectJob, ReconnectQueue } from './ReconnectQueue';

export type TransportSignal = 'OPEN' | 'CLOSE' | 'FAILED';

export type ConnectionSupervisor<T> = {
	requestDial(input: {
		readonly matchId: string;
		readonly peerId: string;
		readonly getActive: () => T | null;
		readonly actuallyDial: () => Promise<T>;
	}): Promise<T>;
	requestReconnect(job: ReconnectJob): boolean;
	reportSignal(matchId: string, peerId: string, signal: TransportSignal): void;
	isReconnecting(matchId: string, peerId: string): boolean;
	clearMatch(matchId: string, peerId: string): void;
};

/**
 * Sole owner of dial coalescing and reconnect identity.
 * Transports report OPEN/CLOSE/FAILED; they do not decide policy.
 */
export function createConnectionSupervisor<T>(input: {
	readonly dial: DialCoordinator<T>;
	readonly reconnect: ReconnectQueue;
}): ConnectionSupervisor<T> {
	return {
		requestDial(dialInput) {
			return input.dial.dial(dialInput);
		},
		requestReconnect(job) {
			return input.reconnect.enqueue(job) === 'started';
		},
		reportSignal(matchId, peerId, signal) {
			if (signal === 'OPEN' || signal === 'FAILED') {
				input.reconnect.complete(matchId, peerId);
			}
			if (signal === 'FAILED') input.dial.forget(matchId, peerId);
		},
		isReconnecting(matchId, peerId) {
			return input.reconnect.has(matchId, peerId);
		},
		clearMatch(matchId, peerId) {
			input.dial.forget(matchId, peerId);
			input.reconnect.complete(matchId, peerId);
		},
	};
}
