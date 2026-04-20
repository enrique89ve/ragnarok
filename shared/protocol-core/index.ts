/**
 * Ragnarok Protocol Core — Public API
 *
 * Single entry point for protocol op processing.
 * Both client and server call this with their own StateAdapter implementation.
 */

export { normalizeRawOp } from './normalize';
export type { NormalizeResult } from './normalize';
export { applyOp, autoFinalizeExpiredCommits } from './apply';
export type { ProtocolCoreDeps } from './apply';
export { canonicalStringify, sha256Hash } from './hash';
export { verifyPoW, deriveChallenge, POW_CONFIG } from './pow';
export type { PoWConfig, PoWResult } from './pow';
export * from './types';

// v1.2: Broadcast utilities (NFTLox-inspired patterns)
export {
	// BuildResult pattern
	buildSuccess, buildFailure, validationError,
	// Size estimation + batching
	estimatePayloadBytes, validatePayloadSize, splitIntoBatches, estimateBatchCount,
	// Input sanitization
	sanitizeString, sanitizePayload, isValidHiveUsername,
	// Deterministic UIDs
	fnv1a, generateDeterministicCardUid, generateDeterministicPackUid,
	generateOriginDna, generateInstanceDna, validateArtId,
	// Structured memos
	buildTransferMemo, parseTransferMemo,
	// Mint session crash recovery
	saveMintSession, loadMintSession, clearMintSession,
	getNextPendingBatch, getSessionProgress,
} from './broadcast-utils';
export type {
	ValidationError, BuildResult, HiveCustomJsonOp,
	MintSession, MintSessionBatch,
} from './broadcast-utils';
