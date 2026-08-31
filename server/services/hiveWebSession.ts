import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { normalizeHiveUsername } from '../../shared/p2pAvailability';

export const HIVE_WEB_SESSION_COOKIE = 'ragnarok-hive-session';
export const HIVE_WEB_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
// Sliding renewal must not turn a browser tab into an immortal credential.
// The absolute cap is intentionally explicit so deployments can shorten it
// without changing cookie semantics.
export const HIVE_WEB_SESSION_ABSOLUTE_TIMEOUT_MS = 24 * 60 * 60 * 1000;

type HiveWebSession = {
	readonly username: string;
	readonly createdAt: number;
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
	if (!session || session.expiresAt <= now || session.createdAt + HIVE_WEB_SESSION_ABSOLUTE_TIMEOUT_MS <= now) {
		if (session) sessions.delete(token);
		return null;
	}
	session.lastSeenAt = now;
	session.expiresAt = Math.min(
		now + HIVE_WEB_SESSION_TTL_MS,
		session.createdAt + HIVE_WEB_SESSION_ABSOLUTE_TIMEOUT_MS,
	);
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
	sessions.set(token, {
		username: normalized,
		createdAt: now,
		expiresAt: now + HIVE_WEB_SESSION_TTL_MS,
		lastSeenAt: now,
	});
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
