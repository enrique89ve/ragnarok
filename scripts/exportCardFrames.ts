/**
 * Card frame PNG exporter.
 *
 * Generates one PNG frame per (rarity × element) combo, written to
 * `client/public/art/frames/{rarity}/{element}.png`. The output is
 * a transparent-centered overlay — art is composited on top by the
 * FrameStatic component, not baked into the PNG.
 *
 * Why a build script and not runtime SVG:
 *   - League-style static frames want the painterly filigree, glow
 *     halos, and gem clusters to be GPU-rendered once and cached as
 *     image. Inlining 32 large SVGs in the bundle would bloat the
 *     client and re-paint on every render.
 *   - The PNG is 280×400 (5:7 portrait, matches SimpleCard.preview).
 *     At 1x DPR the file is ~25-60 KB; at 2x (set DPR=2 below)
 *     it stays under 100 KB.
 *
 * How to add a new frame variant:
 *   1. Add a row to RARITY_TOKENS or ELEMENT_TOKENS below.
 *   2. Run `npm run build:card-frames`.
 *   3. The lab's `static-png` direction picks it up automatically
 *      via `framePathFor(rarity, element)` in
 *      `client/src/game/utils/art/frameArt.ts`.
 *
 * Re-render all 32 every run — this is a dev artifact, not a CDN.
 * If you need to skip one (e.g. element not yet supported), add it
 * to SKIP below.
 */

import { mkdirSync, writeFileSync, readdirSync, statSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import type { Rarity } from '../shared/schemas/rarity';
import { NORSE_ELEMENTS, type NorseElement } from '../client/src/game/types/NorseTypes';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'client', 'public', 'art', 'frames');

const FRAME_W = 280;
const FRAME_H = 400;
const DPR = 2; // output resolution multiplier

// ── Color tokens (mirror design-tokens.css) ──────────────────────
interface RarityTokens {
	stroke: string;
	bright: string;
	deep: string;
	glow: string;
}

const RARITY_TOKENS: Record<Rarity, RarityTokens> = {
	common: { stroke: '#9ca3af', bright: '#f1f5f9', deep: '#4a5568', glow: '#9ca3af' },
	rare: { stroke: '#3b82f6', bright: '#93c5fd', deep: '#1e3a8a', glow: '#3b82f6' },
	epic: { stroke: '#a855f7', bright: '#c084fc', deep: '#581c87', glow: '#a855f7' },
	mythic: { stroke: '#f59e0b', bright: '#fcd34d', deep: '#d97706', glow: '#f59e0b' },
};

interface ElementTokens {
	from: string;
	to: string;
}

const ELEMENT_TOKENS: Record<NorseElement, ElementTokens> = {
	fire: { from: '#ff7a30', to: '#c43a16' },
	water: { from: '#4aa8ff', to: '#1c4f8a' },
	grass: { from: '#7cc16c', to: '#2f5a23' },
	electric: { from: '#f6e356', to: '#7a5b12' },
	light: { from: '#ffe27a', to: '#a07c12' },
	dark: { from: '#a06bff', to: '#3a1a6a' },
	ice: { from: '#9bd6e8', to: '#3a6f8a' },
	neutral: { from: '#b0b4be', to: '#5a5e6a' },
};

// ── SVG template ────────────────────────────────────────────────
function buildSvg(rarity: Rarity, element: NorseElement): string {
	const r = RARITY_TOKENS[rarity];
	const e = ELEMENT_TOKENS[element];
	const uid = `${rarity}-${element}`;

	// Helper: a single top-left corner curl. Mirrored to the other 3
	// corners via SVG transforms.
	const corner = `
		<g fill="none" stroke="url(#accent-${uid})" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.95">
			<path d="M 2,22 C 2,8 8,2 22,2" />
			<path d="M 2,32 C 12,32 18,28 22,22" />
			<path d="M 2,42 C 22,42 32,34 36,22" />
			<path d="M 2,52 C 32,52 44,42 48,32" opacity="0.6" />
		</g>
		<g fill="${e.from}" opacity="0.85">
			<circle cx="22" cy="2" r="2.4" />
			<circle cx="2" cy="22" r="2.4" />
		</g>
	`;

	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FRAME_W} ${FRAME_H}" width="${FRAME_W}" height="${FRAME_H}">
	<defs>
		<linearGradient id="stroke-${uid}" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stop-color="${r.bright}" />
			<stop offset="55%" stop-color="${r.stroke}" />
			<stop offset="100%" stop-color="${r.deep}" />
		</linearGradient>
		<linearGradient id="accent-${uid}" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stop-color="${e.from}" />
			<stop offset="100%" stop-color="${e.to}" />
		</linearGradient>
		<radialGradient id="gem-${uid}" cx="50%" cy="40%" r="60%">
			<stop offset="0%" stop-color="${r.bright}" stop-opacity="0.95" />
			<stop offset="55%" stop-color="${e.from}" stop-opacity="0.85" />
			<stop offset="100%" stop-color="${e.to}" stop-opacity="0.5" />
		</radialGradient>
		<radialGradient id="halo-${uid}" cx="50%" cy="50%" r="55%">
			<stop offset="60%" stop-color="${r.stroke}" stop-opacity="0" />
			<stop offset="100%" stop-color="${r.stroke}" stop-opacity="0.55" />
		</radialGradient>
	</defs>

	<!-- Outer halo (no fill on the frame itself; stroke acts as band) -->
	<rect x="0" y="0" width="${FRAME_W}" height="${FRAME_H}" rx="20" ry="20"
		fill="none" stroke="${r.stroke}" stroke-width="36" opacity="0.10" />
	<rect x="0" y="0" width="${FRAME_W}" height="${FRAME_H}" rx="18" ry="18"
		fill="none" stroke="${r.stroke}" stroke-width="24" opacity="0.18" />

	<!-- Main band -->
	<rect x="6" y="6" width="${FRAME_W - 12}" height="${FRAME_H - 12}" rx="14" ry="14"
		fill="none" stroke="url(#stroke-${uid})" stroke-width="6" />

	<!-- Inner accent hairline -->
	<rect x="14" y="14" width="${FRAME_W - 28}" height="${FRAME_H - 28}" rx="10" ry="10"
		fill="none" stroke="${r.bright}" stroke-width="1" opacity="0.5" />

	<!-- Corner ornaments (4) -->
	<g transform="translate(14, 14)">${corner}</g>
	<g transform="translate(${FRAME_W - 14}, 14) scale(-1, 1)">${corner}</g>
	<g transform="translate(14, ${FRAME_H - 14}) scale(1, -1)">${corner}</g>
	<g transform="translate(${FRAME_W - 14}, ${FRAME_H - 14}) scale(-1, -1)">${corner}</g>

	<!-- Top-center gem cluster -->
	<g transform="translate(${FRAME_W / 2}, 14)">
		<!-- Wings -->
		<path d="M -32,5 L -10,5 L -16,0 L -10,-5 L -32,-5 Z"
			fill="url(#accent-${uid})" stroke="${r.bright}" stroke-width="0.6" opacity="0.95" />
		<path d="M 32,5 L 10,5 L 16,0 L 10,-5 L 32,-5 Z"
			fill="url(#accent-${uid})" stroke="${r.bright}" stroke-width="0.6" opacity="0.95" />
		<!-- Wing tips -->
		<circle cx="-36" cy="0" r="2" fill="url(#accent-${uid})" />
		<circle cx="36" cy="0" r="2" fill="url(#accent-${uid})" />
		<!-- Center diamond gem -->
		<path d="M 0,-9 L 9,0 L 0,9 L -9,0 Z" fill="url(#gem-${uid})" stroke="${r.bright}" stroke-width="0.8" />
		<path d="M 0,-5 L 5,0 L 0,5 L -5,0 Z" fill="${r.bright}" opacity="0.55" />
	</g>

	<!-- Bottom-center gem (smaller) -->
	<g transform="translate(${FRAME_W / 2}, ${FRAME_H - 14})">
		<path d="M -18,3 L -6,3 L -9,0 L -6,-3 L -18,-3 Z"
			fill="url(#accent-${uid})" stroke="${r.bright}" stroke-width="0.4" opacity="0.85" />
		<path d="M 18,3 L 6,3 L 9,0 L 6,-3 L 18,-3 Z"
			fill="url(#accent-${uid})" stroke="${r.bright}" stroke-width="0.4" opacity="0.85" />
		<path d="M 0,-6 L 6,0 L 0,6 L -6,0 Z" fill="url(#gem-${uid})" stroke="${r.bright}" stroke-width="0.6" />
		<path d="M 0,-3 L 3,0 L 0,3 L -3,0 Z" fill="${r.bright}" opacity="0.55" />
	</g>
</svg>`;
}

// ── Render + write ──────────────────────────────────────────────
function renderToPng(svg: string): Uint8Array {
	const resvg = new Resvg(svg, {
		fitTo: { mode: 'width', value: FRAME_W * DPR },
		background: 'rgba(0, 0, 0, 0)', // transparent center
		font: { loadSystemFonts: true },
	});
	const rendered = resvg.render();
	return rendered.asPng();
}

function writeFrame(rarity: Rarity, element: NorseElement): { path: string; bytes: number } {
	const svg = buildSvg(rarity, element);
	const png = renderToPng(svg);
	const dir = join(OUT_DIR, rarity);
	mkdirSync(dir, { recursive: true });
	const file = join(dir, `${element}.png`);
	writeFileSync(file, png);
	return { path: file, bytes: png.byteLength };
}

function clearStale() {
	if (!existsSync(OUT_DIR)) return;
	for (const rarity of readdirSync(OUT_DIR)) {
		const p = join(OUT_DIR, rarity);
		if (!statSync(p).isDirectory()) continue;
		for (const f of readdirSync(p)) {
			unlinkSync(join(p, f));
		}
	}
}

// ── Main ────────────────────────────────────────────────────────
const RARITIES: readonly Rarity[] = ['common', 'rare', 'epic', 'mythic'];

function main() {
	const startedAt = Date.now();
	console.log(`[exportCardFrames] out: ${OUT_DIR}`);
	console.log(`[exportCardFrames] dpr: ${DPR} → ${FRAME_W * DPR}×${FRAME_H * DPR}`);

	clearStale();

	let totalBytes = 0;
	let count = 0;
	for (const rarity of RARITIES) {
		for (const element of NORSE_ELEMENTS) {
			const { bytes } = writeFrame(rarity, element);
			totalBytes += bytes;
			count++;
			console.log(`  ${rarity}/${element}.png  ${(bytes / 1024).toFixed(1)} KB`);
		}
	}

	const elapsed = Date.now() - startedAt;
	const totalKB = (totalBytes / 1024).toFixed(0);
	console.log(
		`[exportCardFrames] done: ${count} frames, ${totalKB} KB total, ${elapsed} ms`,
	);
}

main();
