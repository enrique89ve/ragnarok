/**
 * pixiTextures.ts
 *
 * Procedural GPU texture atlas generator for PixiJS v8 2D VFX.
 * Baked once per Application mount and destroyed cleanly on unmount —
 * zero network latency, zero `new Graphics()` per frame.
 */

import { Assets, Texture } from 'pixi.js';
import {
	computeGaussianKernel1D,
	convolve1D,
} from '../../combat/vfx/emotionalAtmosphere';

export interface CachedTextures {
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

function makeCanvasTexture(
	sizeW: number,
	sizeH: number,
	draw: (ctx: CanvasRenderingContext2D) => void,
): Texture {
	const canvas = document.createElement('canvas');
	canvas.width = sizeW;
	canvas.height = sizeH;
	const ctx = canvas.getContext('2d');
	if (ctx) draw(ctx);
	return Texture.from(canvas);
}

export function createCachedTextures(): CachedTextures {
	const softGlow = makeCanvasTexture(64, 64, (ctx) => {
		const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
		g.addColorStop(0, 'rgba(255,255,255,1)');
		g.addColorStop(0.28, 'rgba(255,255,255,0.82)');
		g.addColorStop(0.62, 'rgba(255,255,255,0.22)');
		g.addColorStop(1, 'rgba(255,255,255,0)');
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, 64, 64);
	});

	const spark = makeCanvasTexture(64, 16, (ctx) => {
		const g = ctx.createRadialGradient(32, 8, 0, 32, 8, 30);
		g.addColorStop(0, 'rgba(255,255,255,1)');
		g.addColorStop(0.4, 'rgba(255,255,255,0.75)');
		g.addColorStop(1, 'rgba(255,255,255,0)');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.moveTo(0, 8);
		ctx.quadraticCurveTo(32, 0, 64, 8);
		ctx.quadraticCurveTo(32, 16, 0, 8);
		ctx.closePath();
		ctx.fill();
	});

	const ring = makeCanvasTexture(128, 128, (ctx) => {
		const outer = ctx.createRadialGradient(64, 64, 34, 64, 64, 62);
		outer.addColorStop(0, 'rgba(255,255,255,0)');
		outer.addColorStop(0.55, 'rgba(255,255,255,0.25)');
		outer.addColorStop(0.76, 'rgba(255,255,255,0.95)');
		outer.addColorStop(0.88, 'rgba(255,255,255,0.4)');
		outer.addColorStop(1, 'rgba(255,255,255,0)');
		ctx.fillStyle = outer;
		ctx.fillRect(0, 0, 128, 128);
	});

	const smoke = makeCanvasTexture(64, 64, (ctx) => {
		const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
		g.addColorStop(0, 'rgba(220,226,236,0.58)');
		g.addColorStop(0.5, 'rgba(180,190,206,0.28)');
		g.addColorStop(1, 'rgba(140,152,170,0)');
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, 64, 64);
	});

	const runeSigil = makeCanvasTexture(128, 128, (ctx) => {
		ctx.translate(64, 64);
		ctx.strokeStyle = 'rgba(255,255,255,0.9)';
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.arc(0, 0, 52, 0, Math.PI * 2);
		ctx.stroke();

		ctx.strokeStyle = 'rgba(255,255,255,0.6)';
		ctx.lineWidth = 1.6;
		ctx.beginPath();
		ctx.arc(0, 0, 38, 0, Math.PI * 2);
		ctx.stroke();

		ctx.strokeStyle = 'rgba(255,255,255,0.85)';
		ctx.lineWidth = 2;
		ctx.beginPath();
		for (let i = 0; i < 8; i += 1) {
			const angle = (Math.PI / 4) * i;
			const r = i % 2 === 0 ? 52 : 34;
			const x = Math.cos(angle) * r;
			const y = Math.sin(angle) * r;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.closePath();
		ctx.stroke();
	});

	const arenaVignette = makeCanvasTexture(128, 128, (ctx) => {
		const g = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
		g.addColorStop(0, 'rgba(255,255,255,0.95)');
		g.addColorStop(0.55, 'rgba(255,255,255,0.38)');
		g.addColorStop(1, 'rgba(255,255,255,0)');
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, 128, 128);
	});

	const ribbonAura = makeCanvasTexture(256, 56, (ctx) => {
		for (let x = 0; x < 256; x += 1) {
			const u = x / 255;
			const envelope = Math.pow(Math.sin(Math.PI * u), 0.72)
				* (0.76 + 0.24 * Math.sin(Math.PI * Math.pow(u, 1.35)));
			const halfH = Math.max(1.5, 26 * envelope);
			const cy = 28;
			const g = ctx.createLinearGradient(x, cy - halfH, x, cy + halfH);
			const peak = 0.76 * envelope;
			const mid = 0.34 * envelope;
			g.addColorStop(0, 'rgba(255,255,255,0)');
			g.addColorStop(0.24, `rgba(255,255,255,${mid.toFixed(3)})`);
			g.addColorStop(0.5, `rgba(255,255,255,${peak.toFixed(3)})`);
			g.addColorStop(0.76, `rgba(255,255,255,${mid.toFixed(3)})`);
			g.addColorStop(1, 'rgba(255,255,255,0)');
			ctx.fillStyle = g;
			ctx.fillRect(x, cy - halfH, 1.5, halfH * 2);
		}
	});

	const ribbonCore = makeCanvasTexture(256, 18, (ctx) => {
		for (let x = 0; x < 256; x += 1) {
			const u = x / 255;
			const envelope = Math.pow(Math.sin(Math.PI * u), 0.85);
			const halfH = Math.max(0.8, 7.5 * envelope);
			const cy = 9;
			const g = ctx.createLinearGradient(x, cy - halfH, x, cy + halfH);
			g.addColorStop(0, 'rgba(255,255,255,0)');
			g.addColorStop(0.35, `rgba(255,255,255,${(0.68 * envelope).toFixed(3)})`);
			g.addColorStop(0.5, `rgba(255,255,255,${(0.98 * envelope).toFixed(3)})`);
			g.addColorStop(0.65, `rgba(255,255,255,${(0.68 * envelope).toFixed(3)})`);
			g.addColorStop(1, 'rgba(255,255,255,0)');
			ctx.fillStyle = g;
			ctx.fillRect(x, cy - halfH, 1.5, halfH * 2);
		}
	});

	const slashArc = makeCanvasTexture(256, 64, (ctx) => {
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(8, 42);
		ctx.quadraticCurveTo(128, 4, 248, 42);
		ctx.quadraticCurveTo(128, 22, 8, 42);
		ctx.closePath();
		const g = ctx.createLinearGradient(8, 32, 248, 32);
		g.addColorStop(0, 'rgba(255,255,255,0)');
		g.addColorStop(0.22, 'rgba(255,255,255,0.75)');
		g.addColorStop(0.55, 'rgba(255,255,255,1)');
		g.addColorStop(0.82, 'rgba(255,255,255,0.72)');
		g.addColorStop(1, 'rgba(255,255,255,0)');
		ctx.shadowColor = 'rgba(255,255,255,0.9)';
		ctx.shadowBlur = 10;
		ctx.fillStyle = g;
		ctx.fill();
		ctx.restore();
	});

	const starburst = makeCanvasTexture(128, 128, (ctx) => {
		const core = ctx.createRadialGradient(64, 64, 0, 64, 64, 34);
		core.addColorStop(0, 'rgba(255,255,255,1)');
		core.addColorStop(0.35, 'rgba(255,255,255,0.72)');
		core.addColorStop(1, 'rgba(255,255,255,0)');
		ctx.fillStyle = core;
		ctx.fillRect(0, 0, 128, 128);

		const drawSpike = (rx: number, ry: number) => {
			ctx.save();
			ctx.translate(64, 64);
			const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
			g.addColorStop(0, 'rgba(255,255,255,0.98)');
			g.addColorStop(0.45, 'rgba(255,255,255,0.48)');
			g.addColorStop(1, 'rgba(255,255,255,0)');
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.moveTo(-rx, 0);
			ctx.quadraticCurveTo(0, -ry, rx, 0);
			ctx.quadraticCurveTo(0, ry, -rx, 0);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		};
		drawSpike(62, 6);
		drawSpike(6, 62);
	});

	const diamond = makeCanvasTexture(32, 32, (ctx) => {
		ctx.save();
		ctx.translate(16, 16);
		ctx.beginPath();
		ctx.moveTo(0, -14);
		ctx.lineTo(7, 0);
		ctx.lineTo(0, 14);
		ctx.lineTo(-7, 0);
		ctx.closePath();
		const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 14);
		g.addColorStop(0, 'rgba(255,255,255,1)');
		g.addColorStop(0.6, 'rgba(255,255,255,0.85)');
		g.addColorStop(1, 'rgba(255,255,255,0)');
		ctx.fillStyle = g;
		ctx.fill();
		ctx.restore();
	});

	// Aspect-matched 16:9 Gaussian-convolved edge vignette (clear central 72%)
	const atmosphereHalo = makeCanvasTexture(320, 180, (ctx) => {
		const rawProfile = new Array<number>(64);
		for (let i = 0; i < 64; i += 1) {
			const r = i / 63;
			rawProfile[i] = r < 0.7 ? 0 : Math.pow((r - 0.7) / 0.3, 1.9);
		}
		const kernel = computeGaussianKernel1D(3.0, 8);
		const smoothProfile = convolve1D(rawProfile, kernel);
		ctx.save();
		ctx.translate(160, 90);
		ctx.scale(160 / 90, 1);
		const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 108);
		for (let i = 0; i < 64; i += 4) {
			const stop = i / 63;
			const a = Math.min(0.55, Math.max(0, smoothProfile[i] * 0.6));
			g.addColorStop(stop, `rgba(255,255,255,${a.toFixed(3)})`);
		}
		g.addColorStop(1, `rgba(255,255,255,${Math.min(0.58, smoothProfile[63] * 0.62).toFixed(3)})`);
		ctx.fillStyle = g;
		ctx.fillRect(-160, -108, 320, 216);
		ctx.restore();
	});

	return {
		softGlow,
		spark,
		ring,
		smoke,
		runeSigil,
		spectralClaw: runeSigil,
		arenaVignette,
		ribbonAura,
		ribbonCore,
		slashArc,
		starburst,
		diamond,
		atmosphereHalo,
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
	const unique = new Set<Texture>([
		textures.softGlow,
		textures.spark,
		textures.ring,
		textures.smoke,
		textures.runeSigil,
		textures.spectralClaw,
		textures.arenaVignette,
		textures.ribbonAura,
		textures.ribbonCore,
		textures.slashArc,
		textures.starburst,
		textures.diamond,
		textures.atmosphereHalo,
	]);
	const assetTextures = new Set<Texture>();
	for (const url of Object.values(NORSE_VFX_ART_URLS)) {
		const cached = Assets.get<Texture>(url);
		if (cached) assetTextures.add(cached);
	}
	for (const tex of unique) {
		if (!assetTextures.has(tex)) {
			tex.destroy(true);
		}
	}
}
