export type WalletRole = 'none' | 'admin' | 'operator' | 'intruder';

export type LoginPhase =
	| 'no-wallet'
	| 'wallet-connected'
	| 'challenge-issued'
	| 'admin-approved'
	| 'operator-granted'
	| 'panel-open';

export type AdminOperationKind =
	| 'nftlox_create_collection'
	| 'pack_create'
	| 'pack_distribute'
	| 'pack_sale_open'
	| 'xp_mirror_checkpoint';

export type SignatureRecord = {
	readonly signer: string;
	readonly scope: 'panel_login' | 'admin_operation';
	readonly nonce: number;
	readonly messageHash: string;
	readonly signature: string;
};

export type LoginState = {
	readonly phase: LoginPhase;
	readonly challengeNonce: number | null;
	readonly sessionId: string | null;
	readonly adminApproval: SignatureRecord | null;
	readonly operatorGrant: SignatureRecord | null;
	readonly panelOpen: boolean;
};

export type PendingOperation = {
	readonly action: AdminOperationKind;
	readonly nonce: number;
	readonly payloadHash: string;
	readonly adminApproval: SignatureRecord | null;
	readonly operatorSignature: SignatureRecord | null;
	readonly status: 'draft' | 'admin-approved' | 'broadcasted';
};

export type PrototypeState = {
	readonly env: {
		readonly adminAccount: string;
		readonly operatorAccount: string;
		readonly treasuryAccount: string;
		readonly operatorKeyLoaded: boolean;
	};
	readonly wallet: {
		readonly role: WalletRole;
		readonly account: string | null;
	};
	readonly login: LoginState;
	readonly pendingOperation: PendingOperation | null;
	readonly usedNonces: readonly number[];
	readonly nextNonce: number;
	readonly verdicts: readonly string[];
	readonly events: readonly string[];
};

export type PrototypeAction =
	| { readonly type: 'connect-wallet'; readonly role: Exclude<WalletRole, 'none'> }
	| { readonly type: 'issue-login-challenge' }
	| { readonly type: 'sign-login-admin' }
	| { readonly type: 'operator-grant-login' }
	| { readonly type: 'attempt-login' }
	| { readonly type: 'draft-operation'; readonly action: AdminOperationKind }
	| { readonly type: 'sign-operation-admin' }
	| { readonly type: 'execute-operation' }
	| { readonly type: 'replay-login-grant' }
	| { readonly type: 'toggle-operator-key' }
	| { readonly type: 'reset' };

const ADMIN_ACCOUNT = 'ragnarok-admin';
const OPERATOR_ACCOUNT = 'ragnarok-operator';
const TREASURY_ACCOUNT = 'ragnarok-treasury';

const INITIAL_LOGIN: LoginState = {
	phase: 'no-wallet',
	challengeNonce: null,
	sessionId: null,
	adminApproval: null,
	operatorGrant: null,
	panelOpen: false,
};

export const OPERATION_SEQUENCE: readonly AdminOperationKind[] = [
	'nftlox_create_collection',
	'pack_create',
	'pack_distribute',
	'pack_sale_open',
	'xp_mirror_checkpoint',
];

export const createInitialState = (): PrototypeState => ({
	env: {
		adminAccount: ADMIN_ACCOUNT,
		operatorAccount: OPERATOR_ACCOUNT,
		treasuryAccount: TREASURY_ACCOUNT,
		operatorKeyLoaded: true,
	},
	wallet: {
		role: 'none',
		account: null,
	},
	login: INITIAL_LOGIN,
	pendingOperation: null,
	usedNonces: [],
	nextNonce: 1,
	verdicts: [
		'panel-login-requires-admin-approval-and-operator-grant',
		'operator-account-is-server-signing-authority-not-panel-user',
		'treasury-receives-payments-only',
	],
	events: ['prototype-ready'],
});

export const reducePrototype = (
	state: PrototypeState,
	action: PrototypeAction,
): PrototypeState => {
	if (action.type === 'reset') {
		return createInitialState();
	}

	if (action.type === 'connect-wallet') {
		return {
			...state,
			wallet: walletForRole(state, action.role),
			login: {
				...INITIAL_LOGIN,
				phase: 'wallet-connected',
			},
			pendingOperation: null,
			events: addEvent(state.events, `wallet:${action.role}`),
		};
	}

	if (action.type === 'issue-login-challenge') {
		if (state.wallet.role === 'none') return deny(state, 'connect-wallet-first');
		const nonce = state.nextNonce;
		return {
			...state,
			nextNonce: nonce + 1,
			login: {
				phase: 'challenge-issued',
				challengeNonce: nonce,
				sessionId: `login-session-${nonce}`,
				adminApproval: null,
				operatorGrant: null,
				panelOpen: false,
			},
			events: addEvent(state.events, `login-challenge:${nonce}`),
		};
	}

	if (action.type === 'sign-login-admin') {
		if (state.login.challengeNonce === null || state.login.sessionId === null) {
			return deny(state, 'no-login-challenge');
		}
		if (state.wallet.account !== state.env.adminAccount) {
			return deny(state, 'only-configured-admin-can-approve-login');
		}

		const messageHash = loginMessageHash(state);
		const adminApproval = createSignature({
			signer: state.env.adminAccount,
			scope: 'panel_login',
			nonce: state.login.challengeNonce,
			messageHash,
		});

		return {
			...state,
			login: {
				...state.login,
				phase: 'admin-approved',
				adminApproval,
			},
			verdicts: addVerdict(state.verdicts, 'admin-active-signature-bound-to-operator-and-session'),
			events: addEvent(state.events, 'admin-approved-login'),
		};
	}

	if (action.type === 'operator-grant-login') {
		const gate = validateServerCoSignGate(state, state.login.adminApproval);
		if (gate) return deny(state, gate);

		const operatorGrant = createSignature({
			signer: state.env.operatorAccount,
			scope: 'panel_login',
			nonce: state.login.adminApproval.nonce,
			messageHash: state.login.adminApproval.messageHash,
		});

		return {
			...state,
			login: {
				...state.login,
				phase: 'operator-granted',
				operatorGrant,
			},
			usedNonces: addNonce(state.usedNonces, state.login.adminApproval.nonce),
			verdicts: addVerdict(state.verdicts, 'server-operator-granted-private-login-session'),
			events: addEvent(state.events, 'operator-granted-login'),
		};
	}

	if (action.type === 'attempt-login') {
		if (state.wallet.account !== state.env.adminAccount) {
			return deny(state, 'only-admin-wallet-can-open-panel');
		}
		if (!hasValidDualLogin(state)) {
			return deny(state, 'login-blocked-until-both-signatures-match');
		}

		return {
			...state,
			login: {
				...state.login,
				phase: 'panel-open',
				panelOpen: true,
			},
			verdicts: addVerdict(state.verdicts, 'panel-opened-after-dual-signature'),
			events: addEvent(state.events, 'panel-open'),
		};
	}

	if (action.type === 'draft-operation') {
		if (!state.login.panelOpen) return deny(state, 'panel-required-before-admin-operation');
		const nonce = state.nextNonce;
		return {
			...state,
			nextNonce: nonce + 1,
			pendingOperation: {
				action: action.action,
				nonce,
				payloadHash: hashParts(['payload', action.action, String(nonce)]),
				adminApproval: null,
				operatorSignature: null,
				status: 'draft',
			},
			events: addEvent(state.events, `draft:${action.action}:${nonce}`),
		};
	}

	if (action.type === 'sign-operation-admin') {
		const op = state.pendingOperation;
		if (!op) return deny(state, 'no-pending-operation');
		if (state.wallet.account !== state.env.adminAccount) {
			return deny(state, 'only-admin-wallet-can-approve-operation');
		}

		const adminApproval = createSignature({
			signer: state.env.adminAccount,
			scope: 'admin_operation',
			nonce: op.nonce,
			messageHash: operationMessageHash(state, op),
		});

		return {
			...state,
			pendingOperation: {
				...op,
				adminApproval,
				status: 'admin-approved',
			},
			verdicts: addVerdict(state.verdicts, 'admin-operation-approval-does-not-broadcast-by-itself'),
			events: addEvent(state.events, `admin-approved:${op.action}`),
		};
	}

	if (action.type === 'execute-operation') {
		const op = state.pendingOperation;
		if (!op) return deny(state, 'no-pending-operation');
		const gate = validateServerCoSignGate(state, op.adminApproval);
		if (gate) return deny(state, gate);

		const operatorSignature = createSignature({
			signer: state.env.operatorAccount,
			scope: 'admin_operation',
			nonce: op.adminApproval.nonce,
			messageHash: op.adminApproval.messageHash,
		});

		return {
			...state,
			pendingOperation: {
				...op,
				operatorSignature,
				status: 'broadcasted',
			},
			usedNonces: addNonce(state.usedNonces, op.adminApproval.nonce),
			verdicts: addVerdict(state.verdicts, `${op.action}:operator-broadcast-with-embedded-admin-sig`),
			events: addEvent(state.events, `broadcast:${op.action}`),
		};
	}

	if (action.type === 'replay-login-grant') {
		const approval = state.login.adminApproval;
		if (!approval) return deny(state, 'no-login-approval-to-replay');
		const gate = validateServerCoSignGate(state, approval);
		return gate
			? deny(state, `replay-blocked:${gate}`)
			: deny(state, 'replay-would-have-passed');
	}

	if (action.type === 'toggle-operator-key') {
		return {
			...state,
			env: {
				...state.env,
				operatorKeyLoaded: !state.env.operatorKeyLoaded,
			},
			events: addEvent(state.events, `operator-key:${String(!state.env.operatorKeyLoaded)}`),
		};
	}

	return state;
};

export const evaluateInvariants = (state: PrototypeState): readonly string[] => {
	const loginHasBoth = hasValidDualLogin(state);
	const nonceCount = new Set(state.usedNonces).size;
	const operation = state.pendingOperation;

	const results = [
		state.env.adminAccount !== state.env.operatorAccount
			? 'PASS admin and operator accounts are separate'
			: 'FAIL admin and operator accounts collapsed',
		state.login.panelOpen === false || (state.wallet.account === state.env.adminAccount && loginHasBoth)
			? 'PASS panel cannot open without admin approval plus operator grant'
			: 'FAIL panel opened without complete dual signature',
		state.wallet.account !== state.env.operatorAccount || state.login.panelOpen === false
			? 'PASS operator wallet does not get panel access'
			: 'FAIL operator wallet opened the panel',
		nonceCount === state.usedNonces.length
			? 'PASS consumed nonces are unique'
			: 'FAIL nonce reuse accepted',
		`PASS treasury ${state.env.treasuryAccount} is payments-only in this model`,
	];

	if (operation) {
		results.push(
			operation.status !== 'broadcasted'
				|| (operation.adminApproval !== null && operation.operatorSignature !== null)
				? `PASS ${operation.action} waits for both signatures`
				: `FAIL ${operation.action} broadcasted with one signature`,
		);
	}

	return results;
};

export const getAvailableOperation = (state: PrototypeState): AdminOperationKind => {
	if (!state.pendingOperation) return OPERATION_SEQUENCE[0];
	const index = OPERATION_SEQUENCE.indexOf(state.pendingOperation.action);
	return OPERATION_SEQUENCE[(index + 1) % OPERATION_SEQUENCE.length];
};

const walletForRole = (
	state: PrototypeState,
	role: Exclude<WalletRole, 'none'>,
): PrototypeState['wallet'] => {
	if (role === 'admin') return { role, account: state.env.adminAccount };
	if (role === 'operator') return { role, account: state.env.operatorAccount };
	return { role, account: 'mallory' };
};

const validateServerCoSignGate = (
	state: PrototypeState,
	approval: SignatureRecord | null,
): string | null => {
	if (!approval) return 'missing-admin-approval';
	if (!state.env.operatorKeyLoaded) return 'operator-server-key-unavailable';
	if (state.env.operatorAccount === state.env.adminAccount) return 'operator-must-differ-from-admin';
	if (approval.signer !== state.env.adminAccount) return 'approval-signer-is-not-admin';
	if (approval.messageHash.length === 0) return 'approval-message-not-bound';
	if (state.usedNonces.includes(approval.nonce)) return `nonce-${approval.nonce}-already-consumed`;
	return null;
};

const hasValidDualLogin = (state: PrototypeState): boolean => {
	const adminApproval = state.login.adminApproval;
	const operatorGrant = state.login.operatorGrant;
	return Boolean(
		adminApproval
		&& operatorGrant
		&& adminApproval.scope === 'panel_login'
		&& operatorGrant.scope === 'panel_login'
		&& adminApproval.signer === state.env.adminAccount
		&& operatorGrant.signer === state.env.operatorAccount
		&& adminApproval.nonce === operatorGrant.nonce
		&& adminApproval.messageHash === operatorGrant.messageHash,
	);
};

const loginMessageHash = (state: PrototypeState): string => hashParts([
	'panel_login',
	state.env.adminAccount,
	state.env.operatorAccount,
	state.login.sessionId ?? 'no-session',
	String(state.login.challengeNonce ?? 0),
]);

const operationMessageHash = (
	state: PrototypeState,
	operation: PendingOperation,
): string => hashParts([
	'admin_operation',
	state.env.adminAccount,
	state.env.operatorAccount,
	operation.action,
	operation.payloadHash,
	String(operation.nonce),
]);

const createSignature = (input: {
	readonly signer: string;
	readonly scope: SignatureRecord['scope'];
	readonly nonce: number;
	readonly messageHash: string;
}): SignatureRecord => ({
	...input,
	signature: `sig:${input.signer}:${input.scope}:${input.messageHash.slice(0, 8)}`,
});

const addNonce = (nonces: readonly number[], nonce: number): readonly number[] => (
	nonces.includes(nonce) ? nonces : [...nonces, nonce]
);

const deny = (state: PrototypeState, reason: string): PrototypeState => ({
	...state,
	verdicts: addVerdict(state.verdicts, `blocked:${reason}`),
	events: addEvent(state.events, `blocked:${reason}`),
});

const addVerdict = (verdicts: readonly string[], verdict: string): readonly string[] => {
	if (verdicts.includes(verdict)) return verdicts;
	return [...verdicts, verdict].slice(-9);
};

const addEvent = (events: readonly string[], event: string): readonly string[] => (
	[...events, event].slice(-8)
);

const hashParts = (parts: readonly string[]): string => {
	let hash = 2_166_136_261;
	for (const part of parts) {
		for (const char of part) {
			hash ^= char.charCodeAt(0);
			hash = Math.imul(hash, 16_777_619);
		}
	}
	return (hash >>> 0).toString(16).padStart(8, '0');
};
