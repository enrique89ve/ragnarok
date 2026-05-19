import type { RagnarokRuntimeConfig } from '../../shared/runtimeConfig';
import {
	attachAdminApproval,
	type AdminApproval,
	type AdminBroadcastProtocol,
} from '../../shared/protocol-core';
import { fetchAccountKeys } from './hiveSignatureVerifier';

export type AdminOperatorBroadcastResult = {
	readonly success: boolean;
	readonly trxId?: string;
	readonly blockNum?: number;
	readonly error?: string;
};

type AdminOperatorSigner = {
	readonly account: string;
	readonly publicKey: string;
	readonly privateKey: import('hive-tx').PrivateKey;
};

let cachedSigner: AdminOperatorSigner | null = null;
let cachedSignerError: Error | null = null;

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

async function getAdminOperatorSigner(runtime: RagnarokRuntimeConfig): Promise<AdminOperatorSigner> {
	if (cachedSigner) return cachedSigner;
	if (cachedSignerError) throw cachedSignerError;

	try {
		const account = getConfiguredOperatorAccount(runtime);
		const activeKey = process.env.RAGNAROK_ADMIN_OPERATOR_ACTIVE_KEY?.trim();
		if (!account || !activeKey) {
			throw new Error(
				'Admin operator signing unavailable: RAGNAROK_ADMIN_OPERATOR_ACCOUNT ' +
				'and RAGNAROK_ADMIN_OPERATOR_ACTIVE_KEY are required',
			);
		}
		if (account === runtime.adminAccount) {
			throw new Error('Admin operator account must be different from the frontend admin account');
		}

		const { PrivateKey } = await import('hive-tx');
		const privateKey = PrivateKey.fromString(activeKey);
		const publicKey = privateKey.createPublic().toString();
		cachedSigner = { account, publicKey, privateKey };
		return cachedSigner;
	} catch (err) {
		cachedSignerError = err instanceof Error ? err : new Error(String(err));
		throw cachedSignerError;
	}
}

export function resetAdminOperatorSignerForTests(): void {
	cachedSigner = null;
	cachedSignerError = null;
}

export async function validateAdminOperatorConfig(
	runtime: RagnarokRuntimeConfig,
): Promise<{ account: string; publicKey: string }> {
	const signer = await getAdminOperatorSigner(runtime);
	const keys = await fetchAccountKeys(signer.account);
	if (!keys.active.includes(signer.publicKey)) {
		const err = new Error(
			`Admin operator pubkey ${signer.publicKey} is not an Active authority for ${signer.account}. ` +
			`Authorities on chain: ${keys.active.join(', ')}`,
		);
		cachedSigner = null;
		cachedSignerError = err;
		throw err;
	}
	return { account: signer.account, publicKey: signer.publicKey };
}

export function shouldValidateAdminOperatorConfig(): boolean {
	return Boolean(
		process.env.RAGNAROK_ADMIN_OPERATOR_ACCOUNT
		|| process.env.RAGNAROK_ADMIN_OPERATOR_ACTIVE_KEY,
	);
}

export async function broadcastAdminCustomJson(input: {
	readonly runtime: RagnarokRuntimeConfig;
	readonly protocol: AdminBroadcastProtocol;
	readonly payload: Record<string, unknown>;
	readonly approval: AdminApproval;
}): Promise<AdminOperatorBroadcastResult> {
	const signer = await getAdminOperatorSigner(input.runtime);
	const { Transaction } = await import('hive-tx');
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
