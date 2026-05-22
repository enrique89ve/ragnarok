export type RateLimitDecision =
	| { readonly allowed: true }
	| { readonly allowed: false; readonly retryAfterMs: number };

export type RateLimitBucket = Map<string, readonly number[]>;

export function consumeWindowRateLimit(params: {
	readonly bucket: RateLimitBucket;
	readonly key: string;
	readonly limit: number;
	readonly windowMs: number;
	readonly now?: number;
}): RateLimitDecision {
	const now = params.now ?? Date.now();
	const windowStart = now - params.windowMs;
	const existing = params.bucket.get(params.key) ?? [];
	const fresh = existing.filter(timestamp => timestamp > windowStart);

	if (fresh.length >= params.limit) {
		const oldest = fresh[0] ?? now;
		return {
			allowed: false,
			retryAfterMs: Math.max(1, params.windowMs - (now - oldest)),
		};
	}

	params.bucket.set(params.key, [...fresh, now]);
	return { allowed: true };
}

export function clearWindowRateLimitBucket(bucket: RateLimitBucket): void {
	bucket.clear();
}
