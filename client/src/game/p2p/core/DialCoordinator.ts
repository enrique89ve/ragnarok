export type DialKey = `${string}:${string}`;

export function makeDialKey(matchId: string, peerId: string): DialKey {
	return `${matchId}:${peerId}`;
}

export type DialCoordinator<T> = {
	dial(input: {
		readonly matchId: string;
		readonly peerId: string;
		readonly getActive: () => T | null;
		readonly actuallyDial: () => Promise<T>;
	}): Promise<T>;
	hasPending(matchId: string, peerId: string): boolean;
	forget(matchId: string, peerId: string): void;
};

export function createDialCoordinator<T>(): DialCoordinator<T> {
	const pendingDials = new Map<DialKey, Promise<T>>();

	return {
		async dial(input) {
			const key = makeDialKey(input.matchId, input.peerId);
			const existing = input.getActive();
			if (existing) return existing;
			const pending = pendingDials.get(key);
			if (pending) return pending;
			const dial = input.actuallyDial();
			pendingDials.set(key, dial);
			try {
				return await dial;
			} finally {
				pendingDials.delete(key);
			}
		},
		hasPending(matchId, peerId) {
			return pendingDials.has(makeDialKey(matchId, peerId));
		},
		forget(matchId, peerId) {
			pendingDials.delete(makeDialKey(matchId, peerId));
		},
	};
}
