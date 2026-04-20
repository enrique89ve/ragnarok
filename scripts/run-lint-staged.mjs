#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

function run(command, args, options = {}) {
	return spawnSync(command, args, {
		encoding: 'utf8',
		stdio: 'pipe',
		...options,
	});
}

function hasStagedFiles() {
	const result = run('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']);

	if (result.status !== 0) {
		throw new Error((result.stderr || result.stdout || 'Unable to inspect staged files').trim());
	}

	return result.stdout.length > 0;
}

function printOutput(result) {
	if (result.stdout) {
		process.stdout.write(result.stdout);
	}

	if (result.stderr) {
		process.stderr.write(result.stderr);
	}
}

function runLintStaged() {
	return run('npx', ['lint-staged', '--config', 'lint-staged.config.mjs']);
}

function refreshIndex() {
	return run('git', ['update-index', '-q', '--refresh']);
}

function shouldRetry(result) {
	const combinedOutput = `${result.stdout || ''}\n${result.stderr || ''}`;
	return combinedOutput.includes('Failed to get staged files!');
}

function main() {
	if (!hasStagedFiles()) {
		return;
	}

	let result = runLintStaged();
	printOutput(result);

	if (result.status === 0) {
		return;
	}

	if (shouldRetry(result)) {
		refreshIndex();
		result = runLintStaged();
		printOutput(result);
	}

	process.exit(result.status ?? 1);
}

try {
	main();
} catch (error) {
	process.stderr.write(`${error?.stack || error?.message || String(error)}\n`);
	process.exit(1);
}
