#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ESLint } from 'eslint';

const DEFAULT_BATCH_SIZE = 40;
const RETRY_DELAY_MS = 200;
const MAX_EIO_RETRIES = 3;
const DEFAULT_MAX_WARNINGS = -1;

const IGNORED_PREFIXES = [
	'node_modules/',
	'dist/',
	'assembly/',
	'client/public/',
	'mcp-server/',
	'.vscode/',
	'scripts/',
];

function normalizePath(filePath) {
	return filePath.split(path.sep).join('/').replace(/^\.\//, '');
}

function isIgnored(filePath) {
	return filePath.endsWith('.d.ts') || IGNORED_PREFIXES.some(prefix => filePath.startsWith(prefix));
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(error) {
	const message = String(error?.message ?? error ?? '');
	const isTransientModuleResolutionFailure =
		error?.code === 'MODULE_NOT_FOUND' &&
		/Require stack:[\s\S]*node_modules\//.test(message);

	return error?.code === 'EIO' || /EIO|i\/o error/i.test(message) || isTransientModuleResolutionFailure;
}

function chunkFiles(files, size) {
	const chunks = [];
	for (let index = 0; index < files.length; index += size) {
		chunks.push(files.slice(index, index + size));
	}
	return chunks;
}

function collectRepoFiles() {
	const result = spawnSync(
		'git',
		['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', '*.ts', '*.tsx'],
		{ encoding: 'utf8' },
	);

	if (result.status !== 0) {
		const message = result.stderr || result.stdout || 'git ls-files failed';
		throw new Error(message.trim());
	}

	return result.stdout
		.split('\0')
		.map(file => normalizePath(file))
		.filter(Boolean)
		.filter(file => !isIgnored(file));
}

function parseArgs(argv) {
	const options = {
		fix: false,
		quiet: false,
		format: 'stylish',
		outputFile: null,
		maxWarnings: DEFAULT_MAX_WARNINGS,
		fileArgs: [],
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];

		if (!arg) {
			continue;
		}

		if (arg === '--fix') {
			options.fix = true;
			continue;
		}

		if (arg === '--quiet') {
			options.quiet = true;
			continue;
		}

		if (arg === '--format' || arg === '-f') {
			options.format = argv[index + 1] ?? options.format;
			index += 1;
			continue;
		}

		if (arg.startsWith('--format=')) {
			options.format = arg.slice('--format='.length) || options.format;
			continue;
		}

		if (arg === '--output-file' || arg === '-o') {
			options.outputFile = argv[index + 1] ?? null;
			index += 1;
			continue;
		}

		if (arg.startsWith('--output-file=')) {
			options.outputFile = arg.slice('--output-file='.length) || null;
			continue;
		}

		if (arg === '--max-warnings') {
			const value = argv[index + 1];
			options.maxWarnings = value == null ? DEFAULT_MAX_WARNINGS : Number(value);
			index += 1;
			continue;
		}

		if (arg.startsWith('--max-warnings=')) {
			options.maxWarnings = Number(arg.slice('--max-warnings='.length));
			continue;
		}

		if (arg.startsWith('-')) {
			throw new Error(`Unsupported ESLint runner argument: ${arg}`);
		}

		options.fileArgs.push(normalizePath(arg));
	}

	return options;
}

async function lintChunk(eslint, files, attempt = 0) {
	try {
		return await eslint.lintFiles(files);
	} catch (error) {
		if (files.length > 1) {
			const midpoint = Math.ceil(files.length / 2);
			const left = await lintChunk(eslint, files.slice(0, midpoint), 0);
			const right = await lintChunk(eslint, files.slice(midpoint), 0);
			return [...left, ...right];
		}

		if (isRetryableError(error) && attempt < MAX_EIO_RETRIES) {
			await sleep(RETRY_DELAY_MS * (attempt + 1));
			return lintChunk(eslint, files, attempt + 1);
		}

		error.message = `Failed while linting ${files[0]}: ${error.message}`;
		throw error;
	}
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	const inputFiles = options.fileArgs.length > 0 ? options.fileArgs.filter(file => !isIgnored(file)) : collectRepoFiles();

	if (inputFiles.length === 0) {
		process.exitCode = 0;
		return;
	}

	const eslint = new ESLint({
		errorOnUnmatchedPattern: false,
		fix: options.fix,
	});

	const results = [];
	for (const files of chunkFiles(inputFiles, DEFAULT_BATCH_SIZE)) {
		results.push(...await lintChunk(eslint, files));
	}

	if (options.fix) {
		await ESLint.outputFixes(results);
	}

	const displayedResults = options.quiet ? ESLint.getErrorResults(results) : results;
	const formatter = await eslint.loadFormatter(options.format);
	const output = formatter.format(displayedResults);

	if (options.outputFile) {
		await writeFile(options.outputFile, output);
	} else if (output) {
		process.stdout.write(output);
	}

	const errorCount = results.reduce((total, result) => total + result.errorCount + result.fatalErrorCount, 0);
	const warningCount = results.reduce((total, result) => total + result.warningCount, 0);

	if (errorCount > 0) {
		process.exitCode = 1;
		return;
	}

	if (options.maxWarnings >= 0 && warningCount > options.maxWarnings) {
		if (!options.outputFile && !output) {
			process.stdout.write(`ESLint found ${warningCount} warnings.\n`);
		}
		process.exitCode = 1;
		return;
	}

	process.exitCode = 0;
}

main().catch(error => {
	const message = error?.stack || error?.message || String(error);
	process.stderr.write(`${message}\n`);
	process.exitCode = 1;
});
