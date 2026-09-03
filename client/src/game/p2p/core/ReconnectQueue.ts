import { makeDialKey, type DialKey } from './DialCoordinator';

export type ReconnectJob = Readonly<{
	readonly matchId: string;
	readonly peerId: string;
	readonly generation: number;
	readonly attempts: number;
	readonly deadlineAt: number;
}>;

export type ReconnectEnqueueResult = 'started' | 'joined';

export type ReconnectQueue = {
	enqueue(job: ReconnectJob): ReconnectEnqueueResult;
	has(matchId: string, peerId: string): boolean;
	get(matchId: string, peerId: string): ReconnectJob | null;
	complete(matchId: string, peerId: string): void;
	clear(): void;
};

export function createReconnectQueue(): ReconnectQueue {
	const jobs = new Map<DialKey, ReconnectJob>();

	return {
		enqueue(job) {
			const key = makeDialKey(job.matchId, job.peerId);
			if (jobs.has(key)) return 'joined';
			jobs.set(key, job);
			return 'started';
		},
		has(matchId, peerId) {
			return jobs.has(makeDialKey(matchId, peerId));
		},
		get(matchId, peerId) {
			return jobs.get(makeDialKey(matchId, peerId)) ?? null;
		},
		complete(matchId, peerId) {
			jobs.delete(makeDialKey(matchId, peerId));
		},
		clear() {
			jobs.clear();
		},
	};
}
