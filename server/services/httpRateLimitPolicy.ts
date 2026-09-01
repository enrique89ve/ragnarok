import { isIP } from 'node:net';
import rateLimit, { ipKeyGenerator, type Options } from 'express-rate-limit';
import type { Request, RequestHandler } from 'express';
import { getHiveWebSessionUsernameFromCookie } from './hiveWebSession';

/**
 * Express trust-proxy values accepted by proxy-addr/Express.
 *
 * `true` is deliberately not part of this type. A permissive trust setting
 * would let a client forge X-Forwarded-For and bypass IP-based limits.
 */
export type TrustProxySetting = false | number | string[];

const MAX_TRUSTED_PROXY_HOPS = 8;
const IPV6_RATE_LIMIT_SUBNET = 56;

function configuredValue(env: NodeJS.ProcessEnv, names: readonly string[]): string | undefined {

	const values = names
		.map(name => ({ name, value: env[name]?.trim() }))
		.filter((entry): entry is { readonly name: string; readonly value: string } => Boolean(entry.value));
	if (values.length === 0) return undefined;
	const first = values[0];
	if (!first) return undefined;
	if (values.some(entry => entry.value !== first.value)) {
		throw new Error(`Conflicting reverse-proxy settings: ${names.join(' and ')}`);
	}
	return first.value;
}

function parseProxyHops(raw: string): TrustProxySetting {
	if (!/^(?:0|[1-9][0-9]*)$/.test(raw)) {
		throw new Error('RAGNAROK_TRUST_PROXY_HOPS must be a non-negative integer');
	}
	const hops = Number(raw);
	if (!Number.isSafeInteger(hops) || hops > MAX_TRUSTED_PROXY_HOPS) {
		throw new Error(`RAGNAROK_TRUST_PROXY_HOPS must be between 0 and ${MAX_TRUSTED_PROXY_HOPS}`);
	}
	return hops === 0 ? false : hops;
}

function isValidCidr(value: string): boolean {
	const separator = value.lastIndexOf('/');
	if (separator <= 0 || separator === value.length - 1 || value.indexOf('/', separator + 1) !== -1) return false;
	const address = value.slice(0, separator);
	const prefix = value.slice(separator + 1);
	const addressFamily = isIP(address);
	if (addressFamily === 0 || !/^(?:0|[1-9][0-9]*)$/.test(prefix)) return false;
	const prefixLength = Number(prefix);
	const maxPrefixLength = addressFamily === 4 ? 32 : 128;
	return Number.isSafeInteger(prefixLength) && prefixLength <= maxPrefixLength;
}

/**
 * Parse the only supported reverse-proxy configuration forms:
 *
 * - `RAGNAROK_TRUST_PROXY_HOPS` (or `TRUST_PROXY_HOPS`) for a fixed, known
 *   number of proxies;
 * - `RAGNAROK_TRUST_PROXY_CIDRS` (or `TRUST_PROXY_CIDRS`) for explicit proxy
 *   networks.
 *
 * If neither is set, Express remains direct-connect safe (`false`). The
 * caller must never silently fall back to `true`.
 */
export function resolveTrustProxySetting(env: NodeJS.ProcessEnv = process.env): TrustProxySetting {
	const rawHops = configuredValue(env, ['RAGNAROK_TRUST_PROXY_HOPS', 'TRUST_PROXY_HOPS']);
	const rawCidrs = configuredValue(env, ['RAGNAROK_TRUST_PROXY_CIDRS', 'TRUST_PROXY_CIDRS']);
	if (rawHops && rawCidrs) {
		throw new Error('Configure either trusted proxy hops or trusted proxy CIDRs, not both');
	}
	if (rawHops) return parseProxyHops(rawHops);
	if (!rawCidrs) return false;

	const cidrs = rawCidrs.split(',').map(value => value.trim());
	if (cidrs.length === 0 || cidrs.some(value => !value || !isValidCidr(value))) {
		throw new Error('RAGNAROK_TRUST_PROXY_CIDRS must be a comma-separated list of valid IPv4/IPv6 CIDRs');
	}
	return cidrs;
}

type RateLimitRequest = Pick<Request, 'ip' | 'headers'>;

function requestCookieHeader(request: RateLimitRequest): string | undefined {
	const cookie = request.headers.cookie;
	return typeof cookie === 'string' ? cookie : undefined;
}

/**
 * Use a validated Hive web session as the stable principal for API limiting.
 * Anonymous requests intentionally fall back to an IPv6-aware IP key. The IP
 * is a transport/rate-limit signal only and is never used in P2P identity.
 */
export function stableRateLimitKey(request: RateLimitRequest): string {
	const username = getHiveWebSessionUsernameFromCookie(requestCookieHeader(request));
	if (username) return `account:${username}`;

	const ip = typeof request.ip === 'string' ? request.ip.trim() : '';
	if (!ip || isIP(ip) === 0) return 'ip:invalid';
	return `ip:${ipKeyGenerator(ip, IPV6_RATE_LIMIT_SUBNET)}`;
}

/**
 * Every HTTP limiter uses the same authenticated-principal/IP key policy.
 * Keeping construction in one function prevents a newly added limiter from
 * accidentally reverting to the default proxy-sensitive key generator.
 */
export function createRateLimiter(
	options: Omit<Partial<Options>, 'keyGenerator' | 'ipv6Subnet'>,
): RequestHandler {
	return rateLimit({
		...options,
		keyGenerator: stableRateLimitKey,
	});
}
