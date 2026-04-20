import { Router, type Request, type Response } from 'express';
import { treasuryCoordinator } from '../services/treasuryCoordinator';
import { requireHiveHeaderAuth, type HiveAuthenticatedRequest } from '../middleware/hiveAuth';
import type { SigningResponse } from '../../shared/treasuryTypes';

const router = Router();

const requireHiveAuth = requireHiveHeaderAuth({
	buildMessage: (_req, username, timestamp) => `${username}:${timestamp}`,
	onSuccess: async (_req, username) => {
		await treasuryCoordinator.heartbeat(username);
	},
});

router.get('/status', async (_req: Request, res: Response) => {
	try {
		const status = await treasuryCoordinator.getStatus();
		res.json(status);
		} catch {
		res.status(500).json({ error: 'Failed to get treasury status' });
	}
});

router.get('/signers', async (_req: Request, res: Response) => {
	try {
		const signers = await treasuryCoordinator.getSignerInfoList();
		res.json({ signers });
		} catch {
		res.status(500).json({ error: 'Failed to get signers' });
	}
});

router.post('/join', requireHiveAuth, async (req: HiveAuthenticatedRequest, res: Response) => {
	try {
		const result = await treasuryCoordinator.joinSigner(req.hiveUsername!);
		if (result.success) {
			res.json({ success: true });
		} else {
			res.status(400).json({ error: result.error });
		}
		} catch {
		res.status(500).json({ error: 'Failed to join' });
	}
});

router.post('/leave', requireHiveAuth, async (req: HiveAuthenticatedRequest, res: Response) => {
	try {
		const result = await treasuryCoordinator.leaveSigner(req.hiveUsername!);
		if (result.success) {
			res.json({ success: true });
		} else {
			res.status(400).json({ error: result.error });
		}
		} catch {
		res.status(500).json({ error: 'Failed to leave' });
	}
});

router.get('/transactions', requireHiveAuth, async (req: HiveAuthenticatedRequest, res: Response) => {
	try {
		const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
		const transactions = await treasuryCoordinator.getRecentTransactions(limit);
		res.json({ transactions });
		} catch {
		res.status(500).json({ error: 'Failed to get transactions' });
	}
});

router.get('/transactions/:id', requireHiveAuth, async (req: HiveAuthenticatedRequest, res: Response) => {
	try {
		const tx = await treasuryCoordinator.getTransactionById(req.params.id);
		if (!tx) {
			res.status(404).json({ error: 'Transaction not found' });
			return;
		}
		res.json(tx);
		} catch {
		res.status(500).json({ error: 'Failed to get transaction' });
	}
});

router.post('/freeze', requireHiveAuth, async (req: HiveAuthenticatedRequest, res: Response) => {
	try {
		const { reason } = req.body || {};
		const result = await treasuryCoordinator.freeze(req.hiveUsername!, reason);
		if (result.success) {
			res.json({ success: true });
		} else {
			res.status(400).json({ error: result.error });
		}
		} catch {
		res.status(500).json({ error: 'Failed to freeze' });
	}
});

router.post('/unfreeze', requireHiveAuth, async (req: HiveAuthenticatedRequest, res: Response) => {
	try {
		const result = await treasuryCoordinator.voteUnfreeze(req.hiveUsername!);
		res.json(result);
		} catch {
		res.status(500).json({ error: 'Failed to vote unfreeze' });
	}
});

router.post('/transactions/:id/veto', requireHiveAuth, async (req: HiveAuthenticatedRequest, res: Response) => {
	try {
		const result = await treasuryCoordinator.vetoTransaction(req.params.id, req.hiveUsername!);
		if (result.success) {
			res.json({ success: true });
		} else {
			res.status(400).json({ error: result.error });
		}
		} catch {
		res.status(500).json({ error: 'Failed to veto transaction' });
	}
});

router.get('/pending-signing', requireHiveAuth, async (req: HiveAuthenticatedRequest, res: Response) => {
	try {
		const requests = treasuryCoordinator.getPendingSigningRequests(req.hiveUsername!);
		res.json({ requests });
		} catch {
		res.status(500).json({ error: 'Failed to get pending signing requests' });
	}
});

router.post('/submit-signature', requireHiveAuth, async (req: HiveAuthenticatedRequest, res: Response) => {
	try {
		const { txId, nonce, signature, rejected, rejectReason } = req.body;
		if (!txId || !nonce) {
			res.status(400).json({ error: 'Missing txId or nonce' });
			return;
		}

		const response: SigningResponse = {
			type: 'SigningResponse',
			version: 1,
			txId,
			nonce,
			signature: signature ?? null,
			rejected: rejected ?? false,
			rejectReason: rejectReason ?? null,
			signerUsername: req.hiveUsername!,
		};

		await treasuryCoordinator.handleSigningResponse(response);
		res.json({ success: true });
		} catch {
		res.status(500).json({ error: 'Failed to submit signature' });
	}
});

router.post('/wot/vouch', requireHiveAuth, async (req: HiveAuthenticatedRequest, res: Response) => {
	try {
		const { candidateUsername } = req.body;
		if (!candidateUsername) {
			res.status(400).json({ error: 'Missing candidateUsername' });
			return;
		}
		const result = await treasuryCoordinator.vouchForCandidate(req.hiveUsername!, candidateUsername);
		if (result.success) {
			res.json({ success: true, vouchCount: result.vouchCount });
		} else {
			res.status(400).json({ error: result.error });
		}
		} catch {
		res.status(500).json({ error: 'Failed to vouch' });
	}
});

router.delete('/wot/vouch', requireHiveAuth, async (req: HiveAuthenticatedRequest, res: Response) => {
	try {
		const { candidateUsername } = req.body;
		if (!candidateUsername) {
			res.status(400).json({ error: 'Missing candidateUsername' });
			return;
		}
		const result = await treasuryCoordinator.revokeVouch(req.hiveUsername!, candidateUsername);
		if (result.success) {
			res.json({ success: true });
		} else {
			res.status(400).json({ error: result.error });
		}
		} catch {
		res.status(500).json({ error: 'Failed to revoke vouch' });
	}
});

router.get('/wot/vouches', async (_req: Request, res: Response) => {
	try {
		const candidates = await treasuryCoordinator.getVouchCandidates();
		res.json({ candidates });
		} catch {
		res.status(500).json({ error: 'Failed to get vouches' });
	}
});

export default router;
