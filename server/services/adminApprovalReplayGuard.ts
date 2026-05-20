import type {
	AdminApproval,
	AdminBroadcastAction,
	AdminBroadcastProtocol,
} from '../../shared/protocol-core';

const ADMIN_APPROVAL_TTL_MS = 10 * 60 * 1000;
const ADMIN_APPROVAL_FUTURE_SKEW_MS = 2 * 60 * 1000;

type ApprovalReplayState = {
	readonly consumedMessages: Map<string, number>;
	readonly latestNonceByScope: Map<string, number>;
};

export type AdminApprovalReplayResult =
	| { readonly success: true }
	| { readonly success: false; readonly reason: string };

const replayState: ApprovalReplayState = {
	consumedMessages: new Map<string, number>(),
	latestNonceByScope: new Map<string, number>(),
};

function pruneExpiredMessages(now: number): void {
	for (const [message, expiresAt] of replayState.consumedMessages.entries()) {
		if (expiresAt <= now) replayState.consumedMessages.delete(message);
	}
}

function getReplayScope(input: {
	readonly protocol: AdminBroadcastProtocol;
	readonly action: AdminBroadcastAction;
	readonly approver: string;
	readonly operatorAccount: string;
}): string {
	return `${input.protocol}:${input.action}:${input.approver}:${input.operatorAccount}`;
}

export function validateAdminApprovalNonceFreshness(
	approval: AdminApproval,
	now: number = Date.now(),
): AdminApprovalReplayResult {
	const ageMs = now - approval.nonce;
	if (ageMs > ADMIN_APPROVAL_TTL_MS) {
		return { success: false, reason: 'admin approval expired' };
	}
	if (approval.nonce - now > ADMIN_APPROVAL_FUTURE_SKEW_MS) {
		return { success: false, reason: 'admin approval nonce is too far in the future' };
	}
	return { success: true };
}

export function reserveAdminApproval(input: {
	readonly protocol: AdminBroadcastProtocol;
	readonly action: AdminBroadcastAction;
	readonly approval: AdminApproval;
	readonly operatorAccount: string;
	readonly signedMessage: string;
	readonly now?: number;
}): AdminApprovalReplayResult {
	const now = input.now ?? Date.now();
	pruneExpiredMessages(now);

	const fresh = validateAdminApprovalNonceFreshness(input.approval, now);
	if (!fresh.success) return fresh;

	if (replayState.consumedMessages.has(input.signedMessage)) {
		return { success: false, reason: 'admin approval already consumed' };
	}

	const scope = getReplayScope({
		protocol: input.protocol,
		action: input.action,
		approver: input.approval.approver,
		operatorAccount: input.operatorAccount,
	});
	const latestNonce = replayState.latestNonceByScope.get(scope) ?? 0;
	if (input.approval.nonce <= latestNonce) {
		return { success: false, reason: 'admin approval nonce was already used' };
	}

	replayState.consumedMessages.set(input.signedMessage, now + ADMIN_APPROVAL_TTL_MS);
	replayState.latestNonceByScope.set(scope, input.approval.nonce);
	return { success: true };
}

export function resetAdminApprovalReplayGuardForTests(): void {
	replayState.consumedMessages.clear();
	replayState.latestNonceByScope.clear();
}
