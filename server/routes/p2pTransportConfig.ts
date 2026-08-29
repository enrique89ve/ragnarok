import { Router, type Request, type Response } from 'express';

import { getP2PTransportConfig } from '../services/p2pTransportConfig';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
	res.set('Cache-Control', 'public, max-age=30');
	res.json(getP2PTransportConfig());
});

export default router;
