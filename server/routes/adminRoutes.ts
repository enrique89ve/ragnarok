import { Router, type Request, type Response } from 'express';
import {
	attachAdminApproval,
	buildAdminApprovalMessage,
	parseAdminBroadcastBody,
	validatePayloadSize,
} from '../../shared/protocol-core';
import { getRagnarokServerRuntimeConfig } from '../services/runtimeConfig';
import { serverSignatureVerifier } from '../services/hiveSignatureVerifier';
import { broadcastAdminCustomJson } from '../services/adminOperatorBroadcaster';
import {
	reserveAdminApproval,
	validateAdminApprovalNonceFreshness,
} from '../services/adminApprovalReplayGuard';

const router = Router();

function sendError(res: Response, status: number, error: string): void {
	res.status(status).json({ success: false, error });
}

router.get('/config', (_req: Request, res: Response) => {
	const runtime = getRagnarokServerRuntimeConfig();
	res.json({
		success: true,
		adminAccount: runtime.adminAccount,
		adminOperatorAccount: runtime.adminOperatorAccount,
		multisigConfigured: Boolean(
			runtime.adminOperatorAccount
			&& runtime.adminOperatorAccount !== runtime.adminAccount,
		),
	});
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
