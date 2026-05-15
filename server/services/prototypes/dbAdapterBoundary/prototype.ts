#!/usr/bin/env tsx

import { createInterface, emitKeypressEvents } from 'node:readline';
import process from 'node:process';
import {
	createInitialState,
	evaluateInvariants,
	reducePrototype,
	type ProjectionKind,
	type PrototypeAction,
	type PrototypeState,
	type Stage,
} from './model';

const QUESTION = [
	'PROTOTYPE - wipe me.',
	'Question: can Ragnarok keep a mandatory client local store while swapping',
	'the server hot projection from JSON to Postgres/service and later IPFS',
	'checkpoints without fragmenting authority or data shape?',
].join(' ');

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

let state = createInitialState();

const rl = createInterface({
	input: process.stdin,
	output: process.stdout,
});

emitKeypressEvents(process.stdin, rl);
if (process.stdin.isTTY) {
	process.stdin.setRawMode(true);
}

const dispatch = (action: PrototypeAction): void => {
	state = reducePrototype(state, action);
	render(state);
};

const stageActions: Record<string, { readonly stage: Stage; readonly projectionKind: ProjectionKind }> = {
	'1': { stage: 'closed-testnet-beta-1', projectionKind: 'json-file' },
	'2': { stage: 'testnet-beta-2', projectionKind: 'postgres-direct' },
	'3': { stage: 'mainnet-candidate', projectionKind: 'database-service' },
};

process.stdin.on('keypress', (_chunk, key) => {
	if (key.ctrl && key.name === 'c') {
		close();
		return;
	}

	const selectedStage = key.sequence ? stageActions[key.sequence] : undefined;
	if (selectedStage) {
		dispatch({ type: 'set-stage', ...selectedStage });
		return;
	}

	if (key.name === 'o') dispatch({ type: 'append-op' });
	if (key.name === 'f') dispatch({ type: 'toggle-projection-online' });
	if (key.name === 's') dispatch({ type: 'sync-projection' });
	if (key.name === 'r') dispatch({ type: 'rebuild-projection' });
	if (key.name === 'd') dispatch({ type: 'drift-projection' });
	if (key.name === 'i') dispatch({ type: 'enable-ipfs-checkpoints' });
	if (key.name === 'c') dispatch({ type: 'checkpoint-ipfs' });
	if (key.name === 'q') close();
});

function render(current: PrototypeState): void {
	console.clear();
	process.stdout.write(`${BOLD}${QUESTION}${RESET}\n\n`);
	process.stdout.write(`${BOLD}Runtime${RESET}\n`);
	process.stdout.write(`  stage: ${current.stage}\n`);
	process.stdout.write(`  canonicalOps: ${current.canonicalOps.length}\n\n`);

	process.stdout.write(`${BOLD}Client local store${RESET} ${DIM}(required in every stage)${RESET}\n`);
	process.stdout.write(formatStore(current.clientLocalStore));
	process.stdout.write('\n');

	process.stdout.write(`${BOLD}Server hot projection${RESET} ${DIM}(replaceable cache)${RESET}\n`);
	process.stdout.write(`  adapter: ${current.hotProjection.kind}\n`);
	process.stdout.write(`  online: ${String(current.hotProjection.online)}\n`);
	process.stdout.write(`  drifted: ${String(current.hotProjection.drifted)}\n`);
	process.stdout.write(formatStore(current.hotProjection.store));
	process.stdout.write('\n');

	process.stdout.write(`${BOLD}Snapshot layer${RESET}\n`);
	process.stdout.write(`  kind: ${current.snapshot.kind}\n`);
	process.stdout.write(`  checkpoints: ${current.snapshot.checkpointCount}\n`);
	process.stdout.write(`  lastHash: ${current.snapshot.lastCheckpointHash ?? 'none'}\n\n`);

	process.stdout.write(`${BOLD}Invariants${RESET}\n`);
	for (const invariant of evaluateInvariants(current)) {
		process.stdout.write(`  ${invariant}\n`);
	}
	process.stdout.write('\n');

	process.stdout.write(`${BOLD}Recent decisions${RESET}\n`);
	for (const verdict of current.verdicts) {
		process.stdout.write(`  - ${verdict}\n`);
	}
	process.stdout.write('\n');

	process.stdout.write(`${BOLD}Keys${RESET}\n`);
	process.stdout.write(`${BOLD}1${RESET} beta1 JSON  ${BOLD}2${RESET} beta2 Postgres  ${BOLD}3${RESET} mainnet DB service\n`);
	process.stdout.write(`${BOLD}o${RESET} append op   ${BOLD}f${RESET} toggle server   ${BOLD}s${RESET} sync projection   ${BOLD}r${RESET} rebuild\n`);
	process.stdout.write(`${BOLD}d${RESET} inject drift ${BOLD}i${RESET} enable IPFS     ${BOLD}c${RESET} checkpoint       ${BOLD}q${RESET} quit\n`);
}

function formatStore(store: PrototypeState['clientLocalStore']): string {
	return [
		`  lastBlock: ${store.lastBlock}`,
		`  claims: ${store.claimKeys.length}`,
		`  stateHash: ${store.stateHash}`,
	].join('\n') + '\n';
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
