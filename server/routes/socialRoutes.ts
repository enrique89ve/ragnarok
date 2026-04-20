import { Router, type Request, type Response } from 'express';
import { isValidHiveUsername } from '../services/hiveAuth';

const router = Router();

const presenceMap = new Map<string, { peerId?: string; lastSeen: number }>();
const challenges = new Map<string, { from: string; peerId: string; timestamp: number }[]>();
const challengeTimestamps = new Map<string, number>();

const STALE_THRESHOLD = 90_000;
const CHALLENGE_COOLDOWN_MS = 5_000;
const MAX_FRIENDS_LIST = 200;
const MAX_PEER_ID_LENGTH = 64;

function pruneStale() {
	const now = Date.now();
	for (const [user, data] of presenceMap) {
		if (now - data.lastSeen > STALE_THRESHOLD) {
			presenceMap.delete(user);
			challenges.delete(user);
			challengeTimestamps.delete(user);
		}
	}
	for (const [user, list] of challenges) {
		const fresh = list.filter(c => now - c.timestamp < STALE_THRESHOLD);
		if (fresh.length === 0) challenges.delete(user);
		else challenges.set(user, fresh);
	}
}

router.post('/heartbeat', (req: Request, res: Response) => {
	const { username, peerId, friends } = req.body;
	if (!username || typeof username !== 'string') {
		res.status(400).json({ error: 'username required' });
		return;
	}
	if (!isValidHiveUsername(username)) {
		res.status(400).json({ error: 'Invalid username format' });
		return;
	}
	if (!Array.isArray(friends)) {
		res.status(400).json({ error: 'friends must be an array' });
		return;
	}
	const seen = new Set<string>();
	const friendList: string[] = [];
	for (const f of friends) {
		if (typeof f !== 'string') continue;
		const normalized = f.toLowerCase();
		if (seen.has(normalized)) continue;
		seen.add(normalized);
		if (friendList.length >= MAX_FRIENDS_LIST) break;
		friendList.push(normalized);
	}

	pruneStale();

	presenceMap.set(username.toLowerCase(), {
		peerId: typeof peerId === 'string' ? peerId.slice(0, MAX_PEER_ID_LENGTH) : undefined,
		lastSeen: Date.now(),
	});

	const statuses: Record<string, { online: boolean; peerId?: string; lastSeen?: number }> = {};

	for (const friend of friendList) {
		const normalized = friend.toLowerCase();
		const presence = presenceMap.get(normalized);
		statuses[normalized] = presence
			? { online: true, peerId: presence.peerId, lastSeen: presence.lastSeen }
			: { online: false };
	}

	const pending = challenges.get(username.toLowerCase()) || [];
	challenges.delete(username.toLowerCase());

	res.json({ statuses, challenges: pending });
});

router.post('/challenge', (req: Request, res: Response) => {
	const { from, to, peerId } = req.body;
	if (!from || typeof from !== 'string' || !to || typeof to !== 'string' || !peerId || typeof peerId !== 'string') {
		res.status(400).json({ error: 'from, to, peerId required as strings' });
		return;
	}
	if (!isValidHiveUsername(from) || !isValidHiveUsername(to)) {
		res.status(400).json({ error: 'Invalid username format' });
		return;
	}
	if (peerId.length > MAX_PEER_ID_LENGTH) {
		res.status(400).json({ error: 'peerId too long' });
		return;
	}
	if (from.toLowerCase() === to.toLowerCase()) {
		res.status(400).json({ error: 'Cannot challenge yourself' });
		return;
	}

	const pairKey = `${from.toLowerCase()}:${to.toLowerCase()}`;
	const lastChallenge = challengeTimestamps.get(pairKey);
	const now = Date.now();
	if (lastChallenge && now - lastChallenge < CHALLENGE_COOLDOWN_MS) {
		res.status(429).json({ error: 'Challenge rate limit exceeded, wait 5 seconds' });
		return;
	}
	challengeTimestamps.set(pairKey, now);

	const target = to.toLowerCase();
	const existing = challenges.get(target) || [];
	existing.push({ from: from.toLowerCase(), peerId, timestamp: now });
	challenges.set(target, existing.slice(-10));

	res.json({ ok: true });
});

router.get('/challenges/:username', (req: Request, res: Response) => {
	const username = req.params.username.toLowerCase();
	const pending = challenges.get(username) || [];
	res.json({ challenges: pending });
});

export default router;
