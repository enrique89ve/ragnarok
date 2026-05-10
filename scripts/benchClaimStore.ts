#!/usr/bin/env tsx

import {
	runClaimStoreBenchmark,
	type ClaimStoreAdapterName,
	type ClaimStoreBenchmarkInput,
	type ClaimStoreBenchmarkResult,
} from '../server/benchmarks/claimStoreBenchmark.ts';

interface CliOptions extends ClaimStoreBenchmarkInput {
	failOnThreshold: boolean;
	help: boolean;
}

const SUPPORTED_ADAPTERS = new Set<ClaimStoreAdapterName>(['json', 'memory']);

async function main(): Promise<void> {
	const options = parseArgs(process.argv.slice(2));
	if (options.help) {
		printHelp();
		return;
	}

	const result = await runClaimStoreBenchmark(options);
	printSummary(result);

	if (!result.passed && options.failOnThreshold) {
		process.exitCode = 1;
	}
}

function parseArgs(argv: string[]): CliOptions {
	const options: CliOptions = {
		failOnThreshold: false,
		help: false,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (!arg) continue;

		const option = optionName(arg);
		if (option === '--help' || option === '-h') {
			options.help = true;
			continue;
		}

		if (option === '--fail-on-threshold') {
			options.failOnThreshold = true;
			continue;
		}

		const parsed = optionValue(argv, index, arg);
		index = parsed.nextIndex;

		switch (option) {
			case '--adapter':
				options.adapter = parseAdapter(parsed.value);
				break;
			case '--claims':
				options.claimCount = parsePositiveInteger(parsed.value, option);
				break;
			case '--reads':
				options.readCount = parsePositiveInteger(parsed.value, option);
				break;
			case '--accounts':
				options.accountCount = parsePositiveInteger(parsed.value, option);
				break;
			case '--flush-every':
				options.flushEvery = parsePositiveInteger(parsed.value, option);
				break;
			case '--json-file':
				options.jsonFile = parsed.value;
				break;
			case '--output-dir':
				options.outputDir = parsed.value;
				break;
			case '--write-p95-ms':
				options.thresholds = { ...options.thresholds, writeP95Ms: parsePositiveNumber(parsed.value, option) };
				break;
			case '--read-p95-ms':
				options.thresholds = { ...options.thresholds, readP95Ms: parsePositiveNumber(parsed.value, option) };
				break;
			case '--flush-p95-ms':
				options.thresholds = { ...options.thresholds, flushP95Ms: parsePositiveNumber(parsed.value, option) };
				break;
			default:
				throw new Error(`Unsupported argument: ${option}`);
		}
	}

	return options;
}

function optionName(arg: string): string {
	const equalsIndex = arg.indexOf('=');
	if (equalsIndex === -1) return arg;
	return arg.slice(0, equalsIndex);
}

function optionValue(argv: string[], index: number, arg: string): { value: string; nextIndex: number } {
	const equalsIndex = arg.indexOf('=');
	if (equalsIndex !== -1) {
		return {
			value: arg.slice(equalsIndex + 1),
			nextIndex: index,
		};
	}

	const value = argv[index + 1];
	if (!value) {
		throw new Error(`Missing value for ${arg}`);
	}

	return {
		value,
		nextIndex: index + 1,
	};
}

function parseAdapter(value: string): ClaimStoreAdapterName {
	if (SUPPORTED_ADAPTERS.has(value as ClaimStoreAdapterName)) {
		return value as ClaimStoreAdapterName;
	}

	throw new Error(`Unsupported adapter "${value}". Use json or memory.`);
}

function parsePositiveInteger(value: string, option: string): number {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(`${option} must be a positive integer.`);
	}

	return parsed;
}

function parsePositiveNumber(value: string, option: string): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new Error(`${option} must be a positive number.`);
	}

	return parsed;
}

function printSummary(result: ClaimStoreBenchmarkResult): void {
	const lines = [
		`claim-store benchmark: ${result.options.adapter}`,
		`claims=${result.options.claimCount} reads=${result.options.readCount} flushEvery=${result.options.flushEvery}`,
		`write p95=${result.stats.writes.p95Ms}ms read p95=${result.stats.reads.p95Ms}ms flush p95=${result.stats.flushes.p95Ms}ms`,
		`write slope=${result.regressions.writeP95ByClaimCount.slopeMsPerClaim}ms/claim limit=${formatLimit(result.regressions.writeP95ByClaimCount.estimatedClaimLimitAtThreshold)}`,
		`flush slope=${result.regressions.flushMsByClaimCount.slopeMsPerClaim}ms/claim limit=${formatLimit(result.regressions.flushMsByClaimCount.estimatedClaimLimitAtThreshold)}`,
		`thresholds=${result.passed ? 'pass' : 'fail'}`,
		`output=${result.outputFile}`,
	];
	process.stdout.write(`${lines.join('\n')}\n`);
}

function formatLimit(limit: number | null): string {
	return limit === null ? 'not projected' : String(limit);
}

function printHelp(): void {
	process.stdout.write(`Usage: npm run bench:claim-store -- [options]

Options:
  --adapter json|memory       Storage adapter to measure (default: json)
  --claims <n>                Claims to write (default: 2000)
  --reads <n>                 Claim lookups to read (default: 2000)
  --accounts <n>              Distinct accounts in the dataset (default: 250)
  --flush-every <n>           Persist after this many writes (default: 100)
  --json-file <path>          JSON adapter file (default: .scratch/benchmarks/*)
  --output-dir <path>         Benchmark report directory (default: .scratch/benchmarks)
  --write-p95-ms <n>          Write p95 budget (default: 100)
  --read-p95-ms <n>           Read p95 budget (default: 50)
  --flush-p95-ms <n>          Flush p95 budget (default: 250)
  --fail-on-threshold         Exit non-zero when latency budgets fail
`);
}

main().catch(error => {
	const message = error instanceof Error ? error.message : String(error);
	process.stderr.write(`${message}\n`);
	process.exitCode = 1;
});
