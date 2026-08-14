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
 *   - The SVG geometry is 280×400 (7:10 portrait, matches SimpleCard.preview).
 *     The exporter renders at 1.5x so collection/poker cards stay crisp
 *     without forcing every rarity/element variant into large 2x PNGs.
 *
 * How to add a new frame variant:
 *   1. Add a row to RARITY_TOKENS or ELEMENT_TOKENS below.
 *   2. Run `pnpm run build:card-frames`.
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
const DPR = 1.5; // output resolution multiplier

// ── Color tokens (mirror design-tokens.css) ──────────────────────
interface RarityTokens {
	stroke: string;
	bright: string;
	mid: string;
	deep: string;
	dark: string;
	glow: string;
	jewel: string;
}

const RARITY_TOKENS: Record<Rarity, RarityTokens> = {
	common: { stroke: '#aeb7c2', bright: '#f4f7fb', mid: '#7f8a99', deep: '#3b4654', dark: '#111823', glow: '#aeb7c2', jewel: '#d7dde6' },
	rare: { stroke: '#3b82f6', bright: '#bfdbfe', mid: '#2563eb', deep: '#1e3a8a', dark: '#08172f', glow: '#60a5fa', jewel: '#93c5fd' },
	epic: { stroke: '#a855f7', bright: '#e9d5ff', mid: '#7c3aed', deep: '#581c87', dark: '#1b0f2e', glow: '#c084fc', jewel: '#f0abfc' },
	mythic: { stroke: '#f59e0b', bright: '#fef3c7', mid: '#f59e0b', deep: '#b45309', dark: '#231405', glow: '#fbbf24', jewel: '#fde68a' },
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

	const runeYs = [72, 112, 152, 192, 232, 272, 312];
	const sideRunes = runeYs.map((y, index) => {
		const variant = index % 3;
		const rune = variant === 0
			? '<path d="M -5,-11 L 0,11 L 6,-7 M -1,1 L 7,8" />'
			: variant === 1
				? '<path d="M -6,-10 H 5 L -5,0 H 6 L -4,10 H 7" />'
				: '<path d="M -6,-9 L 6,9 M 6,-9 L -6,9 M 0,-12 V 12" />';
		return `
			<g transform="translate(24 ${y})" class="side-rune">${rune}</g>
			<g transform="translate(${FRAME_W - 24} ${y}) scale(-1 1)" class="side-rune">${rune}</g>
		`;
	}).join('');

	const cornerGem = `
		<path d="M 0,-10 L 10,0 L 0,10 L -10,0 Z" fill="url(#gem-${uid})" stroke="${r.bright}" stroke-width="0.9" />
		<path d="M 0,-5 L 5,0 L 0,5 L -5,0 Z" fill="${r.bright}" opacity="0.5" />
	`;

	const cornerCap = `
		<path d="M 0,0 L 36,0 L 46,12 L 34,30 L 10,30 L 0,18 Z" fill="url(#cap-${uid})" stroke="${r.bright}" stroke-width="1" opacity="0.98" />
		<path d="M 8,8 H 30 M 8,15 H 24 M 12,22 H 28" stroke="${e.from}" stroke-width="1.2" stroke-linecap="round" opacity="0.72" />
		<g transform="translate(34 10) scale(0.55)">${cornerGem}</g>
	`;

	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FRAME_W} ${FRAME_H}" width="${FRAME_W}" height="${FRAME_H}">
	<defs>
		<linearGradient id="frame-${uid}" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stop-color="${r.bright}" />
			<stop offset="18%" stop-color="${r.stroke}" />
			<stop offset="48%" stop-color="${r.mid}" />
			<stop offset="100%" stop-color="${r.deep}" />
		</linearGradient>
		<linearGradient id="metal-${uid}" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="${r.bright}" stop-opacity="0.82" />
			<stop offset="16%" stop-color="${r.dark}" stop-opacity="0.96" />
			<stop offset="46%" stop-color="${r.deep}" stop-opacity="0.98" />
			<stop offset="72%" stop-color="${r.mid}" stop-opacity="0.94" />
			<stop offset="100%" stop-color="${r.dark}" stop-opacity="0.98" />
		</linearGradient>
		<linearGradient id="cap-${uid}" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0%" stop-color="${r.dark}" />
			<stop offset="28%" stop-color="${r.deep}" />
			<stop offset="50%" stop-color="${r.mid}" />
			<stop offset="72%" stop-color="${r.deep}" />
			<stop offset="100%" stop-color="${r.dark}" />
		</linearGradient>
		<linearGradient id="accent-${uid}" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stop-color="${e.from}" />
			<stop offset="100%" stop-color="${e.to}" />
		</linearGradient>
		<radialGradient id="gem-${uid}" cx="50%" cy="40%" r="60%">
			<stop offset="0%" stop-color="${r.bright}" stop-opacity="1" />
			<stop offset="34%" stop-color="${r.jewel}" stop-opacity="0.96" />
			<stop offset="55%" stop-color="${e.from}" stop-opacity="0.85" />
			<stop offset="100%" stop-color="${e.to}" stop-opacity="0.62" />
		</radialGradient>
		<filter id="shadow-${uid}" x="-20%" y="-20%" width="140%" height="140%">
			<feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.48" />
			<feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="${r.glow}" flood-opacity="0.38" />
		</filter>
		<style>
			.side-rune { fill: none; stroke: url(#accent-${uid}); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; opacity: 0.78; }
			.facet-line { fill: none; stroke: ${r.bright}; stroke-width: 0.8; stroke-linecap: round; opacity: 0.26; }
		</style>
	</defs>

	<!-- Outer rarity halo and forged metal rail. The center stays transparent. -->
	<rect x="4" y="4" width="${FRAME_W - 8}" height="${FRAME_H - 8}" rx="21" ry="21"
		fill="none" stroke="${r.glow}" stroke-width="18" opacity="0.18" />
	<rect x="10" y="10" width="${FRAME_W - 20}" height="${FRAME_H - 20}" rx="18" ry="18"
		fill="none" stroke="url(#metal-${uid})" stroke-width="16" filter="url(#shadow-${uid})" />
	<rect x="18" y="18" width="${FRAME_W - 36}" height="${FRAME_H - 36}" rx="13" ry="13"
		fill="none" stroke="url(#frame-${uid})" stroke-width="3.5" opacity="0.96" />
	<rect x="27" y="31" width="${FRAME_W - 54}" height="${FRAME_H - 62}" rx="9" ry="9"
		fill="none" stroke="${r.bright}" stroke-width="1" opacity="0.45" />

	<!-- Side runic rails. -->
	<path d="M 15,56 L 34,35 L 34,365 L 15,344 Z" fill="url(#cap-${uid})" stroke="${r.bright}" stroke-width="1" opacity="0.92" />
	<path d="M ${FRAME_W - 15},56 L ${FRAME_W - 34},35 L ${FRAME_W - 34},365 L ${FRAME_W - 15},344 Z" fill="url(#cap-${uid})" stroke="${r.bright}" stroke-width="1" opacity="0.92" />
	${sideRunes}

	<!-- Top crest and bottom name-rail anchor. -->
	<path d="M 54,8 H 226 L 244,24 L 226,40 H 54 L 36,24 Z" fill="url(#cap-${uid})" stroke="${r.bright}" stroke-width="1.2" filter="url(#shadow-${uid})" />
	<path d="M 82,365 H 198 L 214,380 L 198,392 H 82 L 66,380 Z" fill="url(#cap-${uid})" stroke="${r.bright}" stroke-width="1.1" opacity="0.98" />
	<path d="M 76,24 H 116 M 164,24 H 204 M 98,380 H 130 M 150,380 H 182" stroke="url(#accent-${uid})" stroke-width="2" stroke-linecap="round" opacity="0.82" />

	<!-- Corner caps. -->
	<g transform="translate(8 12)">${cornerCap}</g>
	<g transform="translate(${FRAME_W - 8} 12) scale(-1 1)">${cornerCap}</g>
	<g transform="translate(8 ${FRAME_H - 12}) scale(1 -1)">${cornerCap}</g>
	<g transform="translate(${FRAME_W - 8} ${FRAME_H - 12}) scale(-1 -1)">${cornerCap}</g>

	<!-- Center gems. -->
	<g transform="translate(${FRAME_W / 2} 24)">${cornerGem}</g>
	<g transform="translate(${FRAME_W / 2} 380) scale(0.72)">${cornerGem}</g>

	<!-- Faceted cracks/highlights for painted-metal texture. -->
	<g class="facet-line">
		<path d="M 44,18 L 58,30 L 76,16" />
		<path d="M 206,16 L 224,31 L 237,18" />
		<path d="M 18,92 L 31,108 L 20,124" />
		<path d="M 260,116 L 247,137 L 263,155" />
		<path d="M 18,278 L 33,294 L 20,318" />
		<path d="M 260,282 L 245,304 L 262,326" />
		<path d="M 44,382 L 64,366 L 84,384" />
		<path d="M 196,384 L 218,366 L 238,382" />
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

/**
 * Elements excluded from the render loop. Ice is skipped because no
 * current card has element "ice" (NORSE_TO_GLE maps it to "water" as
 * a variant) and the dev CardLab falls back to SVG-only on 404.
 * Remove an entry to re-enable rendering for that element.
 */
const SKIP_ELEMENTS: readonly NorseElement[] = ['ice'];

function main() {
	const startedAt = Date.now();
	console.log(`[exportCardFrames] out: ${OUT_DIR}`);
	console.log(`[exportCardFrames] dpr: ${DPR} → ${FRAME_W * DPR}×${FRAME_H * DPR}`);
	console.log(`[exportCardFrames] skip: ${SKIP_ELEMENTS.join(', ') || '(none)'}`);

	clearStale();

	let totalBytes = 0;
	let count = 0;
	for (const rarity of RARITIES) {
		for (const element of NORSE_ELEMENTS) {
			if (SKIP_ELEMENTS.includes(element)) continue;
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
