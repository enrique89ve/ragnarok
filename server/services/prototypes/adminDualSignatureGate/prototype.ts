#!/usr/bin/env tsx

import { createInterface, emitKeypressEvents } from 'node:readline';
import process from 'node:process';
import {
	createInitialState,
	evaluateInvariants,
	getAvailableOperation,
	reducePrototype,
	type PrototypeAction,
	type PrototypeState,
} from './model';

const QUESTION = [
	'PROTOTYPE - wipe me.',
	'Question: should admin panel login and private server admin operations',
	'require both a Keychain Active approval from VITE_RAGNAROK_ADMIN_ACCOUNT',
	'and a server operator co-sign from VITE_RAGNAROK_ADMIN_OPERATOR_ACCOUNT?',
].join(' ');

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

let state = createInitialState();

if (process.argv.includes('--demo')) {
	runDemo();
	process.exit(0);
}

const rl = createInterface({
	input: process.stdin,
	output: process.stdout,
});

emitKeypressEvents(process.stdin, rl);
if (process.stdin.isTTY) {
	process.stdin.setRawMode(true);
}

process.stdin.on('keypress', (_chunk, key) => {
	if (key.ctrl && key.name === 'c') {
		close();
		return;
	}

	if (key.name === 'a') dispatch({ type: 'connect-wallet', role: 'admin' });
	if (key.name === 'o') dispatch({ type: 'connect-wallet', role: 'operator' });
	if (key.name === 'x') dispatch({ type: 'connect-wallet', role: 'intruder' });
	if (key.name === 'n') dispatch({ type: 'issue-login-challenge' });
	if (key.name === 'k') dispatch({ type: 'sign-login-admin' });
	if (key.name === 's') dispatch({ type: 'operator-grant-login' });
	if (key.name === 'l') dispatch({ type: 'attempt-login' });
	if (key.name === 'p') dispatch({ type: 'draft-operation', action: getAvailableOperation(state) });
	if (key.name === 'm') dispatch({ type: 'sign-operation-admin' });
	if (key.name === 'e') dispatch({ type: 'execute-operation' });
	if (key.name === 'r') dispatch({ type: 'replay-login-grant' });
	if (key.name === 'g') dispatch({ type: 'toggle-operator-key' });
	if (key.name === 'c') dispatch({ type: 'reset' });
	if (key.name === 'q') close();
});

function dispatch(action: PrototypeAction): void {
	state = reducePrototype(state, action);
	render(state);
}

function render(current: PrototypeState): void {
	console.clear();
	process.stdout.write(`${BOLD}${QUESTION}${RESET}\n\n`);

	process.stdout.write(`${BOLD}Accounts${RESET}\n`);
	process.stdout.write(`  admin login: @${current.env.adminAccount}\n`);
	process.stdout.write(`  server operator: @${current.env.operatorAccount}\n`);
	process.stdout.write(`  treasury: @${current.env.treasuryAccount} ${DIM}(payments only)${RESET}\n`);
	process.stdout.write(`  operator key loaded: ${String(current.env.operatorKeyLoaded)}\n\n`);

	process.stdout.write(`${BOLD}Wallet/session${RESET}\n`);
	process.stdout.write(`  wallet: ${current.wallet.role}${current.wallet.account ? ` @${current.wallet.account}` : ''}\n`);
	process.stdout.write(`  login phase: ${current.login.phase}\n`);
	process.stdout.write(`  session: ${current.login.sessionId ?? 'none'}\n`);
	process.stdout.write(`  admin approval: ${formatSignature(current.login.adminApproval)}\n`);
	process.stdout.write(`  operator grant: ${formatSignature(current.login.operatorGrant)}\n`);
	process.stdout.write(`  panel open: ${String(current.login.panelOpen)}\n\n`);

	process.stdout.write(`${BOLD}Pending operation${RESET}\n`);
	if (current.pendingOperation) {
		process.stdout.write(`  action: ${current.pendingOperation.action}\n`);
		process.stdout.write(`  nonce: ${current.pendingOperation.nonce}\n`);
		process.stdout.write(`  payloadHash: ${current.pendingOperation.payloadHash}\n`);
		process.stdout.write(`  admin approval: ${formatSignature(current.pendingOperation.adminApproval)}\n`);
		process.stdout.write(`  operator signature: ${formatSignature(current.pendingOperation.operatorSignature)}\n`);
		process.stdout.write(`  status: ${current.pendingOperation.status}\n`);
	} else {
		process.stdout.write(`  none ${DIM}(press p after login)${RESET}\n`);
	}
	process.stdout.write(`  used nonces: ${current.usedNonces.join(', ') || 'none'}\n\n`);

	process.stdout.write(`${BOLD}Invariants${RESET}\n`);
	for (const invariant of evaluateInvariants(current)) {
		process.stdout.write(`  ${invariant}\n`);
	}
	process.stdout.write('\n');

	process.stdout.write(`${BOLD}Recent events${RESET}\n`);
	for (const event of current.events) {
		process.stdout.write(`  - ${event}\n`);
	}
	process.stdout.write('\n');

	process.stdout.write(`${BOLD}Verdicts${RESET}\n`);
	for (const verdict of current.verdicts) {
		process.stdout.write(`  - ${verdict}\n`);
	}
	process.stdout.write('\n');

	process.stdout.write(`${BOLD}Keys${RESET}\n`);
	process.stdout.write(`${BOLD}a${RESET} admin wallet  ${BOLD}o${RESET} operator wallet  ${BOLD}x${RESET} intruder wallet  ${BOLD}n${RESET} challenge\n`);
	process.stdout.write(`${BOLD}k${RESET} admin sign    ${BOLD}s${RESET} server grant     ${BOLD}l${RESET} login           ${BOLD}r${RESET} replay grant\n`);
	process.stdout.write(`${BOLD}p${RESET} draft op      ${BOLD}m${RESET} admin op sign   ${BOLD}e${RESET} execute op      ${BOLD}g${RESET} toggle key\n`);
	process.stdout.write(`${BOLD}c${RESET} reset         ${BOLD}q${RESET} quit\n`);
}

function formatSignature(signature: PrototypeState['login']['adminApproval']): string {
	if (!signature) return 'none';
	return `${signature.scope} by @${signature.signer} nonce=${signature.nonce} hash=${signature.messageHash}`;
}

function runDemo(): void {
	const actions: readonly PrototypeAction[] = [
		{ type: 'connect-wallet', role: 'operator' },
		{ type: 'issue-login-challenge' },
		{ type: 'sign-login-admin' },
		{ type: 'attempt-login' },
		{ type: 'connect-wallet', role: 'admin' },
		{ type: 'issue-login-challenge' },
		{ type: 'sign-login-admin' },
		{ type: 'attempt-login' },
		{ type: 'operator-grant-login' },
		{ type: 'attempt-login' },
		{ type: 'draft-operation', action: 'pack_create' },
		{ type: 'sign-operation-admin' },
		{ type: 'execute-operation' },
		{ type: 'replay-login-grant' },
	];
	for (const action of actions) {
		state = reducePrototype(state, action);
	}
	process.stdout.write(JSON.stringify({
		login: state.login,
		pendingOperation: state.pendingOperation,
		usedNonces: state.usedNonces,
		invariants: evaluateInvariants(state),
		events: state.events,
		verdicts: state.verdicts,
	}, null, 2));
	process.stdout.write('\n');
}

function close(): void {
	if (process.stdin.isTTY) {
		process.stdin.setRawMode(false);
	}
	rl.close();
	process.stdout.write('\n');
	process.exit(0);
}

render(state);
