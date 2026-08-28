import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { normalizeHiveUsername } from '../../shared/p2pAvailability';

export const HIVE_WEB_SESSION_COOKIE = 'ragnarok-hive-session';
export const HIVE_WEB_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

type HiveWebSession = {
	readonly username: string;
	expiresAt: number;
	lastSeenAt: number;
};

const sessions = new Map<string, HiveWebSession>();

function getCookieValue(cookieHeader: string | undefined, name: string): string | null {
	if (!cookieHeader) return null;
	for (const rawPart of cookieHeader.split(';')) {
		const part = rawPart.trim();
		const separator = part.indexOf('=');
		if (separator <= 0 || part.slice(0, separator) !== name) continue;
		return part.slice(separator + 1);
	}
	return null;
}

export function getHiveWebSessionUsernameFromCookie(cookieHeader: string | undefined): string | null {
	const token = getCookieValue(cookieHeader, HIVE_WEB_SESSION_COOKIE);
	if (!token) return null;
	const now = Date.now();
	pruneExpiredSessions(now);
	const session = sessions.get(token);
	if (!session || session.expiresAt <= now) return null;
	session.lastSeenAt = now;
	session.expiresAt = now + HIVE_WEB_SESSION_TTL_MS;
	return session.username;
}

function pruneExpiredSessions(now: number): void {
	for (const [token, session] of sessions.entries()) {
		if (session.expiresAt <= now) sessions.delete(token);
	}
}

export function getHiveWebSessionUsername(req: Request): string | null {
	return getHiveWebSessionUsernameFromCookie(req.headers.cookie);
}

export function issueHiveWebSession(res: Response, username: string): void {
	const normalized = normalizeHiveUsername(username);
	if (!normalized) throw new Error('Cannot issue a Hive session without a username');
	const token = randomBytes(32).toString('base64url');
	const now = Date.now();
	sessions.set(token, { username: normalized, expiresAt: now + HIVE_WEB_SESSION_TTL_MS, lastSeenAt: now });
	res.cookie(HIVE_WEB_SESSION_COOKIE, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		maxAge: HIVE_WEB_SESSION_TTL_MS,
	});
}

export function clearHiveWebSession(req: Request, res: Response): void {
	const token = getCookieValue(req.headers.cookie, HIVE_WEB_SESSION_COOKIE);
	if (token) sessions.delete(token);
	res.clearCookie(HIVE_WEB_SESSION_COOKIE, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
	});
}

export function clearHiveWebSessionsForTests(): void {
	sessions.clear();
}
