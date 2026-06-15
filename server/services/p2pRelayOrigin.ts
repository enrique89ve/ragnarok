export type P2PRelayOriginCheckInput = {
	readonly origin: string | undefined;
	readonly host: string | string[] | undefined;
	readonly forwardedHost?: string | string[] | undefined;
	readonly allowedOrigins?: string | undefined;
	readonly trustForwardedHost?: boolean;
	readonly production?: boolean;
};

export function readP2PRelayHeaderValues(value: string | string[] | undefined): string[] {
	if (Array.isArray(value)) return value.flatMap(part => part.split(',').map(item => item.trim()).filter(Boolean));
	if (typeof value === 'string') return value.split(',').map(item => item.trim()).filter(Boolean);
	return [];
}

export function normalizeP2PRelayOrigin(value: string): string | null {
	try {
		const url = new URL(value);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
		return `${url.protocol}//${url.host}`.toLowerCase();
	} catch {
		return null;
	}
}

export function isP2PRelayOriginAllowed(input: P2PRelayOriginCheckInput): boolean {
	if (!input.origin) return !input.production;
	const origin = normalizeP2PRelayOrigin(input.origin);
	if (!origin) return false;

	const allowedOrigins = new Set<string>();
	for (const value of (input.allowedOrigins ?? '').split(',')) {
		const normalized = normalizeP2PRelayOrigin(value.trim());
		if (normalized) allowedOrigins.add(normalized);
	}
	if (allowedOrigins.has(origin)) return true;

	const hosts = new Set<string>();
	for (const value of readP2PRelayHeaderValues(input.host)) hosts.add(value.toLowerCase());
	if (input.trustForwardedHost) {
		for (const value of readP2PRelayHeaderValues(input.forwardedHost)) hosts.add(value.toLowerCase());
	}

	const originHost = new URL(origin).host.toLowerCase();
	return hosts.has(originHost);
}
