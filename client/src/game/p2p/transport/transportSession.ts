import type { TransportKind } from './transportTypes';

export type TransportSessionSnapshot = Readonly<{
	matchId: string;
	attemptId: number;
	initialTransport: TransportKind | null;
	currentTransport: TransportKind | null;
	relayLocked: boolean;
}>;

export type TransportSession = Readonly<{
	beginAttempt: () => number;
	getSnapshot: () => TransportSessionSnapshot;
	isCurrent: (attemptId: number) => boolean;
	selectTransport: (attemptId: number, kind: TransportKind) => boolean;
	lockRelay: (attemptId: number) => boolean;
}>;

export function createTransportSession(matchId: string): TransportSession {
	let attemptId = 0;
	let initialTransport: TransportKind | null = null;
	let currentTransport: TransportKind | null = null;
	let relayLocked = false;

	return {
		beginAttempt: (): number => {
			attemptId += 1;
			return attemptId;
		},
		getSnapshot: (): TransportSessionSnapshot => ({
			matchId,
			attemptId,
			initialTransport,
			currentTransport,
			relayLocked,
		}),
		isCurrent: candidate => candidate === attemptId,
		selectTransport: (candidate, kind): boolean => {
			if (candidate !== attemptId) return false;
			if (initialTransport === null) initialTransport = kind;
			currentTransport = kind;
			return true;
		},
		lockRelay: candidate => {
			if (candidate !== attemptId) return false;
			relayLocked = true;
			return true;
		},
	};
}
