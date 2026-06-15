import { Router, type Request, type Response } from 'express';
import {
	requireHiveBodyAuth,
	type HiveAuthenticatedRequest,
} from '../middleware/hiveAuth';
import {
	hasStarterCeremonyClaim,
	setStarterCeremonyClaim,
} from '../services/starterClaimRegistry';
import { normalizeHiveUsername } from '../../shared/p2pAvailability';
import { buildStarterClaimAuthMessage } from '../../shared/starterClaimAuth';

const router = Router();

const starterClaimAuth = requireHiveBodyAuth({
	usernameField: 'username',
	buildMessage: (_req, username, timestamp) => buildStarterClaimAuthMessage({ username, timestamp }),
	missingUsernameMessage: 'Hive username required for starter claim',
	usernameErrorStatus: 401,
});

router.post('/claim', starterClaimAuth, async (req: HiveAuthenticatedRequest, res: Response) => {
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
