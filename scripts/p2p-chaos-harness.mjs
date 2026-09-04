#!/usr/bin/env node

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const DEFAULTS = {
	latencyMs: 150,
	dropRate: 0.05,
	duplicateRate: 0.03,
	reorderRate: 0.2,
	chaosAfterMs: 4_000,
	maxRuntimeMs: 180_000,
	battleText: 'Battle|VS|Ready',
	terminalText: 'Game over|Victory|Defeat|Match complete',
};

function usage() {
	console.log(`P2P two-browser chaos release gate

Usage:
  pnpm run qa:p2p-chaos -- --url https://testnet.example

Options:
  --url <url>                 Deployed app URL (required)
  --profile-a <dir>           Persistent Chromium profile for player A
  --profile-b <dir>           Persistent Chromium profile for player B
  --headed                    Show both browsers
  --no-click                  Open both profiles without pressing Find opponent
  --latency-ms <n>            Added outbound latency (default: 150)
  --drop-rate <0..1>          Outbound packet drop probability (default: 0.05)
  --duplicate-rate <0..1>     Duplicate probability (default: 0.03)
  --reorder-rate <0..1>       Extra delay probability (default: 0.2)
  --chaos-after-ms <n>        Offline/reconnect delay after start (default: 4000)
  --max-runtime-ms <n>        Maximum gate duration (default: 180000)
  --battle-text <regex>       Text proving BattleReady (default: Battle|VS|Ready)
  --terminal-text <regex>     Text proving a terminal result
  --out <file>                JSON evidence path
`);
}

function parseArgs(argv) {
	const options = { ...DEFAULTS, click: true, headed: false, out: null, url: null, profileA: null, profileB: null };
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--') continue;
		if (arg === '--help' || arg === '-h') return { help: true, options };
		if (arg === '--headed') { options.headed = true; continue; }
		if (arg === '--no-click') { options.click = false; continue; }
		const value = argv[index + 1];
		if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
		if (arg === '--url') options.url = value;
		else if (arg === '--profile-a') options.profileA = resolve(value);
		else if (arg === '--profile-b') options.profileB = resolve(value);
		else if (arg === '--out') options.out = resolve(value);
		else if (arg === '--battle-text') options.battleText = value;
		else if (arg === '--terminal-text') options.terminalText = value;
		else if (arg === '--latency-ms') options.latencyMs = Number(value);
		else if (arg === '--drop-rate') options.dropRate = Number(value);
		else if (arg === '--duplicate-rate') options.duplicateRate = Number(value);
		else if (arg === '--reorder-rate') options.reorderRate = Number(value);
		else if (arg === '--chaos-after-ms') options.chaosAfterMs = Number(value);
		else if (arg === '--max-runtime-ms') options.maxRuntimeMs = Number(value);
		else throw new Error(`Unknown option ${arg}`);
		index += 1;
	}
	return { help: false, options };
}

function validateOptions(options) {
	if (!options.url) throw new Error('--url is required');
	for (const name of ['latencyMs', 'chaosAfterMs', 'maxRuntimeMs']) {
		if (!Number.isFinite(options[name]) || options[name] < 0) throw new Error(`${name} must be a non-negative number`);
	}
	for (const name of ['dropRate', 'duplicateRate', 'reorderRate']) {
		if (!Number.isFinite(options[name]) || options[name] < 0 || options[name] > 1) throw new Error(`${name} must be between 0 and 1`);
	}
}

function initChaosScript(config) {
	return ({ config }) => {
		const nativeSend = WebSocket.prototype.send;
		const randomDelay = () => {
			const jitter = config.reorderRate > Math.random() ? config.latencyMs * 4 : 0;
			return config.latencyMs + Math.floor(Math.random() * Math.max(1, config.latencyMs)) + jitter;
		};
		const delayedSend = (socket, payload) => {
			window.setTimeout(() => {
				try {
					if (socket.readyState === WebSocket.OPEN) nativeSend.call(socket, payload);
				} catch { /* the socket may have closed during the injected delay */ }
			}, randomDelay());
		};
		WebSocket.prototype.send = function chaosSend(payload) {
			if (config.dropRate > Math.random()) return;
			delayedSend(this, payload);
			if (config.duplicateRate > Math.random()) delayedSend(this, payload);
		};
		if (config.failWebRTC && typeof RTCPeerConnection !== 'undefined') {
			const nativeCreateDataChannel = RTCPeerConnection.prototype.createDataChannel;
			let failed = false;
			RTCPeerConnection.prototype.createDataChannel = function chaosCreateDataChannel(...args) {
				if (!failed) {
					failed = true;
					throw new Error('P2P chaos: injected WebRTC failure');
				}
				return nativeCreateDataChannel.apply(this, args);
			};
		}
		window.__RAGNAROK_P2P_CHAOS__ = {
			latencyMs: config.latencyMs,
			dropRate: config.dropRate,
			duplicateRate: config.duplicateRate,
			reorderRate: config.reorderRate,
			webrtcFailure: Boolean(config.failWebRTC),
		};
	};
}

async function waitForText(page, pattern, timeoutMs) {
	if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return false;
	try {
		await page.waitForFunction(
			value => new RegExp(value, 'i').test(document.body?.innerText ?? ''),
			pattern,
			{ timeout: timeoutMs },
		);
		return true;
	} catch {
		return false;
	}
}

async function run() {
	const parsed = parseArgs(process.argv.slice(2));
	if (parsed.help) { usage(); return 0; }
	validateOptions(parsed.options);

	let playwright;
	try {
		playwright = await import(process.env.P2P_CHAOS_PLAYWRIGHT_MODULE ?? 'playwright');
	} catch {
		console.error(JSON.stringify({
			status: 'BROWSER_GATE_BLOCKED',
			reason: 'The repository does not bundle Playwright. Install it in the release runner before executing this gate.',
			install: 'pnpm add -D playwright && pnpm exec playwright install chromium',
		}, null, 2));
		return 2;
	}

	const options = parsed.options;
	const profileA = options.profileA ?? await mkdtemp(join(tmpdir(), 'ragnarok-p2p-a-'));
	const profileB = options.profileB ?? await mkdtemp(join(tmpdir(), 'ragnarok-p2p-b-'));
	const outputPath = options.out ?? resolve('artifacts/p2p-chaos-evidence.json');
	const startedAt = new Date().toISOString();
	const events = [];
	const pageErrors = [];
	const browserConfig = {
		latencyMs: options.latencyMs,
		dropRate: options.dropRate,
		duplicateRate: options.duplicateRate,
		reorderRate: options.reorderRate,
		failWebRTC: true,
	};
	const contexts = [];

	const attachDiagnostics = (page, label) => {
		page.on('console', message => events.push({ at: Date.now(), profile: label, kind: `console:${message.type()}`, text: message.text() }));
		page.on('pageerror', error => pageErrors.push({ at: Date.now(), profile: label, error: String(error) }));
	};

	try {
		const browserType = playwright.chromium;
		if (!browserType) throw new Error('Playwright chromium browser type is unavailable');
		const [contextA, contextB] = await Promise.all([
			browserType.launchPersistentContext(profileA, { headless: !options.headed }),
			browserType.launchPersistentContext(profileB, { headless: !options.headed }),
		]);
		contexts.push(contextA, contextB);
		const pageA = await contextA.newPage();
		const pageB = await contextB.newPage();
		attachDiagnostics(pageA, 'A');
		attachDiagnostics(pageB, 'B');
		await Promise.all([
			contextA.addInitScript(initChaosScript(browserConfig), { config: browserConfig }),
			contextB.addInitScript(initChaosScript(browserConfig), { config: browserConfig }),
		]);
		await Promise.all([
			pageA.goto(options.url, { waitUntil: 'domcontentloaded', timeout: 30_000 }),
			pageB.goto(options.url, { waitUntil: 'domcontentloaded', timeout: 30_000 }),
		]);
		events.push({ at: Date.now(), kind: 'pages_loaded', url: options.url });
		const deadlineAt = Date.now() + options.maxRuntimeMs;

		if (options.click) {
			const findButton = page => page.getByRole('button', { name: /find opponent/i });
			await Promise.all([
				findButton(pageA).click({ timeout: 30_000 }),
				findButton(pageB).click({ timeout: 30_000 }),
			]);
			events.push({ at: Date.now(), kind: 'quick_match_clicked', profiles: ['A', 'B'] });
		}

		await new Promise(resolveDelay => setTimeout(resolveDelay, options.chaosAfterMs));
		await contextA.setOffline(true);
		events.push({ at: Date.now(), kind: 'network_offline', profile: 'A' });
		await new Promise(resolveDelay => setTimeout(resolveDelay, Math.min(8_000, options.chaosAfterMs)));
		await contextA.setOffline(false);
		events.push({ at: Date.now(), kind: 'network_online', profile: 'A' });
		const backgroundTab = await contextA.newPage();
		await backgroundTab.goto('about:blank');
		await backgroundTab.bringToFront();
		events.push({ at: Date.now(), kind: 'tab_background', profile: 'A' });
		await new Promise(resolveDelay => setTimeout(resolveDelay, 1_000));
		await pageA.bringToFront();
		await backgroundTab.close();
		events.push({ at: Date.now(), kind: 'tab_foreground', profile: 'A' });

		const [battleA, battleB] = await Promise.all([
			waitForText(pageA, options.battleText, Math.max(0, deadlineAt - Date.now())),
			waitForText(pageB, options.battleText, Math.max(0, deadlineAt - Date.now())),
		]);
		const [terminalA, terminalB] = battleA && battleB
			? await Promise.all([
				waitForText(pageA, options.terminalText, Math.max(0, deadlineAt - Date.now())),
				waitForText(pageB, options.terminalText, Math.max(0, deadlineAt - Date.now())),
			])
			: [false, false];
		const evidence = {
			status: battleA && battleB && terminalA && terminalB && pageErrors.length === 0 ? 'PASS' : 'FAIL',
			startedAt,
			finishedAt: new Date().toISOString(),
			url: options.url,
			profiles: { A: profileA, B: profileB },
			chaos: browserConfig,
			markers: { battleA, battleB, terminalA, terminalB },
			pageErrors,
			events,
		};
		await mkdir(dirname(outputPath), { recursive: true });
		await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
		console.log(JSON.stringify({ status: evidence.status, output: outputPath, markers: evidence.markers, pageErrors: pageErrors.length }, null, 2));
		return evidence.status === 'PASS' ? 0 : 1;
	} finally {
		await Promise.all(contexts.map(context => context.close().catch(() => undefined)));
	}
}

run().then(code => { process.exitCode = code; }).catch(error => {
	console.error(error instanceof Error ? error.stack : String(error));
	process.exitCode = 1;
});
