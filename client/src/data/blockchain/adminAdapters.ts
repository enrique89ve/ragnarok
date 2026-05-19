import { signHiveMessage } from '../HiveAuth';
import type { HiveBroadcastResult } from '../HiveSync';
import {
	NFTLOX_COLLECTION_SYMBOL,
	NFTLOX_PROTOCOL_ID,
	NFTLOX_PROTOCOL_VERSION,
	RAGNAROK_ACCOUNT,
	RAGNAROK_ADMIN_OPERATOR_ACCOUNT,
} from './hiveConfig';
import { hiveSync } from '../HiveSync';
import { RAGNAROK_APP_ID } from '../schemas/HiveTypes';
import {
	buildAdminApprovalMessage,
	sanitizePayload,
	validatePayloadSize,
	type AdminBroadcastProtocol,
	type AdminMultisigAction,
	type NftLoxAdminAction,
} from '@shared/protocol-core';

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

let lastAdminNonce = 0;

function nextAdminNonce(): number {
	const now = Date.now();
	lastAdminNonce = now > lastAdminNonce ? now : lastAdminNonce + 1;
	return lastAdminNonce;
}

function requireFrontendAdmin(): HiveBroadcastResult | null {
	const username = hiveSync.getUsername();
	if (!username) {
		return { success: false, error: 'Not logged in. Connect a Hive wallet first.' };
	}
	if (username !== RAGNAROK_ACCOUNT) {
		return { success: false, error: `Must be logged in as @${RAGNAROK_ACCOUNT}, currently @${username}` };
	}
	if (!RAGNAROK_ADMIN_OPERATOR_ACCOUNT) {
		return { success: false, error: 'Admin operator account is not configured.' };
	}
	return null;
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

async function requestApprovedAdminBroadcast(input: {
	readonly protocol: AdminBroadcastProtocol;
	readonly action: AdminMultisigAction | NftLoxAdminAction;
	readonly payload: Record<string, unknown>;
	readonly title: string;
}): Promise<HiveBroadcastResult> {
	const err = requireFrontendAdmin();
	if (err) return err;

	const username = hiveSync.getUsername();
	if (!username) return { success: false, error: 'Not logged in. Connect a Hive wallet first.' };

	const message = buildAdminApprovalMessage({
		protocol: input.protocol,
		action: input.action,
		adminAccount: RAGNAROK_ACCOUNT,
		operatorAccount: RAGNAROK_ADMIN_OPERATOR_ACCOUNT,
		payload: input.payload,
	});
	const signed = await signHiveMessage(message, {
		username,
		keyType: 'Active',
		title: input.title,
	});
	if (!signed.success || !signed.signature) {
		return {
			success: false,
			error: signed.error ?? 'Hive Keychain Active approval rejected',
		};
	}

	const response = await fetch('/api/admin/broadcast', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			protocol: input.protocol,
			action: input.action,
			payload: input.payload,
			approver: username,
			signature: signed.signature,
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
		action: NftLoxAdminAction,
		data: Record<string, unknown>,
	): Promise<HiveBroadcastResult> {
		const payload = {
			protocol: NFTLOX_PROTOCOL_ID,
			version: NFTLOX_PROTOCOL_VERSION,
			action,
			data: sanitizePayload(data),
			admin_nonce: nextAdminNonce(),
		};
		const sizeCheck = validatePayloadSize(payload);
		if (!sizeCheck.valid) {
			return Promise.resolve({
				success: false,
				error: `Payload too large: ${sizeCheck.bytes} bytes (max ${sizeCheck.maxBytes})`,
			});
		}

		return requestApprovedAdminBroadcast({
			protocol: 'nftlox',
			action,
			payload,
			title: `Approve NFTLox admin ${action.replace(/_/g, ' ')}`,
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
