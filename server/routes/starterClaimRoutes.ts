import { Router, type NextFunction, type Request, type Response } from 'express';
import {
	requireHiveBodyAuth,
	type HiveAuthenticatedRequest,
} from '../middleware/hiveAuth';
import {
	hasStarterCeremonyClaim,
	setStarterCeremonyClaim,
} from '../services/starterClaimRegistry';
import { isValidAvailabilityHiveUsername, normalizeHiveUsername } from '../../shared/p2pAvailability';
import { buildRagnarokRuntimeEvidence } from '../../shared/runtimeConfig';
import { buildStarterClaimAuthMessage, resolveStarterClaimAuthMode } from '../../shared/starterClaimAuth';
import { getRagnarokServerRuntimeConfig } from '../services/runtimeConfig';

const router = Router();

const starterClaimAuth = requireHiveBodyAuth({
	usernameField: 'username',
	buildMessage: (_req, username, timestamp) => buildStarterClaimAuthMessage({ username, timestamp }),
	missingUsernameMessage: 'Hive username required for starter claim',
	usernameErrorStatus: 401,
});

function authorizeStarterClaim(req: Request, res: Response, next: NextFunction): void {
	const policy = buildRagnarokRuntimeEvidence(getRagnarokServerRuntimeConfig()).phasePolicy;
	if (resolveStarterClaimAuthMode(policy) === 'hive-body-auth') {
		starterClaimAuth(req, res, next);
		return;
	}

	const rawUsername: unknown = req.body?.username;
	if (typeof rawUsername !== 'string') {
		res.status(400).json({ success: false, error: 'username required' });
		return;
	}
	const username = normalizeHiveUsername(rawUsername);
	if (!username) {
		res.status(400).json({ success: false, error: 'username required' });
		return;
	}
	if (!isValidAvailabilityHiveUsername(username)) {
		res.status(400).json({ success: false, error: 'Invalid Hive username format' });
		return;
	}
	const authenticatedRequest = req as HiveAuthenticatedRequest;
	authenticatedRequest.hiveUsername = username;
	next();
}

router.post('/claim', authorizeStarterClaim, async (req: HiveAuthenticatedRequest, res: Response) => {
	const authenticatedUsername = req.hiveUsername;
	if (!authenticatedUsername) {
		res.status(401).json({ success: false, error: 'Hive authentication required' });
		return;
	}

	const record = await setStarterCeremonyClaim(authenticatedUsername);
	res.json({
		success: true,
		account: record.account,
		claimedAt: record.claimedAt,
	});
});

router.get('/status/:username', async (req: Request, res: Response) => {
	const username = normalizeHiveUsername(req.params.username);
	if (!username) {
		res.status(400).json({ success: false, error: 'username required' });
		return;
	}

	res.json({
		success: true,
		account: username,
		claimed: await hasStarterCeremonyClaim(username),
	});
});

export default router;
