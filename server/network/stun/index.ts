import { readStunConfig } from './stunConfig';
import { createStunService, type StunService } from './stunServer';

export { readStunConfig } from './stunConfig';
export { createStunRateLimiter } from './stunRateLimit';
export { createStunService, type StunHealth, type StunService } from './stunServer';
export type { StunConfig } from './stunConfig';
export type { StunTelemetrySnapshot } from './stunTelemetry';

let service: StunService | null = null;

export function getStunService(): StunService {
	if (!service) service = createStunService(readStunConfig());
	return service;
}
