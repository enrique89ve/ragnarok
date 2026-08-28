export type StunTelemetrySnapshot = Readonly<{
	stunRequestsTotal: number;
	stunInvalidTotal: number;
	stunDroppedTotal: number;
	stunRateLimitedTotal: number;
	stunErrorsTotal: number;
}>;

export function createStunTelemetry() {
	const counters = {
		stunRequestsTotal: 0,
		stunInvalidTotal: 0,
		stunDroppedTotal: 0,
		stunRateLimitedTotal: 0,
		stunErrorsTotal: 0,
	};

	return {
		request: (): void => { counters.stunRequestsTotal += 1; },
		invalid: (): void => { counters.stunInvalidTotal += 1; },
		dropped: (): void => { counters.stunDroppedTotal += 1; },
		rateLimited: (): void => { counters.stunRateLimitedTotal += 1; },
		error: (): void => { counters.stunErrorsTotal += 1; },
		stats: (): StunTelemetrySnapshot => ({ ...counters }),
	};
}
