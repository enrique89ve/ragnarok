import { Router, type Request, type Response } from 'express';
import {
	buildClosedBetaCutoverGate,
	buildRagnarokRuntimeEvidence,
} from '../../shared/runtimeConfig';
import {
	attachAdminApproval,
	buildAdminApprovalMessage,
	parseAdminBroadcastBody,
	parseAdminMultisigPrepareBody,
	type AdminSessionLoginPayload,
	validatePayloadSize,
} from '../../shared/protocol-core';
import { getRagnarokServerRuntimeConfig } from '../services/runtimeConfig';
import { buildServerStateEvidence } from '../services/runtimeStateEvidence';
import { serverSignatureVerifier } from '../services/hiveSignatureVerifier';
import { broadcastAdminCustomJson } from '../services/adminOperatorBroadcaster';
import {
	reserveAdminApproval,
	validateAdminApprovalNonceFreshness,
} from '../services/adminApprovalReplayGuard';
import {
	ADMIN_SESSION_COOKIE_NAME,
	ADMIN_SESSION_TTL_MS,
	adminSessionManager,
} from '../services/adminSession';
import {
	broadcastAdminMultisigTransaction,
	prepareAdminMultisigTransaction,
	readAdminMultisigBroadcastBody,
} from '../services/adminMultisigTransaction';
import { getP2PRelayStats } from './p2pRelay';
import { getP2PMatchmakingStats } from './matchmakingRoutes';
import { getP2PSocialStats } from './socialRoutes';

const router = Router();

function sendError(res: Response, status: number, error: string): void {
	res.status(status).json({ success: false, error });
}

function getAdminSessionCookieOptions(maxAge: number = ADMIN_SESSION_TTL_MS) {
	return {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax' as const,
		path: '/api/admin',
		maxAge,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readLoginBody(body: unknown): {
	readonly account: string;
	readonly nonce: number;
	readonly payload: AdminSessionLoginPayload;
	readonly message: string;
	readonly signature: string;
} | null {
	if (!isRecord(body)) return null;
	if (typeof body.account !== 'string' || body.account.trim().length === 0) return null;
	if (!isRecord(body.payload)) return null;
	if (typeof body.message !== 'string' || body.message.length === 0) return null;
	if (
		typeof body.nonce !== 'number'
		|| !Number.isSafeInteger(body.nonce)
		|| body.nonce <= 0
	) {
		return null;
	}
	if (typeof body.signature !== 'string' || body.signature.length < 10) return null;
	return {
		account: body.account,
		nonce: body.nonce,
		payload: body.payload as AdminSessionLoginPayload,
		message: body.message,
		signature: body.signature,
	};
}

router.get('/config', (_req: Request, res: Response) => {
	const runtime = getRagnarokServerRuntimeConfig();
	const runtimeEvidence = buildRagnarokRuntimeEvidence(runtime);
	res.json({
		success: true,
		...runtimeEvidence,
		adminAccount: runtime.adminAccount,
		adminOperatorAccount: runtime.adminOperatorAccount,
		multisigConfigured: Boolean(
			runtime.adminOperatorAccount
			&& runtime.adminOperatorAccount !== runtime.adminAccount,
		),
		state: buildServerStateEvidence(runtime),
		closedBetaCutover: buildClosedBetaCutoverGate(runtime),
	});
});

router.get('/p2p/status', (_req: Request, res: Response) => {
	const relay = getP2PRelayStats();
	const matchmaking = getP2PMatchmakingStats();
	const social = getP2PSocialStats();
	res.json({
		success: true,
		updatedAt: Date.now(),
		relay,
		matchmaking,
		social,
		summary: {
			playersInRelayMatches: relay.activePlayersInMatches,
			activeRelayRooms: relay.activeFullRooms,
			activeMatchmakingPairs: matchmaking.activeMatches,
			onlinePresenceUsers: social.onlineUsers,
			pendingChallenges: social.pendingChallenges,
			totalErrors: relay.totalErrors,
			lastErrorAt: relay.lastErrorAt,
			lastErrorReason: relay.lastErrorReason,
		},
	});
});

router.get('/session/status', (req: Request, res: Response) => {
	const runtime = getRagnarokServerRuntimeConfig();
	const status = adminSessionManager.getStatus({
		runtime,
		cookieHeader: req.headers.cookie,
	});
	res.json({ success: true, ...status });
});

router.post('/session/login', async (req: Request, res: Response) => {
	const runtime = getRagnarokServerRuntimeConfig();
	const body = readLoginBody(req.body);
	if (!body) {
		sendError(res, 400, 'Admin session login body is invalid');
		return;
	}

	try {
		const result = await adminSessionManager.verifyLogin({
			runtime,
			account: body.account,
			nonce: body.nonce,
			payload: body.payload,
			message: body.message,
			signature: body.signature,
		});
		if (!result.success) {
			sendError(res, result.status, result.reason);
			return;
		}

		res.cookie(
			ADMIN_SESSION_COOKIE_NAME,
			result.token,
			getAdminSessionCookieOptions(result.session.expiresAt - Date.now()),
		);
		res.json({
			success: true,
			session: result.session,
		});
	} catch (err) {
		sendError(res, 503, err instanceof Error ? err.message : String(err));
	}
});

router.post('/session/logout', (req: Request, res: Response) => {
	adminSessionManager.destroySession(req.headers.cookie);
	res.clearCookie(ADMIN_SESSION_COOKIE_NAME, getAdminSessionCookieOptions(0));
	res.json({ success: true });
});

router.post('/multisig/prepare', async (req: Request, res: Response) => {
	const runtime = getRagnarokServerRuntimeConfig();
	const adminSession = adminSessionManager.readSession({
		runtime,
		cookieHeader: req.headers.cookie,
	});
	if (!adminSession.success) {
		sendError(res, adminSession.status, adminSession.reason);
		return;
	}

	const parsed = parseAdminMultisigPrepareBody(req.body);
	if (!parsed.success) {
		sendError(res, 400, parsed.reason);
		return;
	}
	if (parsed.protocol !== 'ragnarok') {
		sendError(res, 501, 'NFTLox admin multisig is disabled until the NFTLox protocol is finalized');
		return;
	}

	const sizeCheck = validatePayloadSize(parsed.payload);
	if (!sizeCheck.valid) {
		sendError(res, 413, `Admin payload too large: ${sizeCheck.bytes} bytes (max ${sizeCheck.maxBytes})`);
		return;
	}

	try {
		const prepared = await prepareAdminMultisigTransaction({
			runtime,
			protocol: parsed.protocol,
			action: parsed.action,
			payload: parsed.payload,
		});
		res.json({ success: true, ...prepared });
	} catch (err) {
		sendError(res, 503, err instanceof Error ? err.message : String(err));
	}
});

router.post('/multisig/broadcast', async (req: Request, res: Response) => {
	const runtime = getRagnarokServerRuntimeConfig();
	const adminSession = adminSessionManager.readSession({
		runtime,
		cookieHeader: req.headers.cookie,
	});
	if (!adminSession.success) {
		sendError(res, adminSession.status, adminSession.reason);
		return;
	}

	const body = readAdminMultisigBroadcastBody(req.body);
	if (!body.success) {
		sendError(res, body.status, body.reason);
		return;
	}

	try {
		const result = await broadcastAdminMultisigTransaction({
			runtime,
			transaction: body.transaction,
		});
		if (!result.success) {
			sendError(res, result.status ?? 503, result.error ?? 'Admin multisig broadcast failed');
			return;
		}
		res.json(result);
	} catch (err) {
		sendError(res, 503, err instanceof Error ? err.message : String(err));
	}
});

router.post('/broadcast', async (req: Request, res: Response) => {
	const runtime = getRagnarokServerRuntimeConfig();
	const parsed = parseAdminBroadcastBody(req.body);
	if (!parsed.success) {
		sendError(res, 400, parsed.reason);
		return;
	}
	if (parsed.protocol !== 'ragnarok') {
		sendError(res, 501, 'NFTLox admin broadcasts are disabled until the NFTLox protocol is finalized');
		return;
	}

	const operatorAccount = runtime.adminOperatorAccount;
	if (!operatorAccount || operatorAccount === runtime.adminAccount) {
		sendError(res, 503, 'Admin operator account is not configured');
		return;
	}

	const { approval } = parsed;
	const adminSession = adminSessionManager.readSession({
		runtime,
		cookieHeader: req.headers.cookie,
	});
	if (!adminSession.success) {
		sendError(res, adminSession.status, adminSession.reason);
		return;
	}

	if (approval.approver !== runtime.adminAccount) {
		sendError(res, 403, 'Admin approval account mismatch');
		return;
	}

	const verifyActive = serverSignatureVerifier.verifyCurrentActiveKey;
	if (!verifyActive) {
		sendError(res, 503, 'Active admin signature verifier unavailable');
		return;
	}

	const fresh = validateAdminApprovalNonceFreshness(approval);
	if (!fresh.success) {
		sendError(res, 401, fresh.reason);
		return;
	}

	const message = buildAdminApprovalMessage({
		protocol: parsed.protocol,
		action: parsed.action,
		adminAccount: runtime.adminAccount,
		operatorAccount,
		payload: parsed.payload,
	});
	const valid = await verifyActive(approval.approver, message, approval.signature);
	if (!valid) {
		sendError(res, 401, 'Admin Active signature is invalid');
		return;
	}

	const sizeCheck = validatePayloadSize(attachAdminApproval(parsed.payload, approval));
	if (!sizeCheck.valid) {
		sendError(res, 413, `Admin payload too large: ${sizeCheck.bytes} bytes (max ${sizeCheck.maxBytes})`);
		return;
	}

	const reserved = reserveAdminApproval({
		protocol: parsed.protocol,
		action: parsed.action,
		approval,
		operatorAccount,
		signedMessage: message,
	});
	if (!reserved.success) {
		sendError(res, 409, reserved.reason);
		return;
	}

	try {
		const result = await broadcastAdminCustomJson({
			runtime,
			protocol: parsed.protocol,
			payload: parsed.payload,
			approval,
		});
		res.json(result);
	} catch (err) {
		sendError(res, 503, err instanceof Error ? err.message : String(err));
	}
});

export default router;
