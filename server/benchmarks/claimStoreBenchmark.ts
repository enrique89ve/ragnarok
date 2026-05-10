import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

export type ClaimStoreAdapterName = 'json' | 'memory';

export interface ClaimStoreThresholds {
	writeP95Ms: number;
	readP95Ms: number;
	flushP95Ms: number;
}

export interface ClaimStoreBenchmarkInput {
	adapter?: ClaimStoreAdapterName;
	claimCount?: number;
	readCount?: number;
	accountCount?: number;
	flushEvery?: number;
	jsonFile?: string;
	outputDir?: string;
	thresholds?: Partial<ClaimStoreThresholds>;
}

export interface ClaimStoreBenchmarkOptions {
	adapter: ClaimStoreAdapterName;
	claimCount: number;
	readCount: number;
	accountCount: number;
	flushEvery: number;
	jsonFile: string;
	outputDir: string;
	thresholds: ClaimStoreThresholds;
}

export interface LatencySummary {
	count: number;
	minMs: number;
	avgMs: number;
	p50Ms: number;
	p95Ms: number;
	p99Ms: number;
	maxMs: number;
}

export interface LinearRegressionSummary {
	interceptMs: number;
	slopeMsPerClaim: number;
	rSquared: number;
	estimatedClaimLimitAtThreshold: number | null;
}

export interface ClaimStoreBenchmarkResult {
	version: 1;
	runId: string;
	generatedAt: string;
	outputFile: string;
	options: ClaimStoreBenchmarkOptions;
	stats: {
		writes: LatencySummary;
		reads: LatencySummary;
		flushes: LatencySummary;
	};
	regressions: {
		writeP95ByClaimCount: LinearRegressionSummary;
		flushMsByClaimCount: LinearRegressionSummary;
	};
	readMix: {
		hits: number;
		misses: number;
	};
	passed: boolean;
}

interface ClaimRecord {
	claimKey: string;
	account: string;
	rewardId: string;
	blockNum: number;
	claimedAt: number;
}

interface ReadTarget {
	account: string;
	rewardId: string;
}

interface ClaimStoreAdapter {
	readonly name: ClaimStoreAdapterName;
	putClaim(claim: ClaimRecord): Promise<void>;
	hasClaim(account: string, rewardId: string): Promise<boolean>;
	flush(): Promise<void>;
}

interface RegressionPoint {
	x: number;
	y: number;
}

interface TimedResult<TValue> {
	value: TValue;
	durationMs: number;
}

const BENCHMARK_VERSION = 1;
const DEFAULT_CLAIM_COUNT = 2_000;
const DEFAULT_READ_COUNT = 2_000;
const DEFAULT_ACCOUNT_COUNT = 250;
const DEFAULT_FLUSH_EVERY = 100;
const DEFAULT_THRESHOLDS: ClaimStoreThresholds = {
	writeP95Ms: 100,
	readP95Ms: 50,
	flushP95Ms: 250,
};

class MemoryClaimStore implements ClaimStoreAdapter {
	readonly name = 'memory';
	private readonly claims = new Map<string, ClaimRecord>();

	async putClaim(claim: ClaimRecord): Promise<void> {
		if (this.claims.has(claim.claimKey)) return;
		this.claims.set(claim.claimKey, claim);
	}

	async hasClaim(account: string, rewardId: string): Promise<boolean> {
		return this.claims.has(toClaimKey(account, rewardId));
	}

	async flush(): Promise<void> {
		return;
	}
}

class JsonClaimStore implements ClaimStoreAdapter {
	readonly name = 'json';
	private readonly claims = new Map<string, ClaimRecord>();

	private constructor(private readonly filePath: string) {}

	static async create(filePath: string): Promise<JsonClaimStore> {
		const store = new JsonClaimStore(filePath);
		await store.load();
		return store;
	}

	async putClaim(claim: ClaimRecord): Promise<void> {
		if (this.claims.has(claim.claimKey)) return;
		this.claims.set(claim.claimKey, claim);
	}

	async hasClaim(account: string, rewardId: string): Promise<boolean> {
		return this.claims.has(toClaimKey(account, rewardId));
	}

	async flush(): Promise<void> {
		await mkdir(path.dirname(this.filePath), { recursive: true });
		const tmpFile = `${this.filePath}.tmp`;
		const payload = JSON.stringify({ claims: [...this.claims.entries()] });
		await writeFile(tmpFile, payload, 'utf8');
		await rename(tmpFile, this.filePath);
	}

	private async load(): Promise<void> {
		try {
			const raw = await readFile(this.filePath, 'utf8');
			const parsed: unknown = JSON.parse(raw);
			if (!isSerializedClaimStore(parsed)) return;
			for (const tuple of parsed.claims ?? []) {
				if (!isClaimTuple(tuple)) continue;
				this.claims.set(tuple[0], tuple[1]);
			}
		} catch (error) {
			if (isMissingFileError(error)) return;
			throw error;
		}
	}
}

export async function runClaimStoreBenchmark(input: ClaimStoreBenchmarkInput = {}): Promise<ClaimStoreBenchmarkResult> {
	const runId = randomUUID();
	const generatedAt = new Date().toISOString();
	const options = normalizeOptions(input, runId);
	const adapter = await createAdapter(options);

	const writeDurations: number[] = [];
	const flushPoints: RegressionPoint[] = [];
	const flushDurations: number[] = [];
	const claims: ClaimRecord[] = [];

	for (let index = 0; index < options.claimCount; index += 1) {
		const claim = createClaim(index, options.accountCount, runId);
		claims.push(claim);

		const write = await measure(() => adapter.putClaim(claim));
		writeDurations.push(write.durationMs);

		const shouldFlush = (index + 1) % options.flushEvery === 0;
		if (!shouldFlush) continue;

		const flush = await measure(() => adapter.flush());
		flushDurations.push(flush.durationMs);
		flushPoints.push({ x: index + 1, y: flush.durationMs });
	}

	const finalFlush = await measure(() => adapter.flush());
	flushDurations.push(finalFlush.durationMs);
	flushPoints.push({ x: options.claimCount, y: finalFlush.durationMs });

	const readDurations: number[] = [];
	let readHits = 0;
	let readMisses = 0;
	for (let index = 0; index < options.readCount; index += 1) {
		const target = createReadTarget(index, claims, runId);
		const read = await measure(() => adapter.hasClaim(target.account, target.rewardId));
		readDurations.push(read.durationMs);
		if (read.value) {
			readHits += 1;
		} else {
			readMisses += 1;
		}
	}

	const stats = {
		writes: summarizeLatency(writeDurations),
		reads: summarizeLatency(readDurations),
		flushes: summarizeLatency(flushDurations),
	};
	const writeP95Regression = withThresholdLimit(
		fitLinearRegression(toP95Points(writeDurations, options.flushEvery)),
		options.thresholds.writeP95Ms,
	);
	const flushRegression = withThresholdLimit(
		fitLinearRegression(flushPoints),
		options.thresholds.flushP95Ms,
	);
	const passed =
		stats.writes.p95Ms <= options.thresholds.writeP95Ms &&
		stats.reads.p95Ms <= options.thresholds.readP95Ms &&
		stats.flushes.p95Ms <= options.thresholds.flushP95Ms;

	const outputFile = path.join(options.outputDir, `claim-store-${runId}.json`);
	const result: ClaimStoreBenchmarkResult = {
		version: BENCHMARK_VERSION,
		runId,
		generatedAt,
		outputFile,
		options,
		stats,
		regressions: {
			writeP95ByClaimCount: writeP95Regression,
			flushMsByClaimCount: flushRegression,
		},
		readMix: {
			hits: readHits,
			misses: readMisses,
		},
		passed,
	};

	await mkdir(options.outputDir, { recursive: true });
	await writeFile(outputFile, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

	return result;
}

function normalizeOptions(input: ClaimStoreBenchmarkInput, runId: string): ClaimStoreBenchmarkOptions {
	const outputDir = input.outputDir ?? path.join(process.cwd(), '.scratch', 'benchmarks');
	const thresholds = {
		...DEFAULT_THRESHOLDS,
		...input.thresholds,
	};

	return {
		adapter: input.adapter ?? 'json',
		claimCount: positiveInteger(input.claimCount, DEFAULT_CLAIM_COUNT),
		readCount: positiveInteger(input.readCount, DEFAULT_READ_COUNT),
		accountCount: positiveInteger(input.accountCount, DEFAULT_ACCOUNT_COUNT),
		flushEvery: positiveInteger(input.flushEvery, DEFAULT_FLUSH_EVERY),
		jsonFile: input.jsonFile ?? path.join(outputDir, `claim-store-state-${runId}.json`),
		outputDir,
		thresholds,
	};
}

async function createAdapter(options: ClaimStoreBenchmarkOptions): Promise<ClaimStoreAdapter> {
	if (options.adapter === 'memory') return new MemoryClaimStore();
	return JsonClaimStore.create(options.jsonFile);
}

function createClaim(index: number, accountCount: number, runId: string): ClaimRecord {
	const account = `bench-${runId}-${index % accountCount}`;
	const rewardId = `reward-${Math.floor(index / accountCount)}`;
	return {
		claimKey: toClaimKey(account, rewardId),
		account,
		rewardId,
		blockNum: 1_000_000 + index,
		claimedAt: 1_800_000_000_000 + index,
	};
}

function createReadTarget(index: number, claims: ClaimRecord[], runId: string): ReadTarget {
	if (index % 5 === 0) {
		return {
			account: `missing-${runId}-${index}`,
			rewardId: 'missing',
		};
	}

	const claim = claims[index % claims.length];
	return {
		account: claim.account,
		rewardId: claim.rewardId,
	};
}

function toClaimKey(account: string, rewardId: string): string {
	return `${account}:${rewardId}`;
}

async function measure<TValue>(operation: () => Promise<TValue>): Promise<TimedResult<TValue>> {
	const start = performance.now();
	const value = await operation();
	return {
		value,
		durationMs: performance.now() - start,
	};
}

function summarizeLatency(samples: number[]): LatencySummary {
	if (samples.length === 0) {
		return {
			count: 0,
			minMs: 0,
			avgMs: 0,
			p50Ms: 0,
			p95Ms: 0,
			p99Ms: 0,
			maxMs: 0,
		};
	}

	const sorted = [...samples].sort((left, right) => left - right);
	const total = samples.reduce((sum, value) => sum + value, 0);
	return {
		count: samples.length,
		minMs: roundMs(sorted[0]),
		avgMs: roundMs(total / samples.length),
		p50Ms: roundMs(percentile(sorted, 0.5)),
		p95Ms: roundMs(percentile(sorted, 0.95)),
		p99Ms: roundMs(percentile(sorted, 0.99)),
		maxMs: roundMs(sorted[sorted.length - 1]),
	};
}

function percentile(sortedSamples: number[], percentileValue: number): number {
	const index = Math.min(sortedSamples.length - 1, Math.max(0, Math.ceil(sortedSamples.length * percentileValue) - 1));
	return sortedSamples[index];
}

function toP95Points(samples: number[], bucketSize: number): RegressionPoint[] {
	const points: RegressionPoint[] = [];
	for (let start = 0; start < samples.length; start += bucketSize) {
		const bucket = samples.slice(start, start + bucketSize);
		points.push({
			x: start + bucket.length,
			y: summarizeLatency(bucket).p95Ms,
		});
	}
	return points;
}

function fitLinearRegression(points: RegressionPoint[]): Omit<LinearRegressionSummary, 'estimatedClaimLimitAtThreshold'> {
	if (points.length < 2) {
		return {
			interceptMs: roundMs(points[0]?.y ?? 0),
			slopeMsPerClaim: 0,
			rSquared: 1,
		};
	}

	let sumX = 0;
	let sumY = 0;
	let sumXY = 0;
	let sumXX = 0;
	for (const point of points) {
		sumX += point.x;
		sumY += point.y;
		sumXY += point.x * point.y;
		sumXX += point.x * point.x;
	}

	const count = points.length;
	const denominator = count * sumXX - sumX * sumX;
	if (denominator === 0) {
		return {
			interceptMs: roundMs(sumY / count),
			slopeMsPerClaim: 0,
			rSquared: 1,
		};
	}

	const slope = (count * sumXY - sumX * sumY) / denominator;
	const intercept = (sumY - slope * sumX) / count;
	const meanY = sumY / count;
	let residualSquares = 0;
	let totalSquares = 0;
	for (const point of points) {
		const predicted = intercept + slope * point.x;
		residualSquares += (point.y - predicted) ** 2;
		totalSquares += (point.y - meanY) ** 2;
	}

	return {
		interceptMs: roundMs(intercept),
		slopeMsPerClaim: roundMs(slope),
		rSquared: totalSquares === 0 ? 1 : roundRatio(1 - residualSquares / totalSquares),
	};
}

function withThresholdLimit(
	regression: Omit<LinearRegressionSummary, 'estimatedClaimLimitAtThreshold'>,
	thresholdMs: number,
): LinearRegressionSummary {
	if (regression.slopeMsPerClaim <= 0) {
		return {
			...regression,
			estimatedClaimLimitAtThreshold: null,
		};
	}

	return {
		...regression,
		estimatedClaimLimitAtThreshold: Math.max(0, Math.floor((thresholdMs - regression.interceptMs) / regression.slopeMsPerClaim)),
	};
}

function positiveInteger(value: number | undefined, fallback: number): number {
	if (value === undefined) return fallback;
	if (!Number.isInteger(value) || value <= 0) return fallback;
	return value;
}

function roundMs(value: number): number {
	return Number(value.toFixed(4));
}

function roundRatio(value: number): number {
	return Number(value.toFixed(6));
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isSerializedClaimStore(value: unknown): value is { claims?: unknown[] } {
	if (!isObject(value)) return false;
	return value.claims === undefined || Array.isArray(value.claims);
}

function isClaimTuple(value: unknown): value is [string, ClaimRecord] {
	return Array.isArray(value) && value.length === 2 && typeof value[0] === 'string' && isClaimRecord(value[1]);
}

function isClaimRecord(value: unknown): value is ClaimRecord {
	if (!isObject(value)) return false;
	return (
		typeof value.claimKey === 'string' &&
		typeof value.account === 'string' &&
		typeof value.rewardId === 'string' &&
		typeof value.blockNum === 'number' &&
		typeof value.claimedAt === 'number'
	);
}

function isMissingFileError(error: unknown): boolean {
	return isObject(error) && error.code === 'ENOENT';
}
