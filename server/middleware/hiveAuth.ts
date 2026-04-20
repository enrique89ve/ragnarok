import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { isTimestampFresh, isValidHiveUsername, verifyHiveAuth } from '../services/hiveAuth';

export interface HiveAuthenticatedRequest extends Request {
	hiveUsername?: string;
}

interface BaseHiveAuthOptions {
	buildMessage: (req: Request, username: string, timestamp: number) => string;
	onSuccess?: (req: HiveAuthenticatedRequest, username: string) => void | Promise<void>;
	missingAuthMessage?: string;
	invalidUsernameMessage?: string;
	staleTimestampMessage?: string;
	invalidSignatureMessage?: string;
	missingUsernameMessage?: string;
	usernameErrorStatus?: number;
}

interface SourceHiveAuthOptions extends BaseHiveAuthOptions {
	usernameSource: (req: Request) => unknown;
	signatureSource: (req: Request) => unknown;
	timestampSource: (req: Request) => unknown;
	mode: 'required' | 'if-username-present' | 'if-signature-present';
}

interface BodyHiveAuthOptions extends BaseHiveAuthOptions {
	usernameField: string;
	signatureField?: string;
	timestampField?: string;
}

interface HeaderHiveAuthOptions extends BaseHiveAuthOptions {
	usernameHeader?: string;
	signatureHeader?: string;
	timestampHeader?: string;
}

function readString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function readTimestamp(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return Math.trunc(value);
	}
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number.parseInt(value, 10);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return undefined;
}

function createHiveAuthMiddleware(options: SourceHiveAuthOptions): RequestHandler {
	return async (req: Request, res: Response, next: NextFunction) => {
		const username = readString(options.usernameSource(req))?.toLowerCase();
		const signature = readString(options.signatureSource(req));
		const timestamp = readTimestamp(options.timestampSource(req));

		if (!username) {
			if (options.mode === 'required') {
				res.status(options.usernameErrorStatus ?? 400).json({
					error: options.missingUsernameMessage ?? 'username required',
				});
				return;
			}
			next();
			return;
		}

		if (!isValidHiveUsername(username)) {
			res.status(options.usernameErrorStatus ?? 400).json({
				error: options.invalidUsernameMessage ?? 'Invalid Hive username format',
			});
			return;
		}

		const authMissing = !signature || timestamp === undefined;
		if (authMissing) {
			if (options.mode === 'if-signature-present' && !signature && timestamp === undefined) {
				next();
				return;
			}

			res.status(401).json({
				error: options.missingAuthMessage ?? 'Hive signature required',
			});
			return;
		}

		if (!isTimestampFresh(timestamp)) {
			res.status(401).json({
				error: options.staleTimestampMessage ?? 'Timestamp expired',
			});
			return;
		}

		const authResult = await verifyHiveAuth(
			username,
			options.buildMessage(req, username, timestamp),
			signature,
		);

		if (!authResult.valid) {
			const status = authResult.error === 'network_error' ? 503 : 401;
			res.status(status).json({
				error: authResult.error === 'network_error'
					? 'Auth service unavailable'
					: (options.invalidSignatureMessage ?? 'Invalid Hive signature'),
				detail: authResult.error,
			});
			return;
		}

		const authenticatedReq = req as HiveAuthenticatedRequest;
		authenticatedReq.hiveUsername = username;
		await options.onSuccess?.(authenticatedReq, username);
		next();
	};
}

function createBodyHiveAuthMiddleware(
	options: BodyHiveAuthOptions & Pick<SourceHiveAuthOptions, 'mode'>,
): RequestHandler {
	const signatureField = options.signatureField ?? 'signature';
	const timestampField = options.timestampField ?? 'timestamp';

	return createHiveAuthMiddleware({
		...options,
		usernameSource: (req) => req.body?.[options.usernameField],
		signatureSource: (req) => req.body?.[signatureField],
		timestampSource: (req) => req.body?.[timestampField],
	});
}

export function requireHiveHeaderAuth(options: HeaderHiveAuthOptions): RequestHandler {
	const usernameHeader = options.usernameHeader ?? 'x-hive-username';
	const signatureHeader = options.signatureHeader ?? 'x-hive-signature';
	const timestampHeader = options.timestampHeader ?? 'x-hive-timestamp';

	return createHiveAuthMiddleware({
		...options,
		mode: 'required',
		usernameErrorStatus: options.usernameErrorStatus ?? 401,
		usernameSource: (req) => req.headers[usernameHeader],
		signatureSource: (req) => req.headers[signatureHeader],
		timestampSource: (req) => req.headers[timestampHeader],
		missingAuthMessage: options.missingAuthMessage ?? 'Missing authentication headers',
		invalidUsernameMessage: options.invalidUsernameMessage ?? 'Invalid Hive username',
		staleTimestampMessage: options.staleTimestampMessage ?? 'Timestamp expired or invalid',
		invalidSignatureMessage: options.invalidSignatureMessage ?? 'Invalid signature',
	});
}

export function requireHiveBodyAuth(options: BodyHiveAuthOptions): RequestHandler {
	return createBodyHiveAuthMiddleware({
		...options,
		mode: 'required',
	});
}

export function requireHiveBodyAuthIfUsernamePresent(options: BodyHiveAuthOptions): RequestHandler {
	return createBodyHiveAuthMiddleware({
		...options,
		mode: 'if-username-present',
	});
}

export function attachHiveBodyAuthIfPresent(options: BodyHiveAuthOptions): RequestHandler {
	return createBodyHiveAuthMiddleware({
		...options,
		mode: 'if-signature-present',
	});
}
