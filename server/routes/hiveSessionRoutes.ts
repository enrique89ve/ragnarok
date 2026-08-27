import { Router, type Request, type Response } from 'express';
import { isTimestampFresh, isValidHiveUsername, verifyHiveAuth } from '../services/hiveAuth';
import { clearHiveWebSession, getHiveWebSessionUsername, issueHiveWebSession } from '../services/hiveWebSession';
import { normalizeHiveUsername } from '../../shared/p2pAvailability';

const router = Router();

function readLoginBody(value: unknown): { username: string; timestamp: number; signature: string } | null {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
	const body = value as Record<string, unknown>;
	if (typeof body.username !== 'string' || typeof body.signature !== 'string') return null;
	if (typeof body.timestamp !== 'number' || !Number.isSafeInteger(body.timestamp)) return null;
	return { username: body.username, timestamp: body.timestamp, signature: body.signature };
}

router.post('/login', async (req: Request, res: Response) => {
	const body = readLoginBody(req.body);
	const username = body ? normalizeHiveUsername(body.username) : null;
	if (!body || !username || !isValidHiveUsername(username)) {
		return res.status(400).json({ success: false, error: 'Valid Hive login proof required' });
	}
	if (!isTimestampFresh(body.timestamp)) {
		return res.status(401).json({ success: false, error: 'Login proof expired' });
	}
	const message = `ragnarok-login:${username}:${body.timestamp}`;
	const auth = await verifyHiveAuth(username, message, body.signature);
	if (!auth.valid) {
		return res.status(auth.error === 'network_error' ? 503 : 401).json({
			success: false,
			error: auth.error === 'network_error' ? 'Hive auth service unavailable' : 'Invalid Hive login proof',
		});
	}
	issueHiveWebSession(res, username);
	return res.json({ success: true, username });
});

router.get('/status', (req: Request, res: Response) => {
	const username = getHiveWebSessionUsername(req);
	return res.json({ success: true, authenticated: Boolean(username), ...(username ? { username } : {}) });
});

router.post('/logout', (req: Request, res: Response) => {
	clearHiveWebSession(req, res);
	return res.json({ success: true });
});

export default router;
