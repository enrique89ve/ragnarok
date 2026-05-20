import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

type HiveTxModule = typeof import('hive-tx');

let hiveTxPromise: Promise<HiveTxModule> | null = null;

function getBundlePath(entryUrl: string): string {
	const digest = createHash('sha256').update(entryUrl).digest('hex').slice(0, 12);
	return join(tmpdir(), 'ragnarok-hive-tx', `hive-tx-${digest}.mjs`);
}

async function buildHiveTxBundle(entryUrl: string, outfile: string): Promise<void> {
	const { build } = await import('esbuild');
	await mkdir(dirname(outfile), { recursive: true });
	await build({
		entryPoints: [fileURLToPath(entryUrl)],
		bundle: true,
		platform: 'node',
		format: 'esm',
		target: 'node20',
		outfile,
		logLevel: 'silent',
	});
}

async function importBundledHiveTx(cause: unknown): Promise<HiveTxModule> {
	const entryUrl = import.meta.resolve('hive-tx');
	const outfile = getBundlePath(entryUrl);
	if (!existsSync(outfile)) {
		try {
			await buildHiveTxBundle(entryUrl, outfile);
		} catch (bundleCause) {
			throw new Error('Failed to load hive-tx and failed to build a local hive-tx bundle', {
				cause: bundleCause instanceof Error ? bundleCause : cause,
			});
		}
	}
	return await import(pathToFileURL(outfile).href) as HiveTxModule;
}

export function loadHiveTx(): Promise<HiveTxModule> {
	hiveTxPromise ??= import('hive-tx').catch(importBundledHiveTx);
	return hiveTxPromise;
}
