import { Router, type Request, type Response } from 'express';
import { isValidHiveUsername } from '../services/hiveAuth';
import { attachHiveBodyAuthIfPresent } from '../middleware/hiveAuth';

const router = Router();

interface TradeOffer {
	id: string;
	fromUser: string;
	toUser: string;
	offeredCardIds: number[];
	requestedCardIds: number[];
	offeredEitr: number;
	requestedEitr: number;
	status: 'pending' | 'accepted' | 'declined' | 'cancelled';
	createdAt: number;
	expiresAt: number;
}

const trades = new Map<string, TradeOffer>();
let tradeCounter = 0;

function generateTradeId(): string {
	return `trade_${Date.now()}_${++tradeCounter}`;
}

function cleanExpired(): void {
	const now = Date.now();
	for (const [id, trade] of trades) {
		if (trade.status === 'pending' && trade.expiresAt < now) {
			trade.status = 'cancelled';
		}
	}
}

function getTradesForUser(username: string): TradeOffer[] {
	cleanExpired();
	const result: TradeOffer[] = [];
	for (const trade of trades.values()) {
		if (trade.fromUser === username || trade.toUser === username) {
			result.push(trade);
		}
	}
	return result.sort((a, b) => b.createdAt - a.createdAt);
}

router.get('/:username', (req: Request, res: Response) => {
	const { username } = req.params;
	const offers = getTradesForUser(username);
	res.json({ offers });
});

const createTradeAuth = attachHiveBodyAuthIfPresent({
	usernameField: 'fromUser',
	buildMessage: (_req, username, timestamp) => `ragnarok-trade-create:${username}:${timestamp}`,
});

const tradeActionAuth = attachHiveBodyAuthIfPresent({
	usernameField: 'username',
	buildMessage: (req, username, timestamp) => `ragnarok-trade-${req.path.split('/').pop()}:${username}:${req.params.tradeId}:${timestamp}`,
});

router.post('/', createTradeAuth, (req: Request, res: Response) => {
	const { fromUser, toUser, offeredCardIds, requestedCardIds, offeredEitr, requestedEitr } = req.body;

	if (!fromUser || !toUser) {
		res.status(400).json({ error: 'fromUser and toUser required' });
		return;
	}

	if (!isValidHiveUsername(fromUser) || !isValidHiveUsername(toUser)) {
		res.status(400).json({ error: 'Invalid username format' });
		return;
	}

	if (fromUser === toUser) {
		res.status(400).json({ error: 'Cannot trade with yourself' });
		return;
	}

	const id = generateTradeId();
	const offer: TradeOffer = {
		id,
		fromUser,
		toUser,
		offeredCardIds: offeredCardIds || [],
		requestedCardIds: requestedCardIds || [],
		offeredEitr: offeredEitr || 0,
		requestedEitr: requestedEitr || 0,
		status: 'pending',
		createdAt: Date.now(),
		expiresAt: Date.now() + 24 * 60 * 60 * 1000,
	};

	trades.set(id, offer);
	res.json({ offer });
});

router.post('/:tradeId/accept', tradeActionAuth, (req: Request, res: Response) => {
	const { username } = req.body;
	if (!username || typeof username !== 'string') {
		res.status(400).json({ error: 'username required' });
		return;
	}
	if (!isValidHiveUsername(username)) {
		res.status(400).json({ error: 'Invalid username format' });
		return;
	}
	const trade = trades.get(req.params.tradeId);
	if (!trade) {
		res.status(404).json({ error: 'Trade not found' });
		return;
	}
	if (trade.toUser !== username) {
		res.status(403).json({ error: 'Only the trade recipient can accept' });
		return;
	}
	if (trade.status !== 'pending') {
		res.status(400).json({ error: `Trade already ${trade.status}` });
		return;
	}
	trade.status = 'accepted';
	res.json({ trade });
});

router.post('/:tradeId/decline', tradeActionAuth, (req: Request, res: Response) => {
	const { username } = req.body;
	if (!username || typeof username !== 'string') {
		res.status(400).json({ error: 'username required' });
		return;
	}
	if (!isValidHiveUsername(username)) {
		res.status(400).json({ error: 'Invalid username format' });
		return;
	}
	const trade = trades.get(req.params.tradeId);
	if (!trade) {
		res.status(404).json({ error: 'Trade not found' });
		return;
	}
	if (trade.fromUser !== username && trade.toUser !== username) {
		res.status(403).json({ error: 'Only trade participants can decline' });
		return;
	}
	if (trade.status !== 'pending') {
		res.status(400).json({ error: `Trade already ${trade.status}` });
		return;
	}
	trade.status = 'declined';
	res.json({ trade });
});

router.post('/:tradeId/cancel', tradeActionAuth, (req: Request, res: Response) => {
	const { username } = req.body;
	if (!username || typeof username !== 'string') {
		res.status(400).json({ error: 'username required' });
		return;
	}
	if (!isValidHiveUsername(username)) {
		res.status(400).json({ error: 'Invalid username format' });
		return;
	}
	const trade = trades.get(req.params.tradeId);
	if (!trade) {
		res.status(404).json({ error: 'Trade not found' });
		return;
	}
	if (trade.fromUser !== username && trade.toUser !== username) {
		res.status(403).json({ error: 'Only trade participants can cancel' });
		return;
	}
	if (trade.status !== 'pending') {
		res.status(400).json({ error: `Trade already ${trade.status}` });
		return;
	}
	trade.status = 'cancelled';
	res.json({ trade });
});

export default router;
