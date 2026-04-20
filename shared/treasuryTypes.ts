export interface SigningRequest {
	type: 'SigningRequest';
	version: number;
	txId: string;
	nonce: string;
	txDigest: string;
	operations: any[];
	tx: any;
	expiresAt: string;
	metadata: SigningMetadata;
}

export interface SigningResponse {
	type: 'SigningResponse';
	version: number;
	txId: string;
	nonce: string;
	signature: string | null;
	rejected: boolean;
	rejectReason: string | null;
	signerUsername: string;
}

export interface SigningMetadata {
	txType: 'transfer' | 'authority_update';
	recipient?: string;
	amount?: string;
	memo?: string;
}

export interface TreasuryStatus {
	operational: boolean;
	signerCount: number;
	onlineSignerCount: number;
	threshold: number;
	authorityThreshold: number;
	treasuryAccount: string;
	balance?: string;
	authorityInSync: boolean;
	frozen: boolean;
	frozenBy?: string;
	unfreezeVotes?: number;
	unfreezeThreshold?: number;
}

export interface TreasurySignerInfo {
	username: string;
	status: string;
	weight: number;
	joinedAt: string | null;
	lastHeartbeat: string | null;
	online: boolean;
	vouchCount?: number;
}

export interface TreasuryTransaction {
	id: string;
	txType: 'transfer' | 'authority_update';
	status: 'pending' | 'signing' | 'broadcast' | 'completed' | 'failed' | 'vetoed' | 'expired';
	threshold: number;
	signatureCount: number;
	signatures: Record<string, string>;
	broadcastAfter?: string;
	broadcastTxId?: string;
	metadata: SigningMetadata;
	createdAt: string;
	broadcastedAt?: string;
}

export interface VouchCandidate {
	candidateUsername: string;
	vouches: Array<{ voucherUsername: string; voucherRank: number }>;
	vouchCount: number;
	requiredVouches: number;
	eligible: boolean;
}

export const TREASURY_PROTOCOL_VERSION = 1;
export const MIN_SIGNERS_FOR_OPERATION = 3;
export const TRANSFER_QUORUM_RATIO = 0.6;
export const AUTHORITY_QUORUM_RATIO = 0.8;
export const SIGNING_TIMEOUT_MS = 45_000;
export const AUTHORITY_SYNC_INTERVAL_MS = 10 * 60_000;
export const OPT_OUT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const CHURN_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
export const CHURN_THRESHOLD = 3;
export const CHURN_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
export const MIN_TREASURY_VOUCHES = 3;
export const MAX_OPS_PER_TRANSACTION = 10;
export const MAX_BATCH_TOTAL_HBD = 10.0;
export const IMMEDIATE_BROADCAST_MAX_HBD = 1.0;
export const TRANSFER_DELAY_SECONDS = 3600;
export const AUTHORITY_UPDATE_DELAY_SECONDS = 21600;
export const SERVER_MAX_PER_TX_HBD = 5.0;
export const SERVER_DAILY_CAP_HBD = 200.0;
