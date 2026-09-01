import { describe, expect, it } from 'vitest';
import {
	clearHiveWebSessionsForTests,
	issueHiveWebSession,
} from './hiveWebSession';
import {
	resolveTrustProxySetting,
	stableRateLimitKey,
	type TrustProxySetting,
} from './httpRateLimitPolicy';

describe('httpRateLimitPolicy', () => {
	it('keeps direct-connect mode when proxy trust is not configured', () => {
		expect(resolveTrustProxySetting({})).toBe(false);
	});

	it('accepts a bounded trusted proxy hop count', () => {
		expect(resolveTrustProxySetting({ RAGNAROK_TRUST_PROXY_HOPS: '1' })).toBe(1);
		expect(resolveTrustProxySetting({ TRUST_PROXY_HOPS: '0' })).toBe(false);
		expect(resolveTrustProxySetting({ RAGNAROK_TRUST_PROXY_HOPS: '8' })).toBe(8);
	});

	it('rejects unsafe or ambiguous proxy hop configuration', () => {
		const invalidValues = ['true', '-1', '1.5', '09', '9'];
		for (const value of invalidValues) {
			expect(() => resolveTrustProxySetting({ RAGNAROK_TRUST_PROXY_HOPS: value })).toThrow();
		}
		expect(() => resolveTrustProxySetting({
			RAGNAROK_TRUST_PROXY_HOPS: '1',
			RAGNAROK_TRUST_PROXY_CIDRS: '10.0.0.0/8',
		})).toThrow(/either trusted proxy hops or trusted proxy CIDRs/);
		expect(() => resolveTrustProxySetting({
			RAGNAROK_TRUST_PROXY_HOPS: '1',
			TRUST_PROXY_HOPS: '2',
		})).toThrow(/Conflicting reverse-proxy settings/);
	});

	it('accepts only valid IPv4 and IPv6 CIDRs', () => {
		const result: TrustProxySetting = resolveTrustProxySetting({
			RAGNAROK_TRUST_PROXY_CIDRS: ' 10.0.0.0/8, 2001:db8::/32 ',
		});
		expect(result).toEqual(['10.0.0.0/8', '2001:db8::/32']);
		expect(() => resolveTrustProxySetting({ RAGNAROK_TRUST_PROXY_CIDRS: '10.0.0.0' })).toThrow();
		expect(() => resolveTrustProxySetting({ RAGNAROK_TRUST_PROXY_CIDRS: '10.0.0.0/33' })).toThrow();
		expect(() => resolveTrustProxySetting({ RAGNAROK_TRUST_PROXY_CIDRS: '2001:db8::/129' })).toThrow();
		expect(() => resolveTrustProxySetting({ RAGNAROK_TRUST_PROXY_CIDRS: '10.0.0.0/8,,192.0.2.0/24' })).toThrow();
	});

	it('uses the validated Hive account across changing IPs', () => {
		const cookies: string[] = [];
		issueHiveWebSession({
			cookie: (name: string, value: unknown) => {
				cookies.push(`${name}=${String(value)}`);
			},
		} as never, 'Alice');
		const cookie = cookies[0];
		expect(cookie).toBeDefined();
		const keyAtHome = stableRateLimitKey({ ip: '192.0.2.10', headers: { cookie } });
		const keyBehindVpn = stableRateLimitKey({ ip: '198.51.100.42', headers: { cookie } });
		expect(keyAtHome).toBe('account:alice');
		expect(keyBehindVpn).toBe(keyAtHome);
		clearHiveWebSessionsForTests();
	});

	it('uses IPv6-aware IP fallback for anonymous requests', () => {
		expect(stableRateLimitKey({
			ip: '2001:db8:abcd:1234::1',
			headers: {},
		})).toBe(stableRateLimitKey({
			ip: '2001:db8:abcd:1234::2',
			headers: {},
		}));
		expect(stableRateLimitKey({ ip: '203.0.113.10', headers: {} })).toBe('ip:203.0.113.10');
	});
});
