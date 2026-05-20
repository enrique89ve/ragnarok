import type { RagnarokRuntimeConfig } from '../../shared/runtimeConfig';
import {
	ATOMIC_TRANSFER_AMOUNT,
	isAdminMultisigAction,
	type AdminBroadcastAction,
	type AdminBroadcastProtocol,
} from '../../shared/protocol-core';
import { fetchAccountKeys } from './hiveSignatureVerifier';
import { getAdminOperatorActiveSigner } from './adminOperatorBroadcaster';
import { loadHiveTx } from './hiveTx';

type HiveOperationTuple = readonly [string, Record<string, unknown>];

export type HiveTransactionObject = Readonly<{
	readonly ref_block_num: number;
	readonly ref_block_prefix: number;
	readonly expiration: string;
	readonly operations: ReadonlyArray<HiveOperationTuple>;
	readonly extensions: ReadonlyArray<unknown>;
	readonly signatures: ReadonlyArray<string>;
}>;

export type AdminMultisigPreparedTransaction = Readonly<{
	readonly transaction: HiveTransactionObject;
	readonly digest: string;
	readonly expiration: string;
}>;

export type AdminMultisigBroadcastResult = Readonly<{
	readonly success: boolean;
	readonly status?: number;
	readonly trxId?: string;
	readonly error?: string;
}>;

type ValidationResult =
	| Readonly<{
		readonly success: true;
		readonly transaction: HiveTransactionObject;
		readonly action: AdminBroadcastAction;
	}>
	| Readonly<{ readonly success: false; readonly status: number; readonly reason: string }>;

type HiveTxResult = {
	readonly result?: unknown;
	readonly tx_id?: string;
	readonly id?: string;
};

const ADMIN_MULTISIG_TX_EXPIRATION_MS = 2 * 60 * 1000;
const ADMIN_MULTISIG_TX_MAX_FUTURE_MS = 5 * 60 * 1000;
const ADMIN_MULTISIG_SIGNATURE_RE = /^[0-9a-fA-F]{130}$/;
const ADMIN_ATOMIC_TRANSFER_ACTIONS: ReadonlySet<AdminBroadcastAction> = new Set([
	'pack_distribute',
	'pack_transfer',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getResultTxId(result: unknown): string | undefined {
	if (!isRecord(result)) return undefined;
	const nested = result.result;
	if (isRecord(nested) && typeof nested.tx_id === 'string') return nested.tx_id;
	if (typeof result.tx_id === 'string') return result.tx_id;
	if (typeof result.id === 'string') return result.id;
	return undefined;
}

function getAdminCustomJsonId(
	runtime: RagnarokRuntimeConfig,
	protocol: AdminBroadcastProtocol,
): string {
	return protocol === 'ragnarok' ? runtime.protocolId : runtime.nftLoxProtocolId;
}

function readPayloadRecipient(action: AdminBroadcastAction, payload: Record<string, unknown>): string | null {
	if (!ADMIN_ATOMIC_TRANSFER_ACTIONS.has(action)) return null;
	const rawRecipient = payload.to;
	return typeof rawRecipient === 'string' && rawRecipient.trim().length > 0
		? rawRecipient.trim()
		: null;
}

function validateTransactionExpiration(expiration: string): string | null {
	const expirationMs = new Date(`${expiration}Z`).getTime();
	if (!Number.isFinite(expirationMs)) return 'Admin multisig transaction expiration is invalid';
	const now = Date.now();
	if (expirationMs <= now) return 'Admin multisig transaction is expired';
	if (expirationMs - now > ADMIN_MULTISIG_TX_MAX_FUTURE_MS) {
		return 'Admin multisig transaction expiration is too far in the future';
	}
	return null;
}

function toHiveTransactionObject(value: unknown): HiveTransactionObject | null {
	if (!isRecord(value)) return null;
	if (
		typeof value.ref_block_num !== 'number'
		|| typeof value.ref_block_prefix !== 'number'
		|| typeof value.expiration !== 'string'
		|| !Array.isArray(value.operations)
		|| !Array.isArray(value.signatures)
	) {
		return null;
	}

	const operations: HiveOperationTuple[] = [];
	for (const operation of value.operations) {
		if (!Array.isArray(operation) || operation.length !== 2) return null;
		const [name, body] = operation;
		if (typeof name !== 'string' || !isRecord(body)) return null;
		operations.push([name, body]);
	}

	if (!value.signatures.every((signature) => typeof signature === 'string')) return null;
	const extensions = value.extensions === undefined ? [] : value.extensions;
	if (!Array.isArray(extensions)) return null;

	return {
		ref_block_num: value.ref_block_num,
		ref_block_prefix: value.ref_block_prefix,
		expiration: value.expiration,
		operations,
		extensions,
		signatures: value.signatures,
	};
}

function getCustomJsonOperation(transaction: HiveTransactionObject): Record<string, unknown> | null {
	const customJsonOps = transaction.operations.filter(([name]) => name === 'custom_json');
	if (customJsonOps.length !== 1) return null;
	return customJsonOps[0]?.[1] ?? null;
}

function sameStringArray(value: unknown, expected: readonly string[]): boolean {
	return Array.isArray(value)
		&& value.length === expected.length
		&& value.every((entry, index) => entry === expected[index]);
}

function parseCustomJsonPayload(customJson: Record<string, unknown>): Record<string, unknown> | null {
	if (typeof customJson.json !== 'string') return null;
	try {
		const parsed: unknown = JSON.parse(customJson.json);
		return isRecord(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

function toMutableHiveTransaction(transaction: HiveTransactionObject): import('hive-tx').TransactionType {
	return {
		ref_block_num: transaction.ref_block_num,
		ref_block_prefix: transaction.ref_block_prefix,
		expiration: transaction.expiration,
		operations: (
			transaction.operations.map(([name, body]) => [name, { ...body }])
		) as unknown as import('hive-tx').TransactionType['operations'],
		extensions: transaction.extensions.map((extension) => (
			Array.isArray(extension) ? [...extension] : extension
		)) as import('hive-tx').TransactionType['extensions'],
		signatures: [...transaction.signatures],
	};
}

function validateAdminMultisigTransaction(
	input: {
		readonly runtime: RagnarokRuntimeConfig;
		readonly transaction: unknown;
		readonly requireAdminSignature: boolean;
	},
): ValidationResult {
	const transaction = toHiveTransactionObject(input.transaction);
	if (!transaction) {
		return { success: false, status: 400, reason: 'Invalid Hive transaction object' };
	}
	if (transaction.operations.length < 1 || transaction.operations.length > 2) {
		return { success: false, status: 400, reason: 'Admin multisig transaction must contain one custom_json and optional transfer' };
	}
	const expirationError = validateTransactionExpiration(transaction.expiration);
	if (expirationError) return { success: false, status: 400, reason: expirationError };
	if (input.requireAdminSignature) {
		if (transaction.signatures.length !== 1) {
			return { success: false, status: 400, reason: 'Admin multisig transaction must contain exactly one admin signature' };
		}
		if (!ADMIN_MULTISIG_SIGNATURE_RE.test(transaction.signatures[0] ?? '')) {
			return { success: false, status: 400, reason: 'Admin multisig transaction contains an invalid signature' };
		}
	} else if (transaction.signatures.length !== 0) {
		return { success: false, status: 400, reason: 'Prepared admin multisig transaction must be unsigned' };
	}

	const customJson = getCustomJsonOperation(transaction);
	if (!customJson) {
		return { success: false, status: 400, reason: 'Admin multisig transaction must contain exactly one custom_json operation' };
	}
	if (customJson.id !== input.runtime.protocolId) {
		return { success: false, status: 400, reason: 'Admin multisig custom_json id mismatch' };
	}
	if (!sameStringArray(customJson.required_auths, [
		input.runtime.adminAccount,
		input.runtime.adminOperatorAccount,
	])) {
		return { success: false, status: 403, reason: 'Admin multisig required_auths must be [admin, operator]' };
	}
	if (!sameStringArray(customJson.required_posting_auths, [])) {
		return { success: false, status: 400, reason: 'Admin multisig required_posting_auths must be empty' };
	}

	const payload = parseCustomJsonPayload(customJson);
	if (!payload) {
		return { success: false, status: 400, reason: 'Admin multisig custom_json payload is invalid' };
	}
	const action = payload?.action;
	if (!isAdminMultisigAction(action)) {
		return { success: false, status: 400, reason: 'Unsupported Ragnarok admin multisig action' };
	}
	if (transaction.operations.length === 2) {
		const [transferName, transferBody] = transaction.operations[0] ?? [];
		if (transferName !== 'transfer' || !transferBody) {
			return { success: false, status: 400, reason: 'Admin multisig companion operation must be a transfer before custom_json' };
		}
		const expectedRecipient = readPayloadRecipient(action, payload);
		if (!expectedRecipient) {
			return { success: false, status: 400, reason: 'Admin multisig companion transfer recipient is missing' };
		}
		if (
			transferBody.from !== input.runtime.adminAccount
			|| transferBody.to !== expectedRecipient
			|| transferBody.amount !== ATOMIC_TRANSFER_AMOUNT
		) {
			return { success: false, status: 400, reason: 'Admin multisig companion transfer does not match payload' };
		}
	} else if (ADMIN_ATOMIC_TRANSFER_ACTIONS.has(action)) {
		return { success: false, status: 400, reason: `${action} requires an atomic companion transfer` };
	}

	return {
		success: true,
		transaction,
		action,
	};
}

async function recoverSignaturePublicKey(
	transaction: HiveTransactionObject,
	signatureHex: string,
): Promise<string | null> {
	try {
		const { Signature, Transaction } = await loadHiveTx();
		const hiveTx = new Transaction({
			transaction: toMutableHiveTransaction({
				...transaction,
				signatures: [],
			}),
		});
		const { digest } = hiveTx.digest();
		return Signature.from(signatureHex).getPublicKey(digest).toString();
	} catch {
		return null;
	}
}

async function verifyAdminActiveSignature(transaction: HiveTransactionObject, account: string): Promise<boolean> {
	const signature = transaction.signatures[0];
	if (!signature) return false;
	const recovered = await recoverSignaturePublicKey(transaction, signature);
	if (!recovered) return false;
	const keys = await fetchAccountKeys(account);
	return keys.active.includes(recovered);
}

export async function prepareAdminMultisigTransaction(input: {
	readonly runtime: RagnarokRuntimeConfig;
	readonly protocol: AdminBroadcastProtocol;
	readonly action: AdminBroadcastAction;
	readonly payload: Record<string, unknown>;
}): Promise<AdminMultisigPreparedTransaction> {
	if (input.protocol !== 'ragnarok') {
		throw new Error('NFTLox admin multisig is disabled until the NFTLox protocol is finalized');
	}
	if (!isAdminMultisigAction(input.action)) {
		throw new Error('Unsupported Ragnarok admin multisig action');
	}
	if (!input.runtime.adminOperatorAccount || input.runtime.adminOperatorAccount === input.runtime.adminAccount) {
		throw new Error('Admin operator account is not configured');
	}

	const { Transaction } = await loadHiveTx();
	const tx = new Transaction({ expiration: ADMIN_MULTISIG_TX_EXPIRATION_MS });
	const recipient = readPayloadRecipient(input.action, input.payload);
	if (recipient) {
		await tx.addOperation('transfer', {
			from: input.runtime.adminAccount,
			to: recipient,
			amount: ATOMIC_TRANSFER_AMOUNT,
			memo: `Ragnarok admin ${input.action}`,
		});
	}
	await tx.addOperation('custom_json', {
		required_auths: [input.runtime.adminAccount, input.runtime.adminOperatorAccount],
		required_posting_auths: [],
		id: getAdminCustomJsonId(input.runtime, input.protocol),
		json: JSON.stringify({
			...input.payload,
			action: input.action,
		}),
	});
	const transaction = toHiveTransactionObject(tx.transaction);
	if (!transaction) {
		throw new Error('Failed to prepare admin multisig transaction');
	}
	const validation = validateAdminMultisigTransaction({
		runtime: input.runtime,
		transaction,
		requireAdminSignature: false,
	});
	if (!validation.success) throw new Error(validation.reason);
	const { txId } = tx.digest();
	return {
		transaction,
		digest: txId,
		expiration: transaction.expiration,
	};
}

export async function broadcastAdminMultisigTransaction(input: {
	readonly runtime: RagnarokRuntimeConfig;
	readonly transaction: unknown;
}): Promise<AdminMultisigBroadcastResult> {
	const validation = validateAdminMultisigTransaction({
		runtime: input.runtime,
		transaction: input.transaction,
		requireAdminSignature: true,
	});
	if (!validation.success) {
		return { success: false, status: validation.status, error: validation.reason };
	}

	const signatureValid = await verifyAdminActiveSignature(
		validation.transaction,
		input.runtime.adminAccount,
	);
	if (!signatureValid) {
		return { success: false, status: 401, error: 'Admin Active transaction signature is invalid' };
	}

	try {
		const signer = await getAdminOperatorActiveSigner(input.runtime);
		const { Transaction } = await loadHiveTx();
		const hiveTx = new Transaction({ transaction: toMutableHiveTransaction(validation.transaction) });
		hiveTx.sign(signer.privateKey);
		const result = await hiveTx.broadcast(true) as HiveTxResult;
		return {
			success: true,
			trxId: getResultTxId(result),
		};
	} catch (err) {
		return {
			success: false,
			status: 503,
			error: err instanceof Error ? err.message : String(err),
		};
	}
}

export function readAdminMultisigBroadcastBody(body: unknown):
	| Readonly<{ readonly success: true; readonly transaction: HiveTransactionObject }>
	| Readonly<{ readonly success: false; readonly status: number; readonly reason: string }> {
	if (!isRecord(body)) {
		return { success: false, status: 400, reason: 'request body must be an object' };
	}
	const transaction = toHiveTransactionObject(body.transaction);
	if (!transaction) {
		return { success: false, status: 400, reason: 'Field transaction must be a Hive transaction object' };
	}
	return { success: true, transaction };
}
