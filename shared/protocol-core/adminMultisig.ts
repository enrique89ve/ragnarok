import { canonicalStringify } from './hash';
import type { CanonicalAction } from './types';

export const ADMIN_BROADCAST_PROTOCOLS = ['ragnarok', 'nftlox'] as const;
export type AdminBroadcastProtocol = typeof ADMIN_BROADCAST_PROTOCOLS[number];

export const ADMIN_MULTISIG_ACTIONS = [
	'genesis',
	'seal',
	'mint_batch',
	'pack_mint',
	'pack_distribute',
	'pack_transfer',
	'duat_airdrop_finalize',
] as const satisfies readonly CanonicalAction[];

export type AdminMultisigAction = typeof ADMIN_MULTISIG_ACTIONS[number];

export const NFTLOX_ADMIN_ACTIONS = [
	'create_collection',
	'mint',
	'bulk_distribute',
	'set_owner_data',
	'set_data',
	'set_data_from',
	'extend_schema',
	'archive_collection',
	'nft_approve',
	'nft_approve_all',
	'data_operator_approve',
] as const;

export type NftLoxAdminAction = typeof NFTLOX_ADMIN_ACTIONS[number];
export type AdminBroadcastAction = AdminMultisigAction | NftLoxAdminAction;

const ADMIN_MULTISIG_ACTION_SET: ReadonlySet<string> = new Set(ADMIN_MULTISIG_ACTIONS);
const NFTLOX_ADMIN_ACTION_SET: ReadonlySet<string> = new Set(NFTLOX_ADMIN_ACTIONS);

export const ADMIN_APPROVAL_KEY_TYPE = 'active' as const;
export const ADMIN_APPROVAL_DOMAIN = 'ragnarok-admin-approval-v1' as const;

export type AdminApproval = {
	readonly approver: string;
	readonly nonce: number;
	readonly signature: string;
};

export type AdminApprovalReadResult =
	| { readonly success: true; readonly approval: AdminApproval }
	| { readonly success: false; readonly reason: string };

export type AdminBroadcastBodyResult =
	| {
		readonly success: true;
		readonly protocol: AdminBroadcastProtocol;
		readonly action: AdminBroadcastAction;
		readonly payload: Record<string, unknown>;
		readonly approval: AdminApproval;
	}
	| { readonly success: false; readonly reason: string };

export function isAdminMultisigAction(action: unknown): action is AdminMultisigAction {
	return typeof action === 'string' && ADMIN_MULTISIG_ACTION_SET.has(action);
}

export function isNftLoxAdminAction(action: unknown): action is NftLoxAdminAction {
	return typeof action === 'string' && NFTLOX_ADMIN_ACTION_SET.has(action);
}

export function isAdminBroadcastProtocol(value: unknown): value is AdminBroadcastProtocol {
	return value === 'ragnarok' || value === 'nftlox';
}

export function isSupportedAdminBroadcastAction(
	protocol: AdminBroadcastProtocol,
	action: unknown,
): action is AdminBroadcastAction {
	return protocol === 'ragnarok'
		? isAdminMultisigAction(action)
		: isNftLoxAdminAction(action);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function stripAdminApprovalFields(
	payload: Record<string, unknown>,
): Record<string, unknown> {
	const stripped: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(payload)) {
		if (
			key === 'admin_approver'
			|| key === 'admin_sig'
			|| key === 'admin_sig_key'
		) {
			continue;
		}
		stripped[key] = value;
	}
	return stripped;
}

export function attachAdminApproval(
	payload: Record<string, unknown>,
	approval: AdminApproval,
): Record<string, unknown> {
	return {
		...stripAdminApprovalFields(payload),
		admin_approver: approval.approver,
		admin_sig: approval.signature,
		admin_sig_key: ADMIN_APPROVAL_KEY_TYPE,
	};
}

export function readAdminApproval(payload: Record<string, unknown>): AdminApprovalReadResult {
	const approver = payload.admin_approver;
	if (typeof approver !== 'string' || approver.trim().length === 0) {
		return { success: false, reason: 'missing admin approver' };
	}

	const nonce = payload.admin_nonce;
	if (
		typeof nonce !== 'number'
		|| !Number.isSafeInteger(nonce)
		|| nonce <= 0
	) {
		return { success: false, reason: 'missing admin nonce' };
	}

	const signature = payload.admin_sig;
	if (typeof signature !== 'string' || signature.length < 10) {
		return { success: false, reason: 'missing admin signature' };
	}

	if (payload.admin_sig_key !== ADMIN_APPROVAL_KEY_TYPE) {
		return { success: false, reason: 'admin signature must use active key' };
	}

	return {
		success: true,
		approval: {
			approver: approver.trim(),
			nonce,
			signature,
		},
	};
}

export function buildAdminApprovalMessage(input: {
	readonly protocol: AdminBroadcastProtocol;
	readonly action: AdminBroadcastAction;
	readonly adminAccount: string;
	readonly operatorAccount: string;
	readonly payload: Record<string, unknown>;
}): string {
	return canonicalStringify({
		domain: ADMIN_APPROVAL_DOMAIN,
		version: 1,
		protocol: input.protocol,
		action: input.action,
		adminAccount: input.adminAccount,
		operatorAccount: input.operatorAccount,
		payload: stripAdminApprovalFields(input.payload),
	});
}

export function parseAdminBroadcastBody(body: unknown): AdminBroadcastBodyResult {
	if (!isRecord(body)) {
		return { success: false, reason: 'request body must be an object' };
	}

	if (!isAdminBroadcastProtocol(body.protocol)) {
		return { success: false, reason: 'unsupported admin protocol' };
	}

	if (!isSupportedAdminBroadcastAction(body.protocol, body.action)) {
		return { success: false, reason: 'unsupported admin action' };
	}

	if (!isRecord(body.payload)) {
		return { success: false, reason: 'payload must be an object' };
	}

	const payload = stripAdminApprovalFields({
		...body.payload,
		action: body.action,
	});
	const read = readAdminApproval({
		...payload,
		admin_approver: body.approver,
		admin_sig: body.signature,
		admin_sig_key: ADMIN_APPROVAL_KEY_TYPE,
	});

	if (!read.success) return read;

	return {
		...read,
		protocol: body.protocol,
		action: body.action,
		payload,
	};
}
