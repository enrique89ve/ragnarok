#!/usr/bin/env node

/**
 * Two-browser P2P smoke for opening-hand / VS / arena mount (no packet chaos).
 * Manual follow-up: drive chess → collision → confirm mulligan on both sides.
 */

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const LOCAL_WORKSHOP_STARTER_STORAGE_KEY =
	'ragnarok-local-local-dev-ragnarok-cards-local:ragnarok-starter-claimed';

const CHROMIUM_ARGS = ['--no-sandbox', '--disable-setuid-sandbox'];

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

/** HashRouter: route lives in the fragment, not the path. */
function hashRouteUrl(origin, routePath) {
	const base = origin.replace(/\/$/, '');
	const path = routePath.startsWith('/') ? routePath : `/${routePath}`;
	return `${base}/#${path}`;
}

function usage() {
	console.log(`P2P opening-hand QA — dual browser launcher

Usage:
  pnpm run qa:p2p-opening-hand -- --url http://127.0.0.1:5000

Options:
  --url <url>           App origin (default: http://127.0.0.1:5000)
  --headed              Show both Chromium windows (recommended for P2P QA; needs DISPLAY in WSL)
  --no-click            Only open /multiplayer; do not press Find opponent
  --wait-ms <n>         Time to observe after matchmaking (default: 120000)
  --marker-text <re>    Body text regex both pages must hit (default below)
  --out <file>          JSON evidence path
`);
}

const DEFAULT_MARKER = /VS|Find opponent|mulligan|Keep Hand|Choose|Battle|Ready/i;

function parseArgs(argv) {
	const options = {
		url: 'http://127.0.0.1:5000',
		headed: false,
		click: true,
		waitMs: 120_000,
		markerText: DEFAULT_MARKER,
		out: resolve('artifacts/p2p-opening-hand-qa.json'),
		profileA: null,
		profileB: null,
	};
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '--') continue;
		if (arg === '--help' || arg === '-h') return { help: true, options };
		if (arg === '--headed') { options.headed = true; continue; }
		if (arg === '--no-click') { options.click = false; continue; }
		const value = argv[i + 1];
		if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
		if (arg === '--url') options.url = value.replace(/\/$/, '');
		else if (arg === '--wait-ms') options.waitMs = Number(value);
		else if (arg === '--marker-text') options.markerText = new RegExp(value, 'i');
		else if (arg === '--out') options.out = resolve(value);
		else if (arg === '--profile-a') options.profileA = resolve(value);
		else if (arg === '--profile-b') options.profileB = resolve(value);
		else throw new Error(`Unknown option ${arg}`);
		i += 1;
	}
	return { help: false, options };
}

async function waitForText(page, pattern, timeoutMs) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const text = await page.locator('body').innerText({ timeout: 5_000 }).catch(() => '');
		if (pattern.test(text)) return true;
		await new Promise(r => setTimeout(r, 500));
	}
	return false;
}

async function clickFindOpponent(page, timeoutMs) {
	const roleButton = page.getByRole('button', { name: /find opponent/i });
	const textButton = page.getByRole('button', { name: /^find opponent$/i });
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		for (const locator of [roleButton, textButton]) {
			if (await locator.isVisible().catch(() => false)) {
				await locator.click({ timeout: 5_000 });
				return;
			}
		}
		await new Promise(r => setTimeout(r, 400));
	}
	const snippet = await page.locator('body').innerText({ timeout: 5_000 }).catch(() => '');
	throw new Error(
		`Find opponent not visible after ${timeoutMs}ms. Body starts with: ${snippet.slice(0, 320).replace(/\s+/g, ' ')}`,
	);
}

async function readFlowMarker(page) {
	return page.evaluate(() => {
		const p2p = window.__RAGNAROK_P2P_QA__ ?? null;
		return {
			href: location.href,
			title: document.title,
			p2p: p2p ? { matchId: p2p.matchId, pokerRevision: p2p.revisions?.pokerRevision } : null,
		};
	}).catch(() => ({ href: '', title: '', p2p: null }));
}

async function run() {
	const parsed = parseArgs(process.argv.slice(2));
	if (parsed.help) {
		usage();
		return 0;
	}
	const options = parsed.options;
	let playwright;
	try {
		playwright = await import(process.env.P2P_CHAOS_PLAYWRIGHT_MODULE ?? 'playwright');
	} catch {
		console.error('Install Playwright: pnpm exec playwright install chromium');
		return 2;
	}

	const profileA = options.profileA ?? await mkdtemp(join(tmpdir(), 'ragnarok-p2p-qa-a-'));
	const profileB = options.profileB ?? await mkdtemp(join(tmpdir(), 'ragnarok-p2p-qa-b-'));
	const lobbyUrl = hashRouteUrl(options.url, '/multiplayer');
	const starterPayload = starterClaimPersistedState();
	const events = [];
	const contexts = [];
	const launchOptions = {
		headless: !options.headed,
		args: CHROMIUM_ARGS,
		viewport: { width: 1366, height: 768 },
	};

	try {
		const browserType = playwright.chromium;
		console.error(`[p2p-qa] Launching browser A (profile ${profileA})${options.headed ? ', headed' : ', headless'}`);
		console.error(`[p2p-qa] Launching browser B (profile ${profileB})${options.headed ? ', headed' : ', headless'}`);
		const [contextA, contextB] = await Promise.all([
			browserType.launchPersistentContext(profileA, launchOptions),
			browserType.launchPersistentContext(profileB, launchOptions),
		]);
		contexts.push(contextA, contextB);
		await Promise.all([
			contextA.addInitScript(initStarterClaimScript(), {
				payload: starterPayload,
				storageKey: LOCAL_WORKSHOP_STARTER_STORAGE_KEY,
			}),
			contextB.addInitScript(initStarterClaimScript(), {
				payload: starterPayload,
				storageKey: LOCAL_WORKSHOP_STARTER_STORAGE_KEY,
			}),
		]);
		const pageA = contextA.pages()[0] ?? await contextA.newPage();
		const pageB = contextB.pages()[0] ?? await contextB.newPage();

		await Promise.all([
			pageA.goto(lobbyUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 }),
			pageB.goto(lobbyUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 }),
		]);
		events.push({ at: Date.now(), kind: 'lobby_loaded', url: lobbyUrl });

		if (options.click) {
			await clickFindOpponent(pageA, 90_000);
			await new Promise(r => setTimeout(r, 500));
			await clickFindOpponent(pageB, 90_000);
			events.push({ at: Date.now(), kind: 'find_opponent_clicked' });
		}

		const [markerA, markerB] = await Promise.all([
			waitForText(pageA, options.markerText, options.waitMs),
			waitForText(pageB, options.markerText, options.waitMs),
		]);

		const shotDir = resolve('artifacts/p2p-opening-hand-qa-screenshots');
		await mkdir(shotDir, { recursive: true });
		const stamp = Date.now();
		await Promise.all([
			pageA.screenshot({ path: join(shotDir, `player-a-${stamp}.png`), fullPage: true }),
			pageB.screenshot({ path: join(shotDir, `player-b-${stamp}.png`), fullPage: true }),
		]);

		const [snapA, snapB] = await Promise.all([readFlowMarker(pageA), readFlowMarker(pageB)]);

		const evidence = {
			status: markerA && markerB ? 'PASS' : 'NEEDS_HUMAN',
			note: markerA && markerB
				? 'Both profiles reached lobby/match UI markers. Complete chess → VS → mulligan manually per docs/QA_OPENING_HAND_P2P.md.'
				: 'One or both profiles did not reach markers in time — inspect screenshots.',
			url: options.url,
			profiles: { A: profileA, B: profileB },
			markers: { A: markerA, B: markerB },
			snapshots: { A: snapA, B: snapB },
			screenshots: shotDir,
			events,
		};
		await mkdir(dirname(options.out), { recursive: true });
		await writeFile(options.out, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
		console.log(JSON.stringify(evidence, null, 2));
		return markerA && markerB ? 0 : 1;
	} finally {
		if (!options.headed) {
			await Promise.all(contexts.map(c => c.close().catch(() => undefined)));
		} else {
			console.error('\n[headed] Browsers left open — close windows or Ctrl+C when done.\n');
		}
	}
}

run().then(code => { process.exitCode = code; }).catch(err => {
	console.error(err);
	process.exitCode = 1;
});