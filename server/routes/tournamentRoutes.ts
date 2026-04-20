import { Router, type Request, type Response } from 'express';
import {
	createTournament,
	registerPlayer,
	startTournament,
	reportMatchResult,
	dropPlayer,
	getTournament,
	getAllTournaments,
	createDefaultTournaments,
} from '../services/tournamentManager';
import { requireHiveBodyAuth } from '../middleware/hiveAuth';

const router = Router();

createDefaultTournaments();

router.get('/', (_req: Request, res: Response) => {
	const tournaments = getAllTournaments().map(t => ({
		id: t.id,
		name: t.name,
		format: t.format,
		status: t.status,
		playerCount: t.players.length,
		maxPlayers: t.maxPlayers,
		entryFee: t.entryFee,
		prizePool: t.prizePool,
		startsAt: t.startsAt,
	}));
	res.json({ tournaments });
});

router.get('/:id', (req: Request, res: Response) => {
	const tournament = getTournament(req.params.id);
	if (!tournament) {
		res.status(404).json({ error: 'Tournament not found' });
		return;
	}
	res.json({ tournament });
});

router.post('/', (req: Request, res: Response) => {
	const { name, format, maxPlayers, entryFee, startsAt } = req.body;
	if (!name || !format) {
		res.status(400).json({ error: 'name and format required' });
		return;
	}
	const tournament = createTournament(
		name,
		format,
		maxPlayers || 16,
		entryFee || 0,
		startsAt || Date.now() + 3600_000
	);
	res.json({ tournament });
});

const registerAuth = requireHiveBodyAuth({
	usernameField: 'username',
	buildMessage: (req, username, timestamp) => `ragnarok-tournament-register:${username}:${req.params.id}:${timestamp}`,
});

const resultAuth = requireHiveBodyAuth({
	usernameField: 'winner',
	buildMessage: (req, username, timestamp) => `ragnarok-tournament-result:${username}:${req.params.id}:${req.body.matchId}:${timestamp}`,
});

const dropAuth = requireHiveBodyAuth({
	usernameField: 'username',
	buildMessage: (req, username, timestamp) => `ragnarok-tournament-drop:${username}:${req.params.id}:${timestamp}`,
});

router.post('/:id/register', registerAuth, (req: Request, res: Response) => {
	const { username, elo } = req.body;
	const tournament = registerPlayer(req.params.id, username, elo);
	if (!tournament) {
		res.status(400).json({ error: 'Cannot register' });
		return;
	}
	res.json({ tournament });
});

router.post('/:id/start', (req: Request, res: Response) => {
	const tournament = startTournament(req.params.id);
	if (!tournament) {
		res.status(400).json({ error: 'Cannot start tournament' });
		return;
	}
	res.json({ tournament });
});

router.post('/:id/result', resultAuth, (req: Request, res: Response) => {
	const { matchId, winner } = req.body;
	if (!matchId || !winner) {
		res.status(400).json({ error: 'matchId and winner required' });
		return;
	}
	const tournament = reportMatchResult(req.params.id, matchId, winner);
	if (!tournament) {
		res.status(400).json({ error: 'Cannot report result' });
		return;
	}
	res.json({ tournament });
});

router.post('/:id/drop', dropAuth, (req: Request, res: Response) => {
	const { username } = req.body;
	const tournament = dropPlayer(req.params.id, username);
	if (!tournament) {
		res.status(400).json({ error: 'Cannot drop player' });
		return;
	}
	res.json({ tournament });
});

export default router;
