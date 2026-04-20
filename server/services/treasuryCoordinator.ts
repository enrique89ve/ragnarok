import { randomUUID, randomBytes } from 'crypto';
import { db } from '../database';
import {
	type SigningRequest,
	type SigningResponse,
	type SigningMetadata,
	type TreasuryStatus,
	type TreasurySignerInfo,
	type TreasuryTransaction,
	type VouchCandidate,
	TREASURY_PROTOCOL_VERSION,
	MIN_SIGNERS_FOR_OPERATION,
	SIGNING_TIMEOUT_MS,
	AUTHORITY_SYNC_INTERVAL_MS,
	OPT_OUT_COOLDOWN_MS,
	CHURN_COOLDOWN_MS,
	CHURN_THRESHOLD,
	CHURN_WINDOW_MS,
	MIN_TREASURY_VOUCHES,
	TRANSFER_DELAY_SECONDS,
	AUTHORITY_UPDATE_DELAY_SECONDS,
	SERVER_MAX_PER_TX_HBD,
	SERVER_DAILY_CAP_HBD,
} from '../../shared/treasuryTypes';
import {
	computeThreshold,
	authorityMatchesSigners,
	getAccountAuthority,
	getTreasuryBalance,
	buildTransferPayload,
	buildUnsignedTransaction,
	broadcastSignedTransaction,
	isTopWitness,
	getWitnessRank,
} from './treasuryHive';
import { TreasuryAnomalyDetector } from './treasuryAnomalyDetector';

const TREASURY_ACCOUNT = process.env.TREASURY_ACCOUNT || 'ragnarok-treasury';
const HEARTBEAT_TIMEOUT_MS = 5 * 60_000;

interface PendingSession {
	txId: string;
	nonce: string;
	digestHex: string;
	txObject: any;
	operations: any[];
	metadata: SigningMetadata;
	threshold: number;
	signatures: Record<string, string>;
	createdAt: number;
	broadcastAfter: Date | null;
}

export class TreasuryCoordinator {
	private pendingSessions = new Map<string, PendingSession>();
	private usedNonces = new Map<string, string>();
	private frozen = false;
	private frozenBy: string | null = null;
	private unfreezeVotes = new Set<string>();
	private authorityInSync = false;
	private syncTimer: ReturnType<typeof setInterval> | null = null;
	private anomalyDetector = new TreasuryAnomalyDetector();
	private dailySpent = 0;
	private dailyResetAt = 0;

	async start(): Promise<void> {
		await this.loadFreezeState();
		this.syncTimer = setInterval(() => this.syncAuthority().catch(console.error), AUTHORITY_SYNC_INTERVAL_MS);
		this.syncAuthority().catch(console.error);
	}

	stop(): void {
		if (this.syncTimer) {
			clearInterval(this.syncTimer);
			this.syncTimer = null;
		}
	}

	async getStatus(): Promise<TreasuryStatus> {
		const signers = await this.getActiveSigners();
		const onlineCount = signers.filter(s => this.isOnline(s.lastHeartbeat)).length;
		const threshold = computeThreshold(signers.length, 'transfer');
		const authThreshold = computeThreshold(signers.length, 'authority_update');
		let balance: string | undefined;
		try {
			balance = await getTreasuryBalance(TREASURY_ACCOUNT);
		} catch {}

		return {
			operational: signers.length >= MIN_SIGNERS_FOR_OPERATION && !this.frozen,
			signerCount: signers.length,
			onlineSignerCount: onlineCount,
			threshold,
			authorityThreshold: authThreshold,
			treasuryAccount: TREASURY_ACCOUNT,
			balance,
			authorityInSync: this.authorityInSync,
			frozen: this.frozen,
			frozenBy: this.frozenBy ?? undefined,
			unfreezeVotes: this.frozen ? this.unfreezeVotes.size : undefined,
			unfreezeThreshold: this.frozen ? computeThreshold(signers.length, 'authority_update') : undefined,
		};
	}

	async getSignerInfoList(): Promise<TreasurySignerInfo[]> {
		if (!db) return [];
		const result = await db.query(
			`SELECT s.username, s.status, s.weight, s.joined_at, s.last_heartbeat,
				(SELECT COUNT(*) FROM treasury_vouches v WHERE v.candidate_username = s.username AND v.active = true) as vouch_count
			FROM treasury_signers s ORDER BY s.joined_at ASC`
		);
		return result.rows.map((r: any) => ({
			username: r.username,
			status: r.status,
			weight: r.weight,
			joinedAt: r.joined_at?.toISOString() ?? null,
			lastHeartbeat: r.last_heartbeat?.toISOString() ?? null,
			online: this.isOnline(r.last_heartbeat),
			vouchCount: Number(r.vouch_count || 0),
		}));
	}

	async joinSigner(username: string): Promise<{ success: boolean; error?: string }> {
		if (!db) return { success: false, error: 'Database not available' };

		const existing = await db.query(
			'SELECT * FROM treasury_signers WHERE username = $1', [username]
		);
		if (existing.rows.length > 0) {
			const row = existing.rows[0] as any;
			if (row.status === 'active') return { success: false, error: 'Already an active signer' };
			if (row.cooldown_until && new Date(row.cooldown_until) > new Date()) {
				return { success: false, error: `Cooldown active until ${row.cooldown_until}` };
			}

			const churnCheck = await this.checkChurn(username);
			if (churnCheck) return { success: false, error: churnCheck };

			await db.query(
				`UPDATE treasury_signers SET status = 'active', left_at = NULL, cooldown_until = NULL,
				last_heartbeat = NOW(), opt_events = opt_events + 1 WHERE username = $1`, [username]
			);
		} else {
			await db.query(
				`INSERT INTO treasury_signers (username, status, weight, last_heartbeat, opt_events)
				VALUES ($1, 'active', 1, NOW(), 1)`, [username]
			);
		}

		await this.auditLog('signer_join', 'join', username);
		return { success: true };
	}

	async leaveSigner(username: string): Promise<{ success: boolean; error?: string }> {
		if (!db) return { success: false, error: 'Database not available' };

		const existing = await db.query(
			'SELECT * FROM treasury_signers WHERE username = $1 AND status = $2', [username, 'active']
		);
		if (existing.rows.length === 0) return { success: false, error: 'Not an active signer' };

		const signers = await this.getActiveSigners();
		if (signers.length <= MIN_SIGNERS_FOR_OPERATION) {
			return { success: false, error: `Cannot leave: minimum ${MIN_SIGNERS_FOR_OPERATION} signers required` };
		}

		const cooldownUntil = new Date(Date.now() + OPT_OUT_COOLDOWN_MS);
		await db.query(
			`UPDATE treasury_signers SET status = 'left', left_at = NOW(), cooldown_until = $2,
			opt_events = opt_events + 1 WHERE username = $1`, [username, cooldownUntil]
		);

		await this.auditLog('signer_leave', 'leave', username);
		return { success: true };
	}

	async submitTransfer(
		to: string,
		amount: string,
		memo: string
	): Promise<{ success: boolean; txId?: string; error?: string }> {
		if (this.frozen) return { success: false, error: 'Treasury is frozen' };
		if (!db) return { success: false, error: 'Database not available' };

		const signers = await this.getActiveSigners();
		if (signers.length < MIN_SIGNERS_FOR_OPERATION) {
			return { success: false, error: `Need at least ${MIN_SIGNERS_FOR_OPERATION} active signers` };
		}

		const hbdAmount = parseFloat(amount);
		if (isNaN(hbdAmount) || hbdAmount <= 0) return { success: false, error: 'Invalid amount' };
		if (hbdAmount > SERVER_MAX_PER_TX_HBD) return { success: false, error: `Exceeds per-tx limit of ${SERVER_MAX_PER_TX_HBD} HBD` };

		this.resetDailyCapIfNeeded();
		if (this.dailySpent + hbdAmount > SERVER_DAILY_CAP_HBD) {
			return { success: false, error: `Exceeds daily cap (${this.dailySpent.toFixed(3)}/${SERVER_DAILY_CAP_HBD} HBD spent today)` };
		}

		const formattedAmount = `${hbdAmount.toFixed(3)} HBD`;
		const operations = buildTransferPayload(TREASURY_ACCOUNT, to, formattedAmount, memo);

		let txData;
		try {
			txData = await buildUnsignedTransaction(operations);
		} catch (err) {
			return { success: false, error: `Failed to build transaction: ${err}` };
		}

		const txId = randomUUID();
		const nonce = randomBytes(16).toString('hex');
		const threshold = computeThreshold(signers.length, 'transfer');
		const broadcastAfter = new Date(Date.now() + TRANSFER_DELAY_SECONDS * 1000);
		const metadata: SigningMetadata = { txType: 'transfer', recipient: to, amount: formattedAmount, memo };

		const session: PendingSession = {
			txId, nonce, digestHex: txData.digestHex, txObject: txData.tx,
			operations, metadata, threshold, signatures: {}, createdAt: Date.now(),
			broadcastAfter,
		};
		this.pendingSessions.set(txId, session);
		this.usedNonces.set(nonce, txId);

		await db.query(
			`INSERT INTO treasury_transactions (id, tx_type, status, threshold, digest_hex, tx_object, broadcast_after, metadata)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			[txId, 'transfer', 'pending', threshold, txData.digestHex, JSON.stringify(txData.tx), broadcastAfter, JSON.stringify(metadata)]
		);

		const isNew = await this.isNewRecipient(to);
		const anomalyFlags = this.anomalyDetector.recordTransaction(to, hbdAmount, txId, isNew);
		if (anomalyFlags.length > 0) {
			await this.auditLog(txId, 'anomaly_detected', undefined, undefined, anomalyFlags.join(','));
		}
		if (this.anomalyDetector.shouldAutoFreeze()) {
			this.frozen = true;
			this.frozenBy = 'auto';
			await this.saveFreezeState();
			await this.auditLog(txId, 'auto_freeze');
		}

		await this.auditLog(txId, 'transfer_submitted');
		return { success: true, txId };
	}

	getPendingSigningRequests(signerUsername: string): SigningRequest[] {
		const requests: SigningRequest[] = [];
		for (const session of this.pendingSessions.values()) {
			if (session.signatures[signerUsername]) continue;
			if (Date.now() - session.createdAt > SIGNING_TIMEOUT_MS) continue;

			requests.push({
				type: 'SigningRequest',
				version: TREASURY_PROTOCOL_VERSION,
				txId: session.txId,
				nonce: session.nonce,
				txDigest: session.digestHex,
				operations: session.operations,
				tx: session.txObject,
				expiresAt: new Date(session.createdAt + SIGNING_TIMEOUT_MS).toISOString(),
				metadata: session.metadata,
			});
		}
		return requests;
	}

	async handleSigningResponse(response: SigningResponse): Promise<void> {
		const session = this.pendingSessions.get(response.txId);
		if (!session) return;

		if (response.nonce !== session.nonce) return;
		if (this.usedNonces.get(response.nonce) !== response.txId) return;

		if (response.rejected) {
			await this.auditLog(response.txId, 'signature_rejected', response.signerUsername, response.rejectReason ?? undefined);
			return;
		}

		if (!response.signature) return;

		const signers = await this.getActiveSigners();
		const isSigner = signers.some(s => s.username === response.signerUsername);
		if (!isSigner) return;

		session.signatures[response.signerUsername] = response.signature;

		if (db) {
			await db.query(
				'UPDATE treasury_transactions SET signatures = $1 WHERE id = $2',
				[JSON.stringify(session.signatures), session.txId]
			);
		}

		await this.auditLog(response.txId, 'signature_received', response.signerUsername);

		const sigCount = Object.keys(session.signatures).length;
		if (sigCount >= session.threshold) {
			await this.tryBroadcast(session);
		}
	}

	async freeze(username: string, reason?: string): Promise<{ success: boolean; error?: string }> {
		const signers = await this.getActiveSigners();
		if (!signers.some(s => s.username === username)) {
			return { success: false, error: 'Only active signers can freeze' };
		}

		this.frozen = true;
		this.frozenBy = username;
		this.unfreezeVotes.clear();
		await this.saveFreezeState(reason);
		await this.auditLog('freeze', 'emergency_freeze', username);
		return { success: true };
	}

	async voteUnfreeze(username: string): Promise<{ success: boolean; frozen: boolean; voteCount: number; threshold: number; error?: string }> {
		if (!this.frozen) return { success: false, frozen: false, voteCount: 0, threshold: 0, error: 'Not frozen' };

		const signers = await this.getActiveSigners();
		if (!signers.some(s => s.username === username)) {
			return { success: false, frozen: true, voteCount: this.unfreezeVotes.size, threshold: 0, error: 'Only active signers can vote' };
		}

		this.unfreezeVotes.add(username);
		const threshold = computeThreshold(signers.length, 'authority_update');

		if (this.unfreezeVotes.size >= threshold) {
			this.frozen = false;
			this.frozenBy = null;
			this.unfreezeVotes.clear();
			await this.saveFreezeState();
			await this.auditLog('unfreeze', 'treasury_unfrozen', username);
			return { success: true, frozen: false, voteCount: 0, threshold };
		}

		await this.saveFreezeState();
		return { success: true, frozen: true, voteCount: this.unfreezeVotes.size, threshold };
	}

	async vetoTransaction(txId: string, username: string): Promise<{ success: boolean; error?: string }> {
		const signers = await this.getActiveSigners();
		if (!signers.some(s => s.username === username)) {
			return { success: false, error: 'Only active signers can veto' };
		}

		const session = this.pendingSessions.get(txId);
		if (session) {
			this.pendingSessions.delete(txId);
		}

		if (db) {
			await db.query(
				"UPDATE treasury_transactions SET status = 'vetoed' WHERE id = $1 AND status IN ('pending', 'signing')",
				[txId]
			);
		}

		await this.auditLog(txId, 'transaction_vetoed', username);
		return { success: true };
	}

	async getRecentTransactions(limit = 20): Promise<TreasuryTransaction[]> {
		if (!db) return [];
		const result = await db.query(
			'SELECT * FROM treasury_transactions ORDER BY created_at DESC LIMIT $1', [limit]
		);
		return result.rows.map((r: any) => ({
			id: r.id,
			txType: r.tx_type,
			status: r.status,
			threshold: r.threshold,
			signatureCount: Object.keys(JSON.parse(r.signatures || '{}')).length,
			signatures: JSON.parse(r.signatures || '{}'),
			broadcastAfter: r.broadcast_after?.toISOString(),
			broadcastTxId: r.broadcast_tx_id ?? undefined,
			metadata: JSON.parse(r.metadata || '{}'),
			createdAt: r.created_at?.toISOString() ?? '',
			broadcastedAt: r.broadcasted_at?.toISOString(),
		}));
	}

	async getTransactionById(txId: string): Promise<TreasuryTransaction | null> {
		if (!db) return null;
		const result = await db.query('SELECT * FROM treasury_transactions WHERE id = $1', [txId]);
		if (result.rows.length === 0) return null;
		const r = result.rows[0] as any;
		return {
			id: r.id,
			txType: r.tx_type,
			status: r.status,
			threshold: r.threshold,
			signatureCount: Object.keys(JSON.parse(r.signatures || '{}')).length,
			signatures: JSON.parse(r.signatures || '{}'),
			broadcastAfter: r.broadcast_after?.toISOString(),
			broadcastTxId: r.broadcast_tx_id ?? undefined,
			metadata: JSON.parse(r.metadata || '{}'),
			createdAt: r.created_at?.toISOString() ?? '',
			broadcastedAt: r.broadcasted_at?.toISOString(),
		};
	}

	async vouchForCandidate(
		voucherUsername: string,
		candidateUsername: string
	): Promise<{ success: boolean; vouchCount: number; error?: string }> {
		if (!db) return { success: false, vouchCount: 0, error: 'Database not available' };

		const isWitness = await isTopWitness(voucherUsername);
		if (!isWitness) return { success: false, vouchCount: 0, error: 'Only top-150 witnesses can vouch' };

		const existing = await db.query(
			'SELECT * FROM treasury_vouches WHERE voucher_username = $1 AND candidate_username = $2 AND active = true',
			[voucherUsername, candidateUsername]
		);
		if (existing.rows.length > 0) return { success: false, vouchCount: 0, error: 'Already vouched for this candidate' };

		const rank = await getWitnessRank(voucherUsername);
		await db.query(
			'INSERT INTO treasury_vouches (voucher_username, candidate_username, voucher_rank_at_vouch) VALUES ($1, $2, $3)',
			[voucherUsername, candidateUsername, rank]
		);

		const countResult = await db.query(
			'SELECT COUNT(*) as cnt FROM treasury_vouches WHERE candidate_username = $1 AND active = true',
			[candidateUsername]
		);
		const vouchCount = Number((countResult.rows[0] as any).cnt);
		return { success: true, vouchCount };
	}

	async revokeVouch(
		voucherUsername: string,
		candidateUsername: string
	): Promise<{ success: boolean; error?: string }> {
		if (!db) return { success: false, error: 'Database not available' };

		await db.query(
			`UPDATE treasury_vouches SET active = false, revoked_at = NOW(), revoke_reason = 'manual'
			WHERE voucher_username = $1 AND candidate_username = $2 AND active = true`,
			[voucherUsername, candidateUsername]
		);
		return { success: true };
	}

	async getVouchCandidates(): Promise<VouchCandidate[]> {
		if (!db) return [];
		const result = await db.query(
			`SELECT v.candidate_username, v.voucher_username, v.voucher_rank_at_vouch
			FROM treasury_vouches v WHERE v.active = true ORDER BY v.candidate_username`
		);

		const grouped = new Map<string, Array<{ voucherUsername: string; voucherRank: number }>>();
		for (const r of result.rows as any[]) {
			const key = r.candidate_username;
			if (!grouped.has(key)) grouped.set(key, []);
			grouped.get(key)!.push({
				voucherUsername: r.voucher_username,
				voucherRank: r.voucher_rank_at_vouch ?? 999,
			});
		}

		return Array.from(grouped.entries()).map(([candidate, vouches]) => ({
			candidateUsername: candidate,
			vouches,
			vouchCount: vouches.length,
			requiredVouches: MIN_TREASURY_VOUCHES,
			eligible: vouches.length >= MIN_TREASURY_VOUCHES,
		}));
	}

	async heartbeat(username: string): Promise<void> {
		if (!db) return;
		await db.query(
			'UPDATE treasury_signers SET last_heartbeat = NOW() WHERE username = $1 AND status = $2',
			[username, 'active']
		);
	}

	async syncAuthority(): Promise<void> {
		try {
			const signers = await this.getActiveSigners();
			if (signers.length === 0) {
				this.authorityInSync = false;
				return;
			}

			const authority = await getAccountAuthority(TREASURY_ACCOUNT);
			if (!authority) {
				this.authorityInSync = false;
				return;
			}

			const expectedSigners = signers.map(s => s.username);
			const expectedThreshold = computeThreshold(signers.length, 'transfer');

			this.authorityInSync = authorityMatchesSigners(
				authority.active.account_auths,
				authority.active.weight_threshold,
				expectedSigners,
				expectedThreshold
			);
		} catch (err) {
			console.error('[treasury] authority sync error:', err);
		}
	}

	private async tryBroadcast(session: PendingSession): Promise<void> {
		if (session.broadcastAfter && new Date() < session.broadcastAfter) return;

		const signedTx = {
			...session.txObject,
			signatures: Object.values(session.signatures),
		};

		try {
			if (db) {
				await db.query(
					"UPDATE treasury_transactions SET status = 'broadcast' WHERE id = $1", [session.txId]
				);
			}

			const result = await broadcastSignedTransaction(signedTx);

			if (db) {
				await db.query(
					`UPDATE treasury_transactions SET status = 'completed', broadcast_tx_id = $2,
					broadcast_block_num = $3, broadcasted_at = NOW() WHERE id = $1`,
					[session.txId, result.id, result.block_num]
				);
			}

			const hbdAmount = parseFloat(session.metadata.amount || '0');
			this.dailySpent += hbdAmount;

			this.pendingSessions.delete(session.txId);
			await this.auditLog(session.txId, 'broadcast_success');
		} catch (err) {
			const reason = err instanceof Error ? err.message : String(err);
			if (db) {
				await db.query(
					"UPDATE treasury_transactions SET status = 'failed', failure_reason = $2 WHERE id = $1",
					[session.txId, reason]
				);
			}
			this.pendingSessions.delete(session.txId);
			await this.auditLog(session.txId, 'broadcast_failed', undefined, reason);
		}
	}

	private async getActiveSigners(): Promise<Array<{ username: string; lastHeartbeat: Date | null }>> {
		if (!db) return [];
		const result = await db.query(
			"SELECT username, last_heartbeat FROM treasury_signers WHERE status = 'active'"
		);
		return result.rows.map((r: any) => ({
			username: r.username,
			lastHeartbeat: r.last_heartbeat,
		}));
	}

	private isOnline(lastHeartbeat: Date | null): boolean {
		if (!lastHeartbeat) return false;
		return Date.now() - new Date(lastHeartbeat).getTime() < HEARTBEAT_TIMEOUT_MS;
	}

	private async checkChurn(username: string): Promise<string | null> {
		if (!db) return null;
		const result = await db.query(
			'SELECT opt_events, joined_at FROM treasury_signers WHERE username = $1', [username]
		);
		if (result.rows.length === 0) return null;
		const row = result.rows[0] as any;
		if (row.opt_events >= CHURN_THRESHOLD) {
			return `Churn limit reached (${row.opt_events} opt events). Cooldown required.`;
		}
		return null;
	}

	private async isNewRecipient(recipient: string): Promise<boolean> {
		if (!db) return true;
		const result = await db.query(
			"SELECT COUNT(*) as cnt FROM treasury_transactions WHERE metadata LIKE $1 AND status = 'completed'",
			[`%"recipient":"${recipient}"%`]
		);
		return Number((result.rows[0] as any).cnt) === 0;
	}

	private resetDailyCapIfNeeded(): void {
		const now = Date.now();
		const dayStart = new Date().setUTCHours(0, 0, 0, 0);
		if (this.dailyResetAt < dayStart) {
			this.dailySpent = 0;
			this.dailyResetAt = dayStart;
		}
	}

	private async loadFreezeState(): Promise<void> {
		if (!db) return;
		try {
			const result = await db.query('SELECT * FROM treasury_freeze_state ORDER BY id DESC LIMIT 1');
			if (result.rows.length > 0) {
				const row = result.rows[0] as any;
				this.frozen = row.frozen;
				this.frozenBy = row.frozen_by;
				const votes = JSON.parse(row.unfreeze_votes || '[]');
				this.unfreezeVotes = new Set(votes);
			}
		} catch {}
	}

	private async saveFreezeState(reason?: string): Promise<void> {
		if (!db) return;
		const signers = await this.getActiveSigners();
		const threshold = computeThreshold(signers.length, 'authority_update');
		const votes = JSON.stringify(Array.from(this.unfreezeVotes));

		const existing = await db.query('SELECT id FROM treasury_freeze_state ORDER BY id DESC LIMIT 1');
		if (existing.rows.length > 0) {
			await db.query(
				`UPDATE treasury_freeze_state SET frozen = $1, frozen_by = $2, frozen_at = $3,
				unfreeze_votes = $4, unfreeze_threshold = $5, reason = COALESCE($6, reason), updated_at = NOW()
				WHERE id = $7`,
				[this.frozen, this.frozenBy, this.frozen ? new Date() : null, votes, threshold, reason ?? null, (existing.rows[0] as any).id]
			);
		} else {
			await db.query(
				`INSERT INTO treasury_freeze_state (frozen, frozen_by, frozen_at, unfreeze_votes, unfreeze_threshold, reason)
				VALUES ($1, $2, $3, $4, $5, $6)`,
				[this.frozen, this.frozenBy, this.frozen ? new Date() : null, votes, threshold, reason ?? null]
			);
		}
	}

	private async auditLog(txId: string, action: string, username?: string, rejectReason?: string, anomalyFlags?: string): Promise<void> {
		if (!db) return;
		try {
			await db.query(
				'INSERT INTO treasury_audit_log (tx_id, action, username, reject_reason, anomaly_flags) VALUES ($1, $2, $3, $4, $5)',
				[txId, action, username ?? null, rejectReason ?? null, anomalyFlags ?? null]
			);
		} catch (err) {
			console.error('[treasury] audit log write failed:', err);
		}
	}
}

export const treasuryCoordinator = new TreasuryCoordinator();
