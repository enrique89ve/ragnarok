import { Router, Request, Response } from 'express';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { requireHiveBodyAuthIfUsernamePresent } from '../middleware/hiveAuth';

const router = Router();

interface QueuedPlayer {
	peerId: string;
	username?: string;
	elo: number;
	timestamp: number;
	socket?: any;
}

const matchmakingQueue: QueuedPlayer[] = [];
const activeMatches = new Map<string, { player1: string; player2: string; createdAt: number }>();

const QUEUE_STALE_MS = 5 * 60 * 1000; // 5 minutes
const QUEUE_FILE = path.join(process.cwd(), 'data', 'matchmaking-queue.json');

let dataDirEnsured = false;
async function ensureDataDir() {
	if (dataDirEnsured) return;
	const dir = path.dirname(QUEUE_FILE);
	try {
		await fsPromises.mkdir(dir, { recursive: true });
		dataDirEnsured = true;
	} catch { /* already exists */ }
}

let saveQueued = false;
function saveQueue() {
	if (saveQueued) return;
	saveQueued = true;
	queueMicrotask(async () => {
		saveQueued = false;
		try {
			await ensureDataDir();
			const serializable = matchmakingQueue.map(({ peerId, username, elo, timestamp }) => ({ peerId, username, elo, timestamp }));
			await fsPromises.writeFile(QUEUE_FILE, JSON.stringify(serializable), 'utf8');
		} catch (err) {
			console.warn('[Matchmaking] Failed to save queue:', err);
		}
	});
}

function loadQueue() {
	try {
		if (!fs.existsSync(QUEUE_FILE)) return;
		const raw = fs.readFileSync(QUEUE_FILE, 'utf8');
		const entries: { peerId: string; username?: string; elo?: number; timestamp: number }[] = JSON.parse(raw);
		const now = Date.now();
		for (const entry of entries) {
			if (now - entry.timestamp < QUEUE_STALE_MS) {
				matchmakingQueue.push({ ...entry, elo: entry.elo ?? 1000 });
			}
		}
		if (matchmakingQueue.length > 0) {
			console.log(`[Matchmaking] Restored ${matchmakingQueue.length} queue entries from disk`);
		}
	} catch (err) {
		console.warn('[Matchmaking] Failed to load queue:', err);
	}
}

// Restore queue on startup
loadQueue();

function removeStaleQueueEntries() {
	const now = Date.now();
	const before = matchmakingQueue.length;
	for (let i = matchmakingQueue.length - 1; i >= 0; i--) {
		if (now - matchmakingQueue[i].timestamp > QUEUE_STALE_MS) {
			matchmakingQueue.splice(i, 1);
		}
	}
	if (matchmakingQueue.length < before) {
		console.log(`[Matchmaking] Removed ${before - matchmakingQueue.length} stale queue entries`);
		saveQueue();
	}
	for (const [matchId, match] of activeMatches.entries()) {
		if (now - match.createdAt > 300_000) {
			activeMatches.delete(matchId);
		}
	}
}

// Clean stale entries every 60 seconds
setInterval(removeStaleQueueEntries, 60_000);

function findBestEloMatch(newPlayer: QueuedPlayer): QueuedPlayer | null {
	if (matchmakingQueue.length === 0) return null;

	const now = Date.now();
	const waitMs = now - newPlayer.timestamp;

	// Expand ELO range the longer you wait: ±200 initially, ±500 after 30s, anyone after 60s
	let maxEloDiff = 200;
	if (waitMs > 60_000) maxEloDiff = Infinity;
	else if (waitMs > 30_000) maxEloDiff = 500;

	let bestIdx = -1;
	let bestDiff = Infinity;

	for (let i = 0; i < matchmakingQueue.length; i++) {
		const candidate = matchmakingQueue[i];
		if (candidate.peerId === newPlayer.peerId) continue;

		const diff = Math.abs(candidate.elo - newPlayer.elo);
		if (diff <= maxEloDiff && diff < bestDiff) {
			bestDiff = diff;
			bestIdx = i;
		}
	}

	// If no ELO match found, check if anyone in the queue has waited 60s+ (match anyone)
	if (bestIdx === -1) {
		for (let i = 0; i < matchmakingQueue.length; i++) {
			const candidate = matchmakingQueue[i];
			if (candidate.peerId === newPlayer.peerId) continue;
			if (now - candidate.timestamp > 60_000) {
				return matchmakingQueue.splice(i, 1)[0];
			}
		}
		return null;
	}

	return matchmakingQueue.splice(bestIdx, 1)[0];
}

const queueAuth = requireHiveBodyAuthIfUsernamePresent({
	usernameField: 'username',
	buildMessage: (req, username, timestamp) => `ragnarok-queue:${username}:${timestamp}`,
});

router.post('/queue', queueAuth, async (req: Request, res: Response) => {
	const { peerId, username } = req.body;

	if (!peerId || typeof peerId !== 'string') {
		return res.status(400).json({ success: false, error: 'peerId required' });
	}

	removeStaleQueueEntries();

	const existingIndex = matchmakingQueue.findIndex(p => p.peerId === peerId);
	if (existingIndex !== -1) {
		return res.json({ success: true, status: 'queued', position: existingIndex + 1 });
	}

	let elo = 1000;
	if (username && typeof username === 'string') {
		try {
			const { getPlayer, registerAccount } = require('../services/chainState');
			registerAccount(username);
			const player = getPlayer(username);
			if (player) elo = player.elo;
		} catch { /* chain state not available, use default */ }
	}

	const newPlayer: QueuedPlayer = {
		peerId,
		username: typeof username === 'string' ? username : undefined,
		elo,
		timestamp: Date.now(),
	};

	// Try ELO-based matching against existing queue
	matchmakingQueue.push(newPlayer);

	if (matchmakingQueue.length >= 2) {
		const opponent = findBestEloMatch(newPlayer);
		if (opponent) {
			// Remove the new player from the queue too
			const newIdx = matchmakingQueue.findIndex(p => p.peerId === peerId);
			if (newIdx !== -1) matchmakingQueue.splice(newIdx, 1);
			saveQueue();

			const matchId = `${opponent.peerId}-${newPlayer.peerId}`;
			activeMatches.set(matchId, {
				player1: opponent.peerId,
				player2: newPlayer.peerId,
				createdAt: Date.now(),
			});

			setTimeout(() => {
				activeMatches.delete(matchId);
			}, 120_000);

			return res.json({
				success: true,
				status: 'matched',
				matchId,
				opponentPeerId: opponent.peerId,
				opponentElo: opponent.elo,
				opponentUsername: opponent.username,
				isHost: false,
			});
		}
	}

	saveQueue();
	return res.json({ success: true, status: 'queued', position: matchmakingQueue.length, elo });
});

router.post('/leave', (req: Request, res: Response) => {
	const { peerId } = req.body;

	if (!peerId) {
		return res.status(400).json({ success: false, error: 'peerId required' });
	}

	const index = matchmakingQueue.findIndex(p => p.peerId === peerId);
	if (index !== -1) {
		matchmakingQueue.splice(index, 1);
		saveQueue();
	}

	return res.json({ success: true });
});

router.get('/status/:peerId', (req: Request, res: Response) => {
	const { peerId } = req.params;

	const queuePosition = matchmakingQueue.findIndex(p => p.peerId === peerId);
	if (queuePosition !== -1) {
		return res.json({
			success: true,
			status: 'queued',
			position: queuePosition + 1,
			totalInQueue: matchmakingQueue.length,
		});
	}

	for (const [matchId, match] of activeMatches.entries()) {
		if (match.player1 === peerId || match.player2 === peerId) {
			return res.json({
				success: true,
				status: 'matched',
				matchId,
				opponentPeerId: match.player1 === peerId ? match.player2 : match.player1,
				isHost: match.player1 === peerId,
			});
		}
	}

	return res.json({ success: true, status: 'not_queued' });
});

router.get('/stats', (req: Request, res: Response) => {
	res.json({
		success: true,
		queueLength: matchmakingQueue.length,
		activeMatches: activeMatches.size,
	});
});

export default router;
