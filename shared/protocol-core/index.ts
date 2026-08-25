/**
 * Ragnarok Protocol Core — Public API
 *
 * Single entry point for protocol op processing.
 * Both client and server call this with their own StateAdapter implementation.
 */

export {
	normalizeRawOp,
	rawJsonByteLength,
	GLOBAL_RAW_JSON_BYTE_CEILING,
	DAILY_QUEST_CLAIM_RAW_JSON_BYTE_LIMIT,
	RUNE_EXCHANGE_RAW_JSON_BYTE_LIMIT,
} from './normalize';
export type { NormalizeResult, NormalizeOptions } from './normalize';
export { DAILY_QUEST_TYPES, isDailyQuestType, utcDayString } from './dailyQuest';
export type { DailyQuestType } from './dailyQuest';
export { applyOp, autoFinalizeExpiredCommits } from './apply';
export type { ProtocolCoreDeps } from './apply';
export { canonicalStringify, sha256Hash } from './hash';
export {
	deriveRuneSeasonId,
	isRuneSeasonId,
	type RuneSeasonIdInput,
} from './runeSeasonHash';
export {
	ADMIN_APPROVAL_DOMAIN,
	ADMIN_APPROVAL_KEY_TYPE,
	ADMIN_BROADCAST_PROTOCOLS,
	ADMIN_SESSION_LOGIN_ACTION,
	ADMIN_SESSION_LOGIN_DOMAIN,
	ADMIN_MULTISIG_ACTIONS,
	NFTLOX_ADMIN_ACTIONS,
	attachAdminApproval,
	buildAdminApprovalMessage,
	buildAdminSessionLoginMessage,
	buildAdminSessionLoginPayload,
	isAdminBroadcastProtocol,
	isAdminMultisigAction,
	isNftLoxAdminAction,
	isSupportedAdminBroadcastAction,
	parseAdminBroadcastBody,
	parseAdminMultisigPrepareBody,
	readAdminApproval,
	stripAdminApprovalFields,
} from './adminMultisig';
export type {
	AdminApproval,
	AdminBroadcastAction,
	AdminBroadcastBodyResult,
	AdminBroadcastProtocol,
	AdminApprovalReadResult,
	AdminMultisigAction,
	AdminMultisigPrepareBodyResult,
	AdminSessionLoginInput,
	AdminSessionLoginPayload,
	NftLoxAdminAction,
} from './adminMultisig';
export {
	PACK_ID_RANGES, getPackIdRanges,
	lcgNext, deriveLegacyPackSeed,
	getLegacyPackCardCount, pickLegacyPackCardIds,
	filterCollectibleIdsInRanges, filterCollectibleIdsForPack,
} from './packDraw';
export { verifyPoW, deriveChallenge, POW_CONFIG } from './pow';
export type { PoWConfig, PoWResult } from './pow';
export * from './types';
export * from './rewardCatalog';
export * from './runeSeason0Smoke';
export * from './acquisitionProvenance';
export * from './playerCollection';
export * from './deckVerification';
export * from './xpEconomy';
export * from './localSettlement';
export * from './eloEconomy';
export * from './phaseGate';
export * from './localCampaignSettlement';
export * from './localDailyQuestSettlement';
export * from './gameLimits';
export * from './pokerActionPolicy';

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
