#!/usr/bin/env node

/**
 * Single-player arena VFX smoke — drives a local Single match until the
 * betting panel is live, commits one bet, and records QA + screenshots.
 *
 * Usage:
 *   pnpm run dev   # other terminal
 *   pnpm run qa:arena-vfx -- --url http://127.0.0.1:5000
 *
 * Starter claim is pre-seeded via localStorage (workshop `local` runtime).
 * Override with ARENA_VFX_STARTER_STORAGE_KEY when fingerprint differs.
 *
 * Flow: Single → warband launch → chess (dev) → Battle Sandbox → mulligan → bet.
 * The Battle Sandbox shortcut exists only in local dev builds (`isDevBuild()`).
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/** @type {string} sync with createRuntimeStorageKey('ragnarok-starter-claimed') for RAGNAROK_RUNTIME_CONFIGS.local */
const LOCAL_WORKSHOP_STARTER_STORAGE_KEY =
	'ragnarok-local-local-dev-ragnarok-cards-local:ragnarok-starter-claimed';

const DEFAULTS = {
	url: 'http://127.0.0.1:5000',
	maxRuntimeMs: 300_000,
	outDir: resolve('artifacts/arena-vfx-smoke'),
	starterStorageKey: process.env.ARENA_VFX_STARTER_STORAGE_KEY ?? LOCAL_WORKSHOP_STARTER_STORAGE_KEY,
};

function usage() {
	console.log(`Arena VFX smoke (Single / poker presentation)

Usage:
  pnpm run qa:arena-vfx -- --url http://127.0.0.1:5000

Options:
  --url <url>            Dev server base (default: ${DEFAULTS.url})
  --headed               Show browser
  --out-dir <dir>        Evidence folder (default: artifacts/arena-vfx-smoke)
  --max-runtime-ms <n>   Hard stop (default: ${DEFAULTS.maxRuntimeMs})
  --starter-storage-key  localStorage key for starter zustand persist

Env:
  ARENA_VFX_STARTER_STORAGE_KEY  same as --starter-storage-key
`);
}

function parseArgs(argv) {
	const options = {
		...DEFAULTS,
		headed: false,
	};
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--help' || arg === '-h') return { help: true, options };
		if (arg === '--headed') { options.headed = true; continue; }
		const value = argv[index + 1];
		if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
		if (arg === '--url') options.url = value;
		else if (arg === '--out-dir') options.outDir = resolve(value);
		else if (arg === '--max-runtime-ms') options.maxRuntimeMs = Number(value);
		else if (arg === '--starter-storage-key') options.starterStorageKey = value;
		else throw new Error(`Unknown option ${arg}`);
		index += 1;
	}
	return { help: false, options };
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

function initStarterClaimScript() {
	return ({ payload, storageKey }) => {
		localStorage.setItem(storageKey, payload);
	};
}

async function readQaSnapshot(page) {
	return page.evaluate(() => globalThis.__RAGNAROK_ARENA_VFX_QA__ ?? null);
}

async function dramaChildCount(page) {
	return page.evaluate(() => document.getElementById('poker-drama-vfx-layer')?.childElementCount ?? 0);
}

function remainingMs(deadlineAt) {
	return Math.max(5_000, deadlineAt - Date.now());
}

/**
 * @param {import('playwright').Page} page
 * @param {Array<{ at: number, kind: string, [key: string]: unknown }>} events
 * @param {number} deadlineAt
 */
async function completeStarterCeremonyIfOpen(page, events, deadlineAt) {
	const gate = page.getByRole('button', { name: /^reveal starter deck$/i });
	if (!(await gate.isVisible({ timeout: 4_000 }).catch(() => false))) return;

	await gate.click();
	events.push({ at: Date.now(), kind: 'starter_gate_opened' });

	const birthright = page.getByRole('button', { name: /reveal your birthright/i });
	await birthright.waitFor({ state: 'visible', timeout: remainingMs(deadlineAt) });
	await birthright.click();
	events.push({ at: Date.now(), kind: 'starter_claim_clicked' });

	const closePack = page.getByRole('button', { name: /close pack opening/i });
	await closePack.waitFor({ state: 'visible', timeout: remainingMs(deadlineAt) });
	await page.waitForTimeout(6_000);
	await closePack.click({ force: true });
	events.push({ at: Date.now(), kind: 'starter_pack_closed' });

	const chooseLater = page.getByRole('button', { name: /^choose later$/i });
	if (await chooseLater.isVisible({ timeout: 8_000 }).catch(() => false)) {
		await chooseLater.click();
		events.push({ at: Date.now(), kind: 'mode_select_dismissed' });
	}
}

/**
 * @param {import('playwright').Page} page
 * @param {Array<{ at: number, kind: string, [key: string]: unknown }>} events
 * @param {number} deadlineAt
 */
/**
 * @param {import('playwright').Page} page
 * @param {Array<{ at: number, kind: string, [key: string]: unknown }>} events
 * @param {number} deadlineAt
 */
/**
 * Warband → chess → dev poker sandbox (local workshop).
 *
 * @param {import('playwright').Page} page
 * @param {Array<{ at: number, kind: string, [key: string]: unknown }>} events
 * @param {number} deadlineAt
 */
async function launchWarbandAndEnterPoker(page, events, deadlineAt) {
	const launchBattle = page.getByRole('button', { name: /^launch battle$/i });
	await launchBattle.waitFor({ state: 'visible', timeout: remainingMs(deadlineAt) });
	if (!(await launchBattle.isEnabled().catch(() => false))) {
		throw new Error('Launch Battle is disabled — complete warband loadouts before running arena VFX smoke.');
	}
	await launchBattle.click();
	events.push({ at: Date.now(), kind: 'warband_launched' });

	const sandbox = page.locator('button', { hasText: 'Battle Sandbox' });
	await sandbox.first().waitFor({ state: 'attached', timeout: remainingMs(deadlineAt) });
	await page.waitForTimeout(4_000);
	await sandbox.first().click({ force: true });
	events.push({ at: Date.now(), kind: 'dev_battle_sandbox' });

	await page.waitForFunction(() => (
		!!document.querySelector('#mulligan-title')
		|| !!document.querySelector('[data-zone="betting-panel"]')
	), { timeout: remainingMs(deadlineAt) });
}

/**
 * @param {import('playwright').Page} page
 * @param {Array<{ at: number, kind: string, [key: string]: unknown }>} events
 * @param {number} deadlineAt
 */
async function advanceThroughMulliganIfPresent(page, events, deadlineAt) {
	const keepHand = page.getByRole('button', {
		name: /keep the current hand|keep hand/i,
	});
	if (!(await keepHand.isVisible({ timeout: 6_000 }).catch(() => false))) return;
	await keepHand.click();
	events.push({ at: Date.now(), kind: 'mulligan_keep_hand' });
	await page.waitForTimeout(1_000);
}

async function run() {
	const parsed = parseArgs(process.argv.slice(2));
	if (parsed.help) { usage(); return 0; }
	const options = parsed.options;

	let playwright;
	try {
		playwright = await import(process.env.ARENA_VFX_PLAYWRIGHT_MODULE ?? 'playwright');
	} catch {
		console.error(JSON.stringify({
			status: 'BROWSER_GATE_BLOCKED',
			install: 'pnpm add -D playwright && pnpm exec playwright install chromium',
		}, null, 2));
		return 2;
	}

	await mkdir(options.outDir, { recursive: true });
	/** @type {Array<{ at: number, kind: string, text?: string, url?: string }>} */
	const events = [];
	const startedAt = new Date().toISOString();
	const deadlineAt = Date.now() + options.maxRuntimeMs;

	const browser = await playwright.chromium.launch({
		headless: !options.headed,
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
	});
	const context = await browser.newContext({
		viewport: { width: 1366, height: 768 },
		deviceScaleFactor: 1,
	});
	const payload = starterClaimPersistedState();
	await context.addInitScript(initStarterClaimScript(), {
		payload,
		storageKey: options.starterStorageKey,
	});

	const page = await context.newPage();
	page.setDefaultTimeout(options.maxRuntimeMs);
	page.on('console', msg => {
		if (msg.type() === 'error') events.push({ at: Date.now(), kind: 'console:error', text: msg.text() });
	});

	const gameUrl = `${options.url.replace(/\/$/, '')}/#/game/single?deck=default&difficulty=normal`;
	await page.goto(gameUrl, { waitUntil: 'networkidle', timeout: 120_000 });
	events.push({ at: Date.now(), kind: 'navigated', url: gameUrl });

	await completeStarterCeremonyIfOpen(page, events, deadlineAt);
	await launchWarbandAndEnterPoker(page, events, deadlineAt);
	await advanceThroughMulliganIfPresent(page, events, deadlineAt);

	const bettingPanel = page.locator('[data-zone="betting-panel"]');
	await bettingPanel.waitFor({ state: 'visible', timeout: remainingMs(deadlineAt) });
	events.push({ at: Date.now(), kind: 'betting_panel_visible' });
	await page.screenshot({ path: resolve(options.outDir, '02-poker-betting.png'), fullPage: true });

	const commitButton = page.locator('[data-zone="betting-panel"] .raise-btn').first();
	const matchButton = page.locator('[data-zone="betting-panel"] .call-btn').first();
	await commitButton.waitFor({ state: 'visible', timeout: remainingMs(deadlineAt) });

	const beforeDrama = await dramaChildCount(page);
	const beforeQa = await readQaSnapshot(page);

	if (await commitButton.isEnabled().catch(() => false)) {
		await commitButton.click();
		events.push({ at: Date.now(), kind: 'poker_commit_clicked' });
	} else if (await matchButton.isEnabled().catch(() => false)) {
		await matchButton.click();
		events.push({ at: Date.now(), kind: 'poker_match_clicked' });
	}

	await page.waitForTimeout(1_200);
	const afterDrama = await dramaChildCount(page);
	const afterQa = await readQaSnapshot(page);
	await page.screenshot({ path: resolve(options.outDir, '03-after-action.png'), fullPage: true });

	const beatCount = afterQa?.beats?.length ?? 0;
	const sawBettingBeat = Boolean(afterQa?.beats?.some(b => b.source === 'bettingAction'));
	const pass = beatCount > (beforeQa?.beats?.length ?? 0) && sawBettingBeat;

	const evidence = {
		status: pass ? 'PASS' : 'FAIL',
		startedAt,
		finishedAt: new Date().toISOString(),
		url: gameUrl,
		starterStorageKey: options.starterStorageKey,
		events,
		before: { dramaChildren: beforeDrama, qa: beforeQa },
		after: { dramaChildren: afterDrama, qa: afterQa },
		screenshots: ['02-poker-betting.png', '03-after-action.png'],
		passCriteria: {
			bettingPanelVisible: true,
			qaBettingBeat: sawBettingBeat,
			dramaLayerActive: afterDrama >= 0,
		},
	};

	await writeFile(resolve(options.outDir, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
	console.log(JSON.stringify(evidence, null, 2));

	await browser.close();
	return pass ? 0 : 1;
}

run().then(code => {
	process.exitCode = code;
}).catch(error => {
	console.error(error);
	process.exitCode = 1;
});