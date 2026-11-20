/**
 * pixiTextures.ts
 *
 * Unified GPU Texture Atlas generator for PixiJS v8 2D VFX.
 *
 * Optimization highlights:
 * - Packs all 10 procedural sprite textures into ONE 512x512 GPU TextureSource
 *   with 2px gutters, enabling single-draw-call PixiJS sprite batching across
 *   particles, sparks, rings, smoke, diamonds, starbursts, slashes, and halos.
 * - Bakes `ribbonAura` and `ribbonCore` (standalone UVs required by MeshRope)
 *   via direct single-pass `ImageData` pixel writes instead of 512 per-column
 *   `CanvasGradient` allocations.
 * - Cleanly destroys sub-textures + single atlas source on unmount.
 */

import { Assets, CanvasSource, Rectangle, Texture } from 'pixi.js';
import {
	computeGaussianKernel1D,
	convolve1D,
} from '../../combat/vfx/emotionalAtmosphere';

export interface CachedTextures {
	/** Shared 512x512 backing atlas source (destroyed once on unmount). */
	atlasSource: CanvasSource;
	softGlow: Texture;
	spark: Texture;
	ring: Texture;
	smoke: Texture;
	runeSigil: Texture;
	spectralClaw: Texture;
	arenaVignette: Texture;
	ribbonAura: Texture;
	ribbonCore: Texture;
	slashArc: Texture;
	starburst: Texture;
	diamond: Texture;
	atmosphereHalo: Texture;
}

export const NORSE_VFX_ART_URLS = {
	runeSigil: '/assets/vfx/rune_sigil_norse.webp?v=2',
	spectralClaw: '/assets/vfx/spectral_claw_norse.webp?v=2',
	slashArc: '/assets/vfx/runic_slash_norse.webp?v=2',
} as const;

const ATLAS_SIZE = 512;

interface AtlasRegion {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
}

/**
 * Packed 512x512 atlas layout with >= 2px padding between all regions
 * to guarantee zero UV bleeding under linear filtering.
 */
const ATLAS_REGIONS = {
	atmosphereHalo: { x: 2, y: 2, w: 320, h: 180 },
	ring:           { x: 326, y: 2, w: 128, h: 128 },
	diamond:        { x: 458, y: 2, w: 32, h: 32 },
	softGlow:       { x: 326, y: 134, w: 64, h: 64 },
	smoke:          { x: 394, y: 134, w: 64, h: 64 },
	runeSigil:      { x: 2, y: 186, w: 128, h: 128 },
	arenaVignette:  { x: 134, y: 186, w: 128, h: 128 },
	starburst:      { x: 266, y: 186, w: 128, h: 128 },
	spark:          { x: 398, y: 202, w: 64, h: 16 },
	slashArc:       { x: 2, y: 320, w: 256, h: 64 },
} as const satisfies Record<string, AtlasRegion>;

function drawInAtlasRegion(
	ctx: CanvasRenderingContext2D,
	region: AtlasRegion,
	draw: (ctx: CanvasRenderingContext2D) => void,
): void {
	ctx.save();
	ctx.beginPath();
	ctx.rect(region.x, region.y, region.w, region.h);
	ctx.clip();
	ctx.translate(region.x, region.y);
	draw(ctx);
	ctx.restore();
}

function subTexture(source: CanvasSource, region: AtlasRegion): Texture {
	return new Texture({
		source,
		frame: new Rectangle(region.x, region.y, region.w, region.h),
	});
}

/**
 * Direct ImageData ribbon baker — replaces 256 per-column `createLinearGradient()`
 * allocations with a single flat Uint8ClampedArray pass.
 */
function bakeRibbonTexture(
	width: number,
	height: number,
	computeEnvelope: (u: number) => number,
	computeAlpha: (vNorm: number, envelope: number) => number,
): Texture {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (ctx) {
		const imageData = ctx.createImageData(width, height);
		const data = imageData.data;
		const halfH = height * 0.5;
		const invW = 1 / Math.max(1, width - 1);

		for (let x = 0; x < width; x += 1) {
			const u = x * invW;
			const envelope = computeEnvelope(u);
			const activeHalfH = Math.max(1.2, (halfH - 1.5) * envelope);
			for (let y = 0; y < height; y += 1) {
				const dist = Math.abs(y + 0.5 - halfH);
				if (dist > activeHalfH) continue;
				const vNorm = dist / activeHalfH; // 0 at center, 1 at edge
				const alpha = Math.max(0, Math.min(1, computeAlpha(vNorm, envelope)));
				if (alpha <= 0.002) continue;
				const idx = (y * width + x) * 4;
				data[idx] = 255;
				data[idx + 1] = 255;
				data[idx + 2] = 255;
				data[idx + 3] = Math.round(alpha * 255);
			}
		}
		ctx.putImageData(imageData, 0, 0);
	}
	return Texture.from(canvas);
}

export function createCachedTextures(): CachedTextures {
	const atlasCanvas = document.createElement('canvas');
	atlasCanvas.width = ATLAS_SIZE;
	atlasCanvas.height = ATLAS_SIZE;
	const ctx = atlasCanvas.getContext('2d');

	if (ctx) {
		drawInAtlasRegion(ctx, ATLAS_REGIONS.softGlow, (c) => {
			const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
			g.addColorStop(0, 'rgba(255,255,255,1)');
			g.addColorStop(0.28, 'rgba(255,255,255,0.82)');
			g.addColorStop(0.62, 'rgba(255,255,255,0.22)');
			g.addColorStop(1, 'rgba(255,255,255,0)');
			c.fillStyle = g;
			c.fillRect(0, 0, 64, 64);
		});

		drawInAtlasRegion(ctx, ATLAS_REGIONS.spark, (c) => {
			const g = c.createRadialGradient(32, 8, 0, 32, 8, 30);
			g.addColorStop(0, 'rgba(255,255,255,1)');
			g.addColorStop(0.4, 'rgba(255,255,255,0.75)');
			g.addColorStop(1, 'rgba(255,255,255,0)');
			c.fillStyle = g;
			c.beginPath();
			c.moveTo(0, 8);
			c.quadraticCurveTo(32, 0, 64, 8);
			c.quadraticCurveTo(32, 16, 0, 8);
			c.closePath();
			c.fill();
		});

		drawInAtlasRegion(ctx, ATLAS_REGIONS.ring, (c) => {
			const outer = c.createRadialGradient(64, 64, 34, 64, 64, 62);
			outer.addColorStop(0, 'rgba(255,255,255,0)');
			outer.addColorStop(0.55, 'rgba(255,255,255,0.25)');
			outer.addColorStop(0.76, 'rgba(255,255,255,0.95)');
			outer.addColorStop(0.88, 'rgba(255,255,255,0.4)');
			outer.addColorStop(1, 'rgba(255,255,255,0)');
			c.fillStyle = outer;
			c.fillRect(0, 0, 128, 128);
		});

		drawInAtlasRegion(ctx, ATLAS_REGIONS.smoke, (c) => {
			const g = c.createRadialGradient(32, 32, 2, 32, 32, 30);
			g.addColorStop(0, 'rgba(220,226,236,0.58)');
			g.addColorStop(0.5, 'rgba(180,190,206,0.28)');
			g.addColorStop(1, 'rgba(140,152,170,0)');
			c.fillStyle = g;
			c.fillRect(0, 0, 64, 64);
		});

		drawInAtlasRegion(ctx, ATLAS_REGIONS.runeSigil, (c) => {
			c.translate(64, 64);
			c.strokeStyle = 'rgba(255,255,255,0.9)';
			c.lineWidth = 2.5;
			c.beginPath();
			c.arc(0, 0, 52, 0, Math.PI * 2);
			c.stroke();

			c.strokeStyle = 'rgba(255,255,255,0.6)';
			c.lineWidth = 1.6;
			c.beginPath();
			c.arc(0, 0, 38, 0, Math.PI * 2);
			c.stroke();

			c.strokeStyle = 'rgba(255,255,255,0.85)';
			c.lineWidth = 2;
			c.beginPath();
			for (let i = 0; i < 8; i += 1) {
				const angle = (Math.PI / 4) * i;
				const r = i % 2 === 0 ? 52 : 34;
				const x = Math.cos(angle) * r;
				const y = Math.sin(angle) * r;
				if (i === 0) c.moveTo(x, y);
				else c.lineTo(x, y);
			}
			c.closePath();
			c.stroke();
		});

		drawInAtlasRegion(ctx, ATLAS_REGIONS.arenaVignette, (c) => {
			const g = c.createRadialGradient(64, 64, 10, 64, 64, 64);
			g.addColorStop(0, 'rgba(255,255,255,0.95)');
			g.addColorStop(0.55, 'rgba(255,255,255,0.38)');
			g.addColorStop(1, 'rgba(255,255,255,0)');
			c.fillStyle = g;
			c.fillRect(0, 0, 128, 128);
		});

		drawInAtlasRegion(ctx, ATLAS_REGIONS.slashArc, (c) => {
			c.beginPath();
			c.moveTo(8, 42);
			c.quadraticCurveTo(128, 4, 248, 42);
			c.quadraticCurveTo(128, 22, 8, 42);
			c.closePath();
			const g = c.createLinearGradient(8, 32, 248, 32);
			g.addColorStop(0, 'rgba(255,255,255,0)');
			g.addColorStop(0.22, 'rgba(255,255,255,0.75)');
			g.addColorStop(0.55, 'rgba(255,255,255,1)');
			g.addColorStop(0.82, 'rgba(255,255,255,0.72)');
			g.addColorStop(1, 'rgba(255,255,255,0)');
			c.shadowColor = 'rgba(255,255,255,0.9)';
			c.shadowBlur = 10;
			c.fillStyle = g;
			c.fill();
		});

		drawInAtlasRegion(ctx, ATLAS_REGIONS.starburst, (c) => {
			const core = c.createRadialGradient(64, 64, 0, 64, 64, 34);
			core.addColorStop(0, 'rgba(255,255,255,1)');
			core.addColorStop(0.35, 'rgba(255,255,255,0.72)');
			core.addColorStop(1, 'rgba(255,255,255,0)');
			c.fillStyle = core;
			c.fillRect(0, 0, 128, 128);

			const drawSpike = (rx: number, ry: number) => {
				c.save();
				c.translate(64, 64);
				const g = c.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
				g.addColorStop(0, 'rgba(255,255,255,0.98)');
				g.addColorStop(0.45, 'rgba(255,255,255,0.48)');
				g.addColorStop(1, 'rgba(255,255,255,0)');
				c.fillStyle = g;
				c.beginPath();
				c.moveTo(-rx, 0);
				c.quadraticCurveTo(0, -ry, rx, 0);
				c.quadraticCurveTo(0, ry, -rx, 0);
				c.closePath();
				c.fill();
				c.restore();
			};
			drawSpike(62, 6);
			drawSpike(6, 62);
		});

		drawInAtlasRegion(ctx, ATLAS_REGIONS.diamond, (c) => {
			c.translate(16, 16);
			c.beginPath();
			c.moveTo(0, -14);
			c.lineTo(7, 0);
			c.lineTo(0, 14);
			c.lineTo(-7, 0);
			c.closePath();
			const g = c.createRadialGradient(0, 0, 1, 0, 0, 14);
			g.addColorStop(0, 'rgba(255,255,255,1)');
			g.addColorStop(0.6, 'rgba(255,255,255,0.85)');
			g.addColorStop(1, 'rgba(255,255,255,0)');
			c.fillStyle = g;
			c.fill();
		});

		// Aspect-matched 16:9 Gaussian-convolved edge vignette (clear central 72%)
		drawInAtlasRegion(ctx, ATLAS_REGIONS.atmosphereHalo, (c) => {
			const rawProfile = new Array<number>(64);
			for (let i = 0; i < 64; i += 1) {
				const r = i / 63;
				rawProfile[i] = r < 0.7 ? 0 : Math.pow((r - 0.7) / 0.3, 1.9);
			}
			const kernel = computeGaussianKernel1D(3.0, 8);
			const smoothProfile = convolve1D(rawProfile, kernel);
			c.translate(160, 90);
			c.scale(160 / 90, 1);
			const g = c.createRadialGradient(0, 0, 0, 0, 0, 108);
			for (let i = 0; i < 64; i += 4) {
				const stop = i / 63;
				const a = Math.min(0.55, Math.max(0, smoothProfile[i] * 0.6));
				g.addColorStop(stop, `rgba(255,255,255,${a.toFixed(3)})`);
			}
			g.addColorStop(1, `rgba(255,255,255,${Math.min(0.58, smoothProfile[63] * 0.62).toFixed(3)})`);
			c.fillStyle = g;
			c.fillRect(-160, -108, 320, 216);
		});
	}

	const atlasSource = new CanvasSource({ resource: atlasCanvas });
	const runeSigil = subTexture(atlasSource, ATLAS_REGIONS.runeSigil);

	const ribbonAura = bakeRibbonTexture(
		256,
		56,
		(u) => Math.pow(Math.sin(Math.PI * u), 0.72) * (0.76 + 0.24 * Math.sin(Math.PI * Math.pow(u, 1.35))),
		(vNorm, env) => (1 - vNorm) * (1 - vNorm * 0.45) * 0.76 * env,
	);

	const ribbonCore = bakeRibbonTexture(
		256,
		18,
		(u) => Math.pow(Math.sin(Math.PI * u), 0.85),
		(vNorm, env) => Math.pow(1 - vNorm, 1.45) * 0.98 * env,
	);

	return {
		atlasSource,
		softGlow: subTexture(atlasSource, ATLAS_REGIONS.softGlow),
		spark: subTexture(atlasSource, ATLAS_REGIONS.spark),
		ring: subTexture(atlasSource, ATLAS_REGIONS.ring),
		smoke: subTexture(atlasSource, ATLAS_REGIONS.smoke),
		runeSigil,
		spectralClaw: runeSigil,
		arenaVignette: subTexture(atlasSource, ATLAS_REGIONS.arenaVignette),
		ribbonAura,
		ribbonCore,
		slashArc: subTexture(atlasSource, ATLAS_REGIONS.slashArc),
		starburst: subTexture(atlasSource, ATLAS_REGIONS.starburst),
		diamond: subTexture(atlasSource, ATLAS_REGIONS.diamond),
		atmosphereHalo: subTexture(atlasSource, ATLAS_REGIONS.atmosphereHalo),
	};
}

/**
 * Progressively upgrades procedural textures with high-detail Norse VFX art
 * via PixiJS v8 `Assets.load(...)`. Never blocks frame 0 and falls back
 * silently to procedural textures if any asset is unavailable.
 */
export function loadNorseVfxArtTextures(
	target: CachedTextures,
	isStillMounted: () => boolean,
): void {
	if (typeof window === 'undefined') return;
	const entries = Object.entries(NORSE_VFX_ART_URLS) as Array<[
		keyof typeof NORSE_VFX_ART_URLS,
		string,
	]>;

	for (const [slot, url] of entries) {
		Assets.load<Texture>(url)
			.then((loaded) => {
				if (!isStillMounted() || !loaded) return;
				target[slot] = loaded;
			})
			.catch(() => {
				// Keep procedural fallback cleanly if asset is absent or offline
			});
	}
}

export function destroyCachedTextures(textures: CachedTextures | null): void {
	if (!textures) return;
	const assetTextures = new Set<Texture>();
	for (const url of Object.values(NORSE_VFX_ART_URLS)) {
		const cached = Assets.get<Texture>(url);
		if (cached) assetTextures.add(cached);
	}

	const atlasBacked = new Set<Texture>([
		textures.softGlow,
		textures.spark,
		textures.ring,
		textures.smoke,
		textures.runeSigil,
		textures.spectralClaw,
		textures.arenaVignette,
		textures.slashArc,
		textures.starburst,
		textures.diamond,
		textures.atmosphereHalo,
	]);

	for (const tex of atlasBacked) {
		if (!assetTextures.has(tex)) {
			tex.destroy(false);
		}
	}
	textures.atlasSource.destroy();

	if (!assetTextures.has(textures.ribbonAura)) {
		textures.ribbonAura.destroy(true);
	}
	if (!assetTextures.has(textures.ribbonCore)) {
		textures.ribbonCore.destroy(true);
	}
}
