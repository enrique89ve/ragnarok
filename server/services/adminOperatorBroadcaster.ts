import type { RagnarokRuntimeConfig } from '../../shared/runtimeConfig';
import {
	attachAdminApproval,
	type AdminApproval,
	type AdminBroadcastProtocol,
} from '../../shared/protocol-core';
import { fetchAccountKeys } from './hiveSignatureVerifier';
import { loadHiveTx } from './hiveTx';

export type AdminOperatorBroadcastResult = {
	readonly success: boolean;
	readonly trxId?: string;
	readonly blockNum?: number;
	readonly error?: string;
};

export type AdminOperatorSigner = {
	readonly account: string;
	readonly publicKey: string;
	readonly privateKey: import('hive-tx').PrivateKey;
};

const ADMIN_OPERATOR_ACTIVE_KEY_ENV = 'RAGNAROK_ADMIN_OPERATOR_ACTIVE_KEY';

let cachedActiveSigner: AdminOperatorSigner | null = null;
let cachedActiveSignerError: Error | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function getResultTxId(result: unknown): string | undefined {
	if (!isRecord(result)) return undefined;
	const nested = result.result;
	if (isRecord(nested) && typeof nested.tx_id === 'string') return nested.tx_id;
	if (typeof result.tx_id === 'string') return result.tx_id;
	if (typeof result.id === 'string') return result.id;
	return undefined;
}

function getConfiguredOperatorAccount(runtime: RagnarokRuntimeConfig): string {
	return runtime.adminOperatorAccount.trim();
}

function getAdminCustomJsonId(
	runtime: RagnarokRuntimeConfig,
	protocol: AdminBroadcastProtocol,
): string {
	return protocol === 'ragnarok' ? runtime.protocolId : runtime.nftLoxProtocolId;
}

export async function getAdminOperatorActiveSigner(runtime: RagnarokRuntimeConfig): Promise<AdminOperatorSigner> {
	if (cachedActiveSigner) return cachedActiveSigner;
	if (cachedActiveSignerError) throw cachedActiveSignerError;

	try {
		const account = getConfiguredOperatorAccount(runtime);
		if (!account) {
			throw new Error('Admin operator account is not configured');
		}
		const activeKey = process.env[ADMIN_OPERATOR_ACTIVE_KEY_ENV]?.trim();
		if (!activeKey) {
			throw new Error(
				`Admin operator active signing unavailable: ${ADMIN_OPERATOR_ACTIVE_KEY_ENV} is required`,
			);
		}
		if (account === runtime.adminAccount) {
			throw new Error('Admin operator account must be different from the frontend admin account');
		}

		const { PrivateKey } = await loadHiveTx();
		const privateKey = PrivateKey.fromString(activeKey);
		const publicKey = privateKey.createPublic().toString();
		cachedActiveSigner = { account, publicKey, privateKey };
		return cachedActiveSigner;
	} catch (err) {
		cachedActiveSignerError = err instanceof Error ? err : new Error(String(err));
		throw cachedActiveSignerError;
	}
}

export function resetAdminOperatorSignerForTests(): void {
	cachedActiveSigner = null;
	cachedActiveSignerError = null;
}

export async function validateAdminOperatorConfig(
	runtime: RagnarokRuntimeConfig,
): Promise<{ account: string; publicKey: string }> {
	const activeKeyConfigured = Boolean(process.env[ADMIN_OPERATOR_ACTIVE_KEY_ENV]?.trim());
	if (!activeKeyConfigured) {
		throw new Error(
			`Admin operator active signing unavailable: ${ADMIN_OPERATOR_ACTIVE_KEY_ENV} is required for private admin broadcasts`,
		);
	}

	const account = getConfiguredOperatorAccount(runtime);
	if (!account) {
		throw new Error('Admin operator account is not configured');
	}
	if (account === runtime.adminAccount) {
		throw new Error('Admin operator account must be different from the frontend admin account');
	}
	const keys = await fetchAccountKeys(account);
	const activeSigner = await getAdminOperatorActiveSigner(runtime);
	if (!keys.active.includes(activeSigner.publicKey)) {
		const err = new Error(
			`Admin operator pubkey ${activeSigner.publicKey} is not an Active authority for ${activeSigner.account}. ` +
			`Authorities on chain: ${keys.active.join(', ')}`,
		);
		cachedActiveSigner = null;
		cachedActiveSignerError = err;
		throw err;
	}
	return { account: activeSigner.account, publicKey: activeSigner.publicKey };
}

export function shouldValidateAdminOperatorConfig(): boolean {
	return Boolean(process.env[ADMIN_OPERATOR_ACTIVE_KEY_ENV]);
}

export async function broadcastAdminCustomJson(input: {
	readonly runtime: RagnarokRuntimeConfig;
	readonly protocol: AdminBroadcastProtocol;
	readonly payload: Record<string, unknown>;
	readonly approval: AdminApproval;
}): Promise<AdminOperatorBroadcastResult> {
	const signer = await getAdminOperatorActiveSigner(input.runtime);
	const { Transaction } = await loadHiveTx();
	const fullPayload = attachAdminApproval(input.payload, input.approval);

	const tx = new Transaction();
	await tx.addOperation('custom_json', {
		required_auths: [signer.account],
		required_posting_auths: [],
		id: getAdminCustomJsonId(input.runtime, input.protocol),
		json: JSON.stringify(fullPayload),
	});
	tx.sign(signer.privateKey);
	const result = await tx.broadcast(true);

	return {
		success: true,
		trxId: getResultTxId(result),
	};
}
