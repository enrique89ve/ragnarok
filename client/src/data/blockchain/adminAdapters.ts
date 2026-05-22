import { signHiveMessage } from '../HiveAuth';
import {
	getHiveKeychain,
	getHiveKeychainError,
	type HiveKeychainResponse,
} from '../HiveKeychain';
import type { HiveBroadcastResult } from '../HiveSync';
import {
	NFTLOX_COLLECTION_SYMBOL,
	RAGNAROK_ADMIN_OPERATOR_ACCOUNT,
} from './hiveConfig';
import { hiveSync } from '../HiveSync';
import { RAGNAROK_APP_ID } from '../schemas/HiveTypes';
import {
	buildAdminSessionLoginMessage,
	buildAdminSessionLoginPayload,
	type AdminBroadcastProtocol,
	type AdminMultisigAction,
	type AdminSessionLoginPayload,
	type NftLoxAdminAction,
} from '@shared/protocol-core';
import {
	RAGNAROK_CLOSED_BETA_CUTOVER_CHECK_IDS,
	RAGNAROK_RUNTIME_PHASES,
	type RagnarokClosedBetaCutoverGate,
	type RagnarokClosedBetaCutoverCheck,
	type RagnarokClosedBetaCutoverCheckId,
	type RagnarokRuntimePhase,
} from '@shared/runtimeConfig';

type NftLoxSeedInput = {
	readonly artId: string;
	readonly name: string;
	readonly description: string;
	readonly imageUrl: string;
	readonly maxSupply: number;
	readonly immutableData: Record<string, unknown>;
};

type NftLoxBulkDistributeItem = {
	readonly seedId: string;
	readonly quantity: number;
	readonly originBlock?: number;
};

const NFTLOX_ADMIN_DISABLED_ERROR = 'NFTLox admin actions are disabled until the NFTLox protocol is finalized.';
const ADMIN_SESSION_LOGIN_TTL_MS = 5 * 60 * 1000;

type HiveTransactionObject = Record<string, unknown> & {
	readonly signatures?: readonly string[];
};

type AdminMultisigPrepareResponse = {
	readonly success: true;
	readonly transaction: HiveTransactionObject;
	readonly digest: string;
	readonly expiration: string;
};

export type AdminServerConfig = {
	readonly stage: string;
	readonly protocolId: string;
	readonly collectionId: string;
	readonly nftLoxProtocolId: string;
	readonly resetEpoch: string;
	readonly resettable: boolean;
	readonly economic: boolean;
	readonly runtimePhase: RagnarokRuntimePhase;
	readonly seasonStart: string;
	readonly storageNamespace: string;
	readonly qaFullCatalogEnabled: boolean;
	readonly closedBetaCutover: RagnarokClosedBetaCutoverGate;
	readonly adminAccount: string;
	readonly adminOperatorAccount: string;
	readonly multisigConfigured: boolean;
};

export type AdminSessionStatus = {
	readonly authenticated: boolean;
	readonly account?: string;
	readonly adminAccount: string;
	readonly adminOperatorAccount: string;
	readonly nonce?: number;
	readonly createdAt?: number;
	readonly expiresAt?: number;
	readonly lastSeenAt?: number;
	readonly loginSignature?: boolean;
	readonly reason?: string;
};

export type AdminP2PStatus = {
	readonly success: true;
	readonly updatedAt: number;
	readonly relay: {
		readonly activeRooms: number;
		readonly activeConnections: number;
		readonly activeFullRooms: number;
		readonly activePlayersInMatches: number;
		readonly totalConnections: number;
		readonly totalMessagesRelayed: number;
		readonly totalFramesDropped: number;
		readonly totalErrors: number;
		readonly errorsByReason: Readonly<Record<string, number>>;
		readonly lastErrorAt: number | null;
		readonly lastErrorReason: string | null;
	};
	readonly matchmaking: {
		readonly queueLength: number;
		readonly activeMatches: number;
		readonly queuedPlayersWithUsername: number;
		readonly oldestQueuedMs: number | null;
	};
	readonly social: {
		readonly onlineUsers: number;
		readonly availableUsers: number;
		readonly matchmakingUsers: number;
		readonly inMatchUsers: number;
		readonly reconnectingUsers: number;
		readonly busyUsers: number;
		readonly pendingChallenges: number;
	};
	readonly summary: {
		readonly playersInRelayMatches: number;
		readonly activeRelayRooms: number;
		readonly activeMatchmakingPairs: number;
		readonly onlinePresenceUsers: number;
		readonly pendingChallenges: number;
		readonly totalErrors: number;
		readonly lastErrorAt: number | null;
		readonly lastErrorReason: string | null;
	};
};

export type AdminSessionRequestResult =
	| { readonly success: true; readonly session: AdminSessionStatus }
	| { readonly success: false; readonly error: string };

type AdminSession =
	| {
		readonly success: true;
		readonly username: string;
		readonly config: AdminServerConfig;
	}
	| {
		readonly success: false;
		readonly error: string;
	};

let lastAdminNonce = 0;
let adminConfigPromise: Promise<AdminServerConfig> | null = null;
let adminConfigAllowMissingOperatorPromise: Promise<AdminServerConfig> | null = null;

type AdminServerConfigOptions = {
	readonly requireMultisig?: boolean;
};

const ADMIN_CONFIG_REQUIRED_STRING_FIELDS = [
	'stage',
	'protocolId',
	'collectionId',
	'nftLoxProtocolId',
	'resetEpoch',
	'seasonStart',
	'storageNamespace',
	'adminAccount',
] as const;
const ADMIN_CONFIG_REQUIRED_BOOLEAN_FIELDS = [
	'resettable',
	'economic',
	'qaFullCatalogEnabled',
	'multisigConfigured',
] as const;

function nextAdminNonce(): number {
	const now = Date.now();
	lastAdminNonce = now > lastAdminNonce ? now : lastAdminNonce + 1;
	return lastAdminNonce;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasNonEmptyStringFields(
	body: Record<string, unknown>,
	fields: readonly string[],
): boolean {
	return fields.every((field) => isNonEmptyString(body[field]));
}

function hasBooleanFields(
	body: Record<string, unknown>,
	fields: readonly string[],
): boolean {
	return fields.every((field) => typeof body[field] === 'boolean');
}

function isAdminServerConfig(value: unknown): value is AdminServerConfig {
	if (typeof value !== 'object' || value === null) return false;
	const body = value as Record<string, unknown>;
	return body.success === true
		&& hasNonEmptyStringFields(body, ADMIN_CONFIG_REQUIRED_STRING_FIELDS)
		&& hasBooleanFields(body, ADMIN_CONFIG_REQUIRED_BOOLEAN_FIELDS)
		&& isRagnarokRuntimePhase(body.runtimePhase)
		&& isRagnarokClosedBetaCutoverGate(body.closedBetaCutover)
		&& typeof body.adminOperatorAccount === 'string';
}

function isRagnarokRuntimePhase(value: unknown): value is RagnarokRuntimePhase {
	return typeof value === 'string' && RAGNAROK_RUNTIME_PHASES.includes(value as RagnarokRuntimePhase);
}

function isClosedBetaCutoverCheckId(value: unknown): value is RagnarokClosedBetaCutoverCheckId {
	return (
		typeof value === 'string'
		&& RAGNAROK_CLOSED_BETA_CUTOVER_CHECK_IDS.includes(value as RagnarokClosedBetaCutoverCheckId)
	);
}

function isRagnarokClosedBetaCutoverCheck(value: unknown): value is RagnarokClosedBetaCutoverCheck {
	if (typeof value !== 'object' || value === null) return false;
	const body = value as Record<string, unknown>;
	return isClosedBetaCutoverCheckId(body.id)
		&& (body.status === 'pass' || body.status === 'fail')
		&& typeof body.detail === 'string';
}

function isRagnarokClosedBetaCutoverGate(value: unknown): value is RagnarokClosedBetaCutoverGate {
	if (typeof value !== 'object' || value === null) return false;
	const body = value as Record<string, unknown>;
	return body.targetPhase === 'closed-beta'
		&& isRagnarokRuntimePhase(body.activePhase)
		&& typeof body.resetEpoch === 'string'
		&& body.resetEpoch.trim().length > 0
		&& typeof body.storageNamespace === 'string'
		&& body.storageNamespace.trim().length > 0
		&& typeof body.operatorSignoffRequired === 'boolean'
		&& typeof body.inviteBlocked === 'boolean'
		&& Array.isArray(body.blockerIds)
		&& body.blockerIds.every(isClosedBetaCutoverCheckId)
		&& Array.isArray(body.checks)
		&& body.checks.every(isRagnarokClosedBetaCutoverCheck);
}

function isAdminSessionStatus(value: unknown): value is AdminSessionStatus {
	if (typeof value !== 'object' || value === null) return false;
	const body = value as Record<string, unknown>;
	return body.success === true
		&& typeof body.authenticated === 'boolean'
		&& typeof body.adminAccount === 'string'
		&& body.adminAccount.trim().length > 0
		&& typeof body.adminOperatorAccount === 'string';
}

function isAdminSessionVerifyResponse(value: unknown): value is {
	readonly success: true;
	readonly session: AdminSessionStatus;
} {
	if (typeof value !== 'object' || value === null) return false;
	const body = value as Record<string, unknown>;
	const session = body.session;
	if (typeof session !== 'object' || session === null) return false;
	return body.success === true
		&& isAdminSessionStatus({ ...(session as Record<string, unknown>), success: true });
}

function isAdminP2PStatus(value: unknown): value is AdminP2PStatus {
	if (typeof value !== 'object' || value === null) return false;
	const body = value as Record<string, unknown>;
	return body.success === true
		&& typeof body.updatedAt === 'number'
		&& isRecord(body.relay)
		&& isRecord(body.matchmaking)
		&& isRecord(body.social)
		&& isRecord(body.summary);
}

function isHiveTransactionObject(value: unknown): value is HiveTransactionObject {
	if (typeof value !== 'object' || value === null) return false;
	const body = value as Record<string, unknown>;
	return typeof body.ref_block_num === 'number'
		&& typeof body.ref_block_prefix === 'number'
		&& typeof body.expiration === 'string'
		&& Array.isArray(body.operations)
		&& Array.isArray(body.signatures);
}

function isAdminMultisigPrepareResponse(value: unknown): value is AdminMultisigPrepareResponse {
	if (typeof value !== 'object' || value === null) return false;
	const body = value as Record<string, unknown>;
	return body.success === true
		&& isHiveTransactionObject(body.transaction)
		&& typeof body.digest === 'string'
		&& typeof body.expiration === 'string';
}

function readAdminApiErrorBody(body: unknown, fallback: string): string {
	if (
		typeof body === 'object'
		&& body !== null
		&& typeof (body as { error?: unknown }).error === 'string'
	) {
		return (body as { error: string }).error;
	}
	return fallback;
}

export async function getAdminServerConfig(options: AdminServerConfigOptions = {}): Promise<AdminServerConfig> {
	const requireMultisig = options.requireMultisig ?? true;
	const cachedPromise = requireMultisig ? adminConfigPromise : adminConfigAllowMissingOperatorPromise;
	if (cachedPromise) return cachedPromise;

	const request = fetch('/api/admin/config')
		.then(async response => {
			const body: unknown = await response.json().catch(() => null);
			if (!response.ok) {
				const error = typeof body === 'object'
					&& body !== null
					&& typeof (body as { error?: unknown }).error === 'string'
					? (body as { error: string }).error
					: `Admin config failed with HTTP ${response.status}`;
				throw new Error(error);
			}
			if (!isAdminServerConfig(body)) {
				throw new Error('Admin config response is invalid');
			}
			if (requireMultisig && !body.multisigConfigured) {
				throw new Error('Admin operator account is not configured');
			}
			return {
				stage: body.stage.trim(),
				protocolId: body.protocolId.trim(),
				collectionId: body.collectionId.trim(),
				nftLoxProtocolId: body.nftLoxProtocolId.trim(),
				resetEpoch: body.resetEpoch.trim(),
				resettable: body.resettable,
				economic: body.economic,
				runtimePhase: body.runtimePhase,
				seasonStart: body.seasonStart.trim(),
				storageNamespace: body.storageNamespace.trim(),
				qaFullCatalogEnabled: body.qaFullCatalogEnabled,
				closedBetaCutover: body.closedBetaCutover,
				adminAccount: body.adminAccount.trim(),
				adminOperatorAccount: body.adminOperatorAccount.trim(),
				multisigConfigured: body.multisigConfigured,
			};
		})
		.catch(err => {
			if (requireMultisig) {
				adminConfigPromise = null;
			} else {
				adminConfigAllowMissingOperatorPromise = null;
			}
			throw err;
		});
	if (requireMultisig) {
		adminConfigPromise = request;
	} else {
		adminConfigAllowMissingOperatorPromise = request;
	}
	return request;
}

export async function getAdminP2PStatus(): Promise<AdminP2PStatus> {
	const response = await fetch('/api/admin/p2p/status', {
		credentials: 'same-origin',
	});
	const contentType = response.headers.get('content-type') ?? '';
	const body: unknown = contentType.includes('application/json')
		? await response.json().catch(() => null)
		: null;
	if (!response.ok) {
		throw new Error(readAdminApiErrorBody(body, `Admin P2P status failed with HTTP ${response.status}`));
	}
	if (!contentType.includes('application/json')) {
		throw new Error('Admin P2P status endpoint is unavailable. Restart the dev server so /api/admin/p2p/status is mounted.');
	}
	if (!isAdminP2PStatus(body)) {
		throw new Error('Admin P2P status response is invalid');
	}
	return body;
}

export async function getAdminSessionStatus(): Promise<AdminSessionStatus> {
	const response = await fetch('/api/admin/session/status', {
		credentials: 'same-origin',
	});
	const body: unknown = await response.json().catch(() => null);
	if (!response.ok) {
		throw new Error(readAdminApiErrorBody(body, `Admin session failed with HTTP ${response.status}`));
	}
	if (!isAdminSessionStatus(body)) {
		throw new Error('Admin session status response is invalid');
	}
	return {
		authenticated: body.authenticated,
		account: typeof body.account === 'string' ? body.account.trim() : undefined,
		adminAccount: body.adminAccount.trim(),
		adminOperatorAccount: body.adminOperatorAccount.trim(),
		nonce: typeof body.nonce === 'number' ? body.nonce : undefined,
		createdAt: typeof body.createdAt === 'number' ? body.createdAt : undefined,
		expiresAt: typeof body.expiresAt === 'number' ? body.expiresAt : undefined,
		lastSeenAt: typeof body.lastSeenAt === 'number' ? body.lastSeenAt : undefined,
		loginSignature: body.loginSignature === true,
		reason: typeof body.reason === 'string' ? body.reason : undefined,
	};
}

async function requireConfiguredAdminWallet(configOverride?: AdminServerConfig): Promise<AdminSession> {
	const username = hiveSync.getUsername();
	if (!username) {
		return { success: false, error: 'Not logged in. Connect a Hive wallet first.' };
	}
	let config: AdminServerConfig;
	try {
		config = configOverride ?? await getAdminServerConfig();
	} catch (err) {
		return {
			success: false,
			error: err instanceof Error ? err.message : 'Admin config is unavailable',
		};
	}
	if (username !== config.adminAccount) {
		return { success: false, error: `Must be logged in as @${config.adminAccount}, currently @${username}` };
	}
	return { success: true, username, config };
}

async function requireFrontendAdmin(): Promise<AdminSession> {
	const session = await requireConfiguredAdminWallet();
	if (!session.success) return session;

	let status: AdminSessionStatus;
	try {
		status = await getAdminSessionStatus();
	} catch (err) {
		return {
			success: false,
			error: err instanceof Error ? err.message : 'Admin server session is unavailable',
		};
	}
	if (!status.authenticated || status.account !== session.config.adminAccount) {
		return {
			success: false,
			error: 'Admin server session is not active. Re-authorize admin panel access.',
		};
	}
	return session;
}

export async function requestAdminPanelSession(
	config?: AdminServerConfig,
): Promise<AdminSessionRequestResult> {
	const session = await requireConfiguredAdminWallet(config);
	if (!session.success) return { success: false, error: session.error };

	try {
		const issuedAt = Date.now();
		const expiresAt = issuedAt + ADMIN_SESSION_LOGIN_TTL_MS;
		const payload: AdminSessionLoginPayload = buildAdminSessionLoginPayload({
			adminAccount: session.config.adminAccount,
			protocolId: session.config.protocolId,
			stage: session.config.stage,
			nonce: nextAdminNonce(),
			issuedAt,
			expiresAt,
		});
		const message = buildAdminSessionLoginMessage(payload);

		const adminSigned = await signHiveMessage(message, {
			username: session.username,
			keyType: 'Posting',
			title: 'Authorize Ragnarok Admin Panel',
		});
		if (!adminSigned.success || !adminSigned.signature) {
			return {
				success: false,
				error: adminSigned.error ?? 'Hive Keychain admin Posting approval rejected',
			};
		}

		const verifyResponse = await fetch('/api/admin/session/login', {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				account: session.username,
				nonce: payload.nonce,
				payload,
				message,
				signature: adminSigned.signature,
			}),
		});
		const verifyBody: unknown = await verifyResponse.json().catch(() => null);
		if (!verifyResponse.ok) {
			return {
				success: false,
				error: readAdminApiErrorBody(
					verifyBody,
					`Admin session login failed with HTTP ${verifyResponse.status}`,
				),
			};
		}
		if (!isAdminSessionVerifyResponse(verifyBody)) {
			return { success: false, error: 'Admin session login response is invalid' };
		}
		return { success: true, session: verifyBody.session };
	} catch (err) {
		return { success: false, error: err instanceof Error ? err.message : String(err) };
	}
}

export async function logoutAdminPanelSession(): Promise<void> {
	await fetch('/api/admin/session/logout', {
		method: 'POST',
		credentials: 'same-origin',
	});
}

async function readAdminResponse(response: Response): Promise<HiveBroadcastResult> {
	let body: unknown = null;
	try {
		body = await response.json();
	} catch {
		return {
			success: false,
			error: `Admin broadcast failed with HTTP ${response.status}`,
		};
	}

	if (typeof body !== 'object' || body === null) {
		return { success: false, error: 'Admin broadcast returned an invalid response' };
	}

	const result = body as HiveBroadcastResult;
	return {
		success: Boolean(result.success),
		trxId: typeof result.trxId === 'string' ? result.trxId : undefined,
		blockNum: typeof result.blockNum === 'number' ? result.blockNum : undefined,
		error: typeof result.error === 'string'
			? result.error
		: response.ok
			? undefined
			: `Admin broadcast failed with HTTP ${response.status}`,
	};
}

async function signHiveTransactionWithKeychain(input: {
	readonly username: string;
	readonly transaction: HiveTransactionObject;
	readonly title: string;
}): Promise<
	| { readonly success: true; readonly transaction: HiveTransactionObject }
	| { readonly success: false; readonly error: string }
> {
	const keychain = getHiveKeychain();
	const requestSignTx = keychain?.requestSignTx?.bind(keychain);
	if (!requestSignTx) {
		return { success: false, error: 'Hive Keychain 3.x+ requestSignTx API is required for admin multisig' };
	}

	const keychainPromise = new Promise<
		| { readonly success: true; readonly transaction: HiveTransactionObject }
		| { readonly success: false; readonly error: string }
	>((resolve) => {
		requestSignTx(
			input.username,
			input.transaction,
			'Active',
			(response: HiveKeychainResponse) => {
				if (!response.success) {
					resolve({
						success: false,
						error: getHiveKeychainError(response, 'Hive Keychain transaction signing rejected'),
					});
					return;
				}
				const signedTransaction = response.result;
				if (!isHiveTransactionObject(signedTransaction)) {
					resolve({ success: false, error: 'Hive Keychain response did not include a signed transaction' });
					return;
				}
				if (!signedTransaction.signatures?.[0]) {
					resolve({ success: false, error: 'Hive Keychain response did not include an admin signature' });
					return;
				}
				resolve({ success: true, transaction: signedTransaction });
			},
		);
	});

	const timeout = new Promise<{ readonly success: false; readonly error: string }>((resolve) =>
		setTimeout(
			() => resolve({ success: false, error: `Keychain timeout while signing ${input.title}` }),
			60_000,
		),
	);

	return Promise.race([keychainPromise, timeout]);
}

async function requestApprovedAdminBroadcast(input: {
	readonly protocol: AdminBroadcastProtocol;
	readonly action: AdminMultisigAction | NftLoxAdminAction;
	readonly payload: Record<string, unknown>;
	readonly title: string;
}): Promise<HiveBroadcastResult> {
	const session = await requireFrontendAdmin();
	if (!session.success) return { success: false, error: session.error };

	const prepareResponse = await fetch('/api/admin/multisig/prepare', {
		method: 'POST',
		credentials: 'same-origin',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			protocol: input.protocol,
			action: input.action,
			payload: input.payload,
		}),
	});
	const prepareBody: unknown = await prepareResponse.json().catch(() => null);
	if (!prepareResponse.ok) {
		return {
			success: false,
			error: readAdminApiErrorBody(
				prepareBody,
				`Admin multisig prepare failed with HTTP ${prepareResponse.status}`,
			),
		};
	}
	if (!isAdminMultisigPrepareResponse(prepareBody)) {
		return { success: false, error: 'Admin multisig prepare response is invalid' };
	}

	const signed = await signHiveTransactionWithKeychain({
		username: session.username,
		transaction: prepareBody.transaction,
		title: input.title,
	});
	if (!signed.success) return signed;

	const response = await fetch('/api/admin/multisig/broadcast', {
		method: 'POST',
		credentials: 'same-origin',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			transaction: signed.transaction,
		}),
	});
	return readAdminResponse(response);
}

export function createRagnarokAdminAdapter() {
	return {
		broadcast(
			action: AdminMultisigAction,
			payload: Record<string, unknown>,
		): Promise<HiveBroadcastResult> {
			return requestApprovedAdminBroadcast({
				protocol: 'ragnarok',
				action,
				payload: {
					...payload,
					app: RAGNAROK_APP_ID,
					p: RAGNAROK_APP_ID,
					action,
					admin_nonce: nextAdminNonce(),
				},
				title: `Approve Ragnarok admin ${action.replace(/_/g, ' ')}`,
			});
		},
	};
}

export function createNftLoxAdminAdapter() {
	function broadcast(
		_action: NftLoxAdminAction,
		_data: Record<string, unknown>,
	): Promise<HiveBroadcastResult> {
		return Promise.resolve({
			success: false,
			error: NFTLOX_ADMIN_DISABLED_ERROR,
		});
	}

	return {
		broadcast,
		createCollection(
			collectionName: string,
			totalPotential: number,
			schema: Record<string, unknown>,
		): Promise<HiveBroadcastResult> {
			return broadcast('create_collection', {
				name: collectionName,
				symbol: NFTLOX_COLLECTION_SYMBOL,
				creator: RAGNAROK_ADMIN_OPERATOR_ACCOUNT,
				totalPotential,
				metadata: {
					description: 'Norse Mythos Card Game — collectible cards across 5 mythological factions',
					image: 'https://dhenz14.github.io/norse-mythos-card-game/icons/icon-512.webp',
					externalUrl: 'https://dhenz14.github.io/norse-mythos-card-game',
				},
				rules: {
					transferable: true,
					burnable: true,
					replicable: false,
					royaltyPct: 0,
					royaltyRecipient: RAGNAROK_ADMIN_OPERATOR_ACCOUNT,
				},
				schema,
			});
		},
		mintSeed(
			collectionId: string,
			seed: NftLoxSeedInput,
		): Promise<HiveBroadcastResult> {
			return broadcast('mint', {
				collectionId,
				edition: 1,
				owner: RAGNAROK_ADMIN_OPERATOR_ACCOUNT,
				metadata: {
					name: seed.name,
					description: seed.description,
					imageUrl: seed.imageUrl,
				},
				maxSupply: seed.maxSupply,
				immutableData: seed.immutableData,
			});
		},
		bulkDistribute(
			items: readonly NftLoxBulkDistributeItem[],
			to: string,
			imageOverrides?: Record<string, string>,
		): Promise<HiveBroadcastResult> {
			return broadcast('bulk_distribute', {
				to,
				items,
				...(imageOverrides ? { imageOverrides } : {}),
			});
		},
		setOwnerData(
			nftId: string,
			ownerData: Record<string, unknown>,
		): Promise<HiveBroadcastResult> {
			return broadcast('set_owner_data', { nftId, ownerData });
		},
		extendSchema(
			collectionId: string,
			newFields: Record<string, { type: string; mutable?: boolean }>,
		): Promise<HiveBroadcastResult> {
			return broadcast('extend_schema', { collectionId, newFields });
		},
		approveDataOperator(
			collectionId: string,
			operator: string,
			approved: boolean,
		): Promise<HiveBroadcastResult> {
			return broadcast('data_operator_approve', { collectionId, operator, approved });
		},
	};
}

export const ragnarokAdminAdapter = createRagnarokAdminAdapter();
export const nftLoxAdminAdapter = createNftLoxAdminAdapter();
