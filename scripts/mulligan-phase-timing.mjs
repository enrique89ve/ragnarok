#!/usr/bin/env node

/**
 * Measures chess → VS → mulligan → betting without the 4s Battle Sandbox dwell.
 *
 *   pnpm run dev
 *   node scripts/mulligan-phase-timing.mjs --url http://127.0.0.1:5000
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LOCAL_WORKSHOP_STARTER_STORAGE_KEY =
	'ragnarok-local-local-dev-ragnarok-cards-local:ragnarok-starter-claimed';

function parseArgs(argv) {
	const options = {
		url: 'http://127.0.0.1:5000',
		outDir: resolve('artifacts/mulligan-phase-timing'),
		sandboxDwellMs: 600,
	};
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		const value = argv[index + 1];
		if (arg === '--url' && value) options.url = value;
		else if (arg === '--out-dir' && value) options.outDir = resolve(value);
		else if (arg === '--sandbox-dwell-ms' && value) options.sandboxDwellMs = Number(value);
		index += arg.startsWith('--') && value && !value.startsWith('--') ? 1 : 0;
	}
	return options;
}

function starterClaimPersistedState() {
	return JSON.stringify({
		state: {
			claimed: true,
			claimedByAccount: { local: true },
			legacyClaimAccountId: null,
			starterReputationByAccount: {},
		},
		version: 0,
	});
}

async function pollPhase(page, deadlineAt) {
	return page.waitForFunction(
		() => {
			const tag = document.querySelector('.ragnarok-chess-game')?.getAttribute('data-flow-tag') ?? null;
			const chess = Boolean(document.querySelector('.ragnarok-chess-game .chess-board, .ragnarok-chess-game [class*="chess"]'));
			const vs = Boolean(document.querySelector('.vs-screen-overlay'));
			const mulligan = Boolean(
				document.querySelector('#mulligan-title')
				|| Array.from(document.querySelectorAll('h2')).some(h => /mulligan/i.test(h.textContent ?? '')),
			);
			const betting = Boolean(document.querySelector('[data-zone="betting-panel"]'));
			return { tag, chess, vs, mulligan, betting, t: performance.now() };
		},
		{ timeout: Math.max(5_000, deadlineAt - Date.now()) },
	);
}

async function run() {
	const options = parseArgs(process.argv.slice(2));
	const playwright = await import('playwright');
	await mkdir(options.outDir, { recursive: true });

	const t0 = Date.now();
	/** @type {Record<string, number>} */
	const marks = {};
	/** @type {Array<{ ms: number, phase: string, detail?: Record<string, unknown> }>} */
	const timeline = [];

	const browser = await playwright.chromium.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
	});
	const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
	await context.addInitScript(({ payload, storageKey }) => {
		localStorage.setItem(storageKey, payload);
	}, { payload: starterClaimPersistedState(), storageKey: LOCAL_WORKSHOP_STARTER_STORAGE_KEY });

	const page = await context.newPage();
	const gameUrl = `${options.url.replace(/\/$/, '')}/#/game/single?deck=default&difficulty=normal`;
	await page.goto(gameUrl, { waitUntil: 'networkidle', timeout: 120_000 });
	marks.navigated = Date.now() - t0;
	timeline.push({ ms: marks.navigated, phase: 'navigated' });

	const launch = page.getByRole('button', { name: /^launch battle$/i });
	await launch.waitFor({ state: 'visible', timeout: 60_000 });
	await launch.click();
	marks.warband_launched = Date.now() - t0;
	timeline.push({ ms: marks.warband_launched, phase: 'warband_launched' });

	const deadline = Date.now() + 120_000;
	let lastTag = '';

	while (Date.now() < deadline) {
		const snap = await page.evaluate(() => ({
			tag: document.querySelector('.ragnarok-chess-game')?.getAttribute('data-flow-tag') ?? null,
			vs: Boolean(document.querySelector('.vs-screen-overlay')),
			mulligan: Boolean(
				document.querySelector('#mulligan-title')
				|| Array.from(document.querySelectorAll('h2')).some(h => /mulligan/i.test(h.textContent ?? '')),
			),
			betting: Boolean(document.querySelector('[data-zone="betting-panel"]')),
			canvas: document.querySelectorAll('canvas').length,
		}));

		if (snap.tag && snap.tag !== lastTag) {
			lastTag = snap.tag;
			const key = `flow_${snap.tag}`;
			if (marks[key] === undefined) {
				marks[key] = Date.now() - t0;
				timeline.push({ ms: marks[key], phase: key, detail: { canvas: snap.canvas } });
			}
		}
		if (snap.vs && marks.vs_screen_dom === undefined) {
			marks.vs_screen_dom = Date.now() - t0;
			timeline.push({ ms: marks.vs_screen_dom, phase: 'vs_screen_dom' });
		}
		if (snap.mulligan && marks.mulligan_visible === undefined) {
			marks.mulligan_visible = Date.now() - t0;
			timeline.push({ ms: marks.mulligan_visible, phase: 'mulligan_visible', detail: { canvas: snap.canvas } });
		}
		if (snap.betting && marks.betting_visible === undefined) {
			marks.betting_visible = Date.now() - t0;
			timeline.push({ ms: marks.betting_visible, phase: 'betting_visible', detail: { canvas: snap.canvas } });
			break;
		}

		const sandbox = page.locator('button', { hasText: 'Battle Sandbox' });
		if (await sandbox.first().isVisible().catch(() => false)) {
			if (marks.sandbox_seen === undefined) {
				marks.sandbox_seen = Date.now() - t0;
				timeline.push({ ms: marks.sandbox_seen, phase: 'sandbox_seen' });
			}
			if (marks.sandbox_clicked === undefined) {
				await page.waitForTimeout(options.sandboxDwellMs);
				await sandbox.first().click({ force: true });
				marks.sandbox_clicked = Date.now() - t0;
				timeline.push({ ms: marks.sandbox_clicked, phase: 'sandbox_clicked' });
			}
		}

		const keep = page.getByRole('button', { name: /keep the current hand|keep hand/i });
		if (await keep.isVisible().catch(() => false) && marks.mulligan_keep_clicked === undefined) {
			await page.waitForTimeout(400);
			await keep.click();
			marks.mulligan_keep_clicked = Date.now() - t0;
			timeline.push({ ms: marks.mulligan_keep_clicked, phase: 'mulligan_keep_clicked' });
		}

		await page.waitForTimeout(120);
	}

	const deltas = {
		launch_to_sandbox_click: marks.sandbox_clicked != null && marks.warband_launched != null
			? marks.sandbox_clicked - marks.warband_launched
			: null,
		sandbox_to_mulligan: marks.mulligan_visible != null && marks.sandbox_clicked != null
			? marks.mulligan_visible - marks.sandbox_clicked
			: null,
		vs_to_mulligan: marks.mulligan_visible != null && marks.vs_screen_dom != null
			? marks.mulligan_visible - marks.vs_screen_dom
			: null,
		keep_to_betting: marks.betting_visible != null && marks.mulligan_keep_clicked != null
			? marks.betting_visible - marks.mulligan_keep_clicked
			: null,
	};

	const evidence = {
		status: marks.betting_visible != null ? 'PASS' : 'INCOMPLETE',
		url: gameUrl,
		marks,
		deltas,
		timeline,
	};
	await writeFile(resolve(options.outDir, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
	console.log(JSON.stringify(evidence, null, 2));
	await browser.close();
	process.exitCode = marks.betting_visible != null ? 0 : 1;
}

run().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});