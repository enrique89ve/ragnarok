export type StunRateLimitConfig = {
	readonly perIpBurst: number;
	readonly perIpPerSecond: number;
	readonly globalPacketCeiling: number;
	readonly globalWindowMs: number;
};

export type StunRateLimitDecision =
	| { readonly allowed: true }
	| { readonly allowed: false; readonly reason: 'per_ip' | 'global' };

type IpBucket = { tokens: number; updatedAt: number };

export function createStunRateLimiter(config: StunRateLimitConfig) {
	const buckets = new Map<string, IpBucket>();
	let globalWindowStartedAt: number | null = null;
	let globalPackets = 0;

	return {
		consume(ip: string, now = Date.now()): StunRateLimitDecision {
			if (globalWindowStartedAt === null || now - globalWindowStartedAt >= config.globalWindowMs) {
				globalWindowStartedAt = now;
				globalPackets = 0;
			}
			globalPackets += 1;
			if (globalPackets > config.globalPacketCeiling) return { allowed: false, reason: 'global' };

			const previous = buckets.get(ip) ?? { tokens: config.perIpBurst, updatedAt: now };
			const elapsedSeconds = Math.max(0, now - previous.updatedAt) / 1_000;
			const tokens = Math.min(config.perIpBurst, previous.tokens + elapsedSeconds * config.perIpPerSecond);
			if (tokens < 1) {
				buckets.set(ip, { tokens, updatedAt: now });
				return { allowed: false, reason: 'per_ip' };
			}
			buckets.set(ip, { tokens: tokens - 1, updatedAt: now });
			if (buckets.size > 10_000) {
				for (const [key, bucket] of buckets) {
					if (now - bucket.updatedAt > 60_000) buckets.delete(key);
				}
			}
			return { allowed: true };
		},
	};
}
