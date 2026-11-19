/**
 * titanTextures.ts
 *
 * Procedural Riot / Unity-grade GPU gradient textures for Norse Titan 2D PixiJS v8 scenes.
 * Every ground decal, shockwave, dust cloud, and dark basalt rock shard uses soft
 * multi-stop radial/linear gradients with feathered alpha falloff — zero hard circular
 * vector edges or flat pale polygons.
 */

import { Texture } from 'pixi.js';

export interface TitanVfxTextures {
	readonly astrolabeOuter: Texture;
	readonly astrolabeInner: Texture;
	readonly craterDecal: Texture;
	readonly impactBloom: Texture;
	readonly shockwaveRing: Texture;
	readonly stoneShard: Texture;
	readonly chainLink: Texture;
	readonly celestialBeam: Texture;
	readonly dustPuff: Texture;
}

function createCanvas(width: number, height: number): {
	readonly canvas: HTMLCanvasElement;
	readonly ctx: CanvasRenderingContext2D | null;
} {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	return { canvas, ctx: canvas.getContext('2d') };
}

function buildAstrolabeOuter(): Texture {
	const { canvas, ctx } = createCanvas(256, 256);
	if (!ctx) return Texture.from(canvas);

	ctx.save();
	ctx.translate(128, 128);

	const halo = ctx.createRadialGradient(0, 0, 86, 0, 0, 124);
	halo.addColorStop(0, 'rgba(255, 255, 255, 0)');
	halo.addColorStop(0.5, 'rgba(255, 255, 255, 0.22)');
	halo.addColorStop(0.75, 'rgba(255, 255, 255, 0.12)');
	halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
	ctx.fillStyle = halo;
	ctx.beginPath();
	ctx.arc(0, 0, 124, 0, Math.PI * 2);
	ctx.fill();

	ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
	ctx.lineWidth = 3.0;
	ctx.beginPath();
	ctx.arc(0, 0, 114, 0, Math.PI * 2);
	ctx.stroke();

	ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
	ctx.lineWidth = 1.8;
	ctx.beginPath();
	ctx.arc(0, 0, 96, 0, Math.PI * 2);
	ctx.stroke();

	ctx.lineWidth = 1.8;
	for (let i = 0; i < 16; i += 1) {
		const angle = (Math.PI * 2 * i) / 16;
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		const isCardinal = i % 4 === 0;
		const rInner = isCardinal ? 84 : 96;
		const rOuter = isCardinal ? 122 : 114;

		ctx.strokeStyle = isCardinal ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.7)';
		ctx.beginPath();
		ctx.moveTo(cos * rInner, sin * rInner);
		ctx.lineTo(cos * rOuter, sin * rOuter);
		ctx.stroke();

		const mid = angle + Math.PI / 16;
		const mx = Math.cos(mid) * 105;
		const my = Math.sin(mid) * 105;
		ctx.save();
		ctx.translate(mx, my);
		ctx.rotate(mid + Math.PI / 2);
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(-4, 5);
		ctx.lineTo(0, -5);
		ctx.lineTo(4, 5);
		if (i % 2 === 0) {
			ctx.moveTo(0, -5);
			ctx.lineTo(0, 6);
		}
		ctx.stroke();
		ctx.restore();
	}

	ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
	for (let i = 0; i < 4; i += 1) {
		ctx.save();
		ctx.rotate((Math.PI / 2) * i);
		ctx.beginPath();
		ctx.moveTo(0, -124);
		ctx.lineTo(7, -112);
		ctx.lineTo(0, -104);
		ctx.lineTo(-7, -112);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}

	ctx.restore();
	return Texture.from(canvas);
}

function buildAstrolabeInner(): Texture {
	const { canvas, ctx } = createCanvas(192, 192);
	if (!ctx) return Texture.from(canvas);

	ctx.save();
	ctx.translate(96, 96);

	ctx.strokeStyle = 'rgba(255, 255, 255, 0.84)';
	ctx.lineWidth = 2.2;
	ctx.beginPath();
	ctx.arc(0, 0, 76, 0, Math.PI * 2);
	ctx.stroke();

	ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.arc(0, 0, 56, 0, Math.PI * 2);
	ctx.stroke();

	ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
	ctx.lineWidth = 1.9;
	for (let pass = 0; pass < 2; pass += 1) {
		ctx.save();
		ctx.rotate((Math.PI / 4) * pass);
		const s = 53;
		ctx.strokeRect(-s, -s, s * 2, s * 2);
		ctx.restore();
	}

	ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
	for (let i = 0; i < 8; i += 1) {
		const a = (Math.PI / 4) * i;
		ctx.beginPath();
		ctx.arc(Math.cos(a) * 76, Math.sin(a) * 76, 3.0, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.restore();
	return Texture.from(canvas);
}

/**
 * Soft multi-stop radial depression & scorched-earth ground decal (Riot VFX standard).
 * Smoothly feathers to 0% alpha at the outer edge with organic radial soot streaks —
 * zero visible circular outline.
 */
function buildCraterDecal(): Texture {
	const { canvas, ctx } = createCanvas(256, 256);
	if (!ctx) return Texture.from(canvas);

	ctx.save();
	ctx.translate(128, 128);

	// 1. Wide multi-stop feathered ambient depression shadow
	const depression = ctx.createRadialGradient(0, 0, 6, 0, 0, 122);
	depression.addColorStop(0, 'rgba(2, 4, 9, 0.78)');
	depression.addColorStop(0.24, 'rgba(6, 9, 16, 0.56)');
	depression.addColorStop(0.52, 'rgba(14, 18, 26, 0.24)');
	depression.addColorStop(0.78, 'rgba(18, 22, 30, 0.06)');
	depression.addColorStop(1, 'rgba(18, 22, 30, 0)');
	ctx.fillStyle = depression;
	ctx.fillRect(-128, -128, 256, 256);

	// 2. Irregular organic radial scorch/impact streaks breaking up symmetry
	const rayCount = 11;
	for (let i = 0; i < rayCount; i += 1) {
		const angle = (Math.PI * 2 * i) / rayCount + ((i % 3) - 1) * 0.14;
		const len = 72 + ((i * 29) % 44);
		const width = 12 + ((i * 17) % 14);
		ctx.save();
		ctx.rotate(angle);
		const rayGrad = ctx.createLinearGradient(0, 0, len, 0);
		rayGrad.addColorStop(0, 'rgba(3, 5, 10, 0.42)');
		rayGrad.addColorStop(0.55, 'rgba(8, 11, 18, 0.16)');
		rayGrad.addColorStop(1, 'rgba(8, 11, 18, 0)');
		ctx.fillStyle = rayGrad;
		ctx.beginPath();
		ctx.moveTo(0, -width * 0.45);
		ctx.quadraticCurveTo(len * 0.55, -width * 0.28, len, 0);
		ctx.quadraticCurveTo(len * 0.55, width * 0.28, 0, width * 0.45);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}

	ctx.restore();
	return Texture.from(canvas);
}

/**
 * Soft additive multi-stop radial bloom for epicenter lighting on fractured stone.
 */
function buildImpactBloom(): Texture {
	const { canvas, ctx } = createCanvas(256, 256);
	if (!ctx) return Texture.from(canvas);

	const g = ctx.createRadialGradient(128, 128, 2, 128, 128, 124);
	g.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
	g.addColorStop(0.18, 'rgba(255, 245, 215, 0.55)');
	g.addColorStop(0.46, 'rgba(255, 220, 160, 0.2)');
	g.addColorStop(0.76, 'rgba(255, 190, 120, 0.05)');
	g.addColorStop(1, 'rgba(255, 190, 120, 0)');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, 256, 256);

	return Texture.from(canvas);
}

/**
 * Soft feathered shockwave ring (smooth inner and outer gradient falloff).
 */
function buildShockwaveRing(): Texture {
	const { canvas, ctx } = createCanvas(256, 256);
	if (!ctx) return Texture.from(canvas);

	const g = ctx.createRadialGradient(128, 128, 56, 128, 128, 124);
	g.addColorStop(0, 'rgba(255, 255, 255, 0)');
	g.addColorStop(0.45, 'rgba(255, 255, 255, 0.14)');
	g.addColorStop(0.72, 'rgba(255, 255, 255, 0.52)');
	g.addColorStop(0.84, 'rgba(255, 255, 255, 0.22)');
	g.addColorStop(1, 'rgba(255, 255, 255, 0)');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, 256, 256);

	return Texture.from(canvas);
}

/**
 * Heavy dark Nordic basalt rock shard with directional fractured-edge gradient rim
 * (grounded to dark stone arenas — never flat pale floating polygons).
 */
function buildStoneShard(): Texture {
	const { canvas, ctx } = createCanvas(64, 64);
	if (!ctx) return Texture.from(canvas);

	const shadow = ctx.createRadialGradient(34, 36, 4, 34, 36, 28);
	shadow.addColorStop(0, 'rgba(2, 4, 8, 0.55)');
	shadow.addColorStop(1, 'rgba(2, 4, 8, 0)');
	ctx.fillStyle = shadow;
	ctx.fillRect(0, 0, 64, 64);

	const bodyGrad = ctx.createLinearGradient(12, 10, 50, 54);
	bodyGrad.addColorStop(0, 'rgba(71, 85, 105, 0.96)');
	bodyGrad.addColorStop(0.38, 'rgba(30, 41, 59, 0.98)');
	bodyGrad.addColorStop(1, 'rgba(7, 10, 18, 0.98)');

	ctx.fillStyle = bodyGrad;
	ctx.beginPath();
	ctx.moveTo(28, 8);
	ctx.lineTo(50, 20);
	ctx.lineTo(54, 38);
	ctx.lineTo(36, 54);
	ctx.lineTo(14, 46);
	ctx.lineTo(10, 26);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = 'rgba(4, 6, 12, 0.52)';
	ctx.beginPath();
	ctx.moveTo(30, 30);
	ctx.lineTo(54, 38);
	ctx.lineTo(36, 54);
	ctx.lineTo(14, 46);
	ctx.closePath();
	ctx.fill();

	const rimGrad = ctx.createLinearGradient(12, 10, 46, 32);
	rimGrad.addColorStop(0, 'rgba(226, 232, 240, 0.72)');
	rimGrad.addColorStop(0.55, 'rgba(148, 163, 184, 0.32)');
	rimGrad.addColorStop(1, 'rgba(148, 163, 184, 0)');
	ctx.strokeStyle = rimGrad;
	ctx.lineWidth = 2.0;
	ctx.beginPath();
	ctx.moveTo(10, 26);
	ctx.lineTo(28, 8);
	ctx.lineTo(50, 20);
	ctx.stroke();

	return Texture.from(canvas);
}

function buildChainLink(): Texture {
	const { canvas, ctx } = createCanvas(48, 24);
	if (!ctx) return Texture.from(canvas);

	const ironGrad = ctx.createLinearGradient(6, 4, 42, 20);
	ironGrad.addColorStop(0, 'rgba(148, 163, 184, 0.95)');
	ironGrad.addColorStop(0.5, 'rgba(71, 85, 105, 0.95)');
	ironGrad.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
	ctx.strokeStyle = ironGrad;
	ctx.lineWidth = 4.4;
	ctx.beginPath();
	ctx.roundRect(6, 5, 36, 14, 7);
	ctx.stroke();

	ctx.strokeStyle = 'rgba(241, 245, 249, 0.75)';
	ctx.lineWidth = 1.2;
	ctx.beginPath();
	ctx.moveTo(12, 6);
	ctx.lineTo(34, 6);
	ctx.stroke();

	return Texture.from(canvas);
}

function buildCelestialBeam(): Texture {
	const { canvas, ctx } = createCanvas(128, 256);
	if (!ctx) return Texture.from(canvas);

	const hGrad = ctx.createLinearGradient(0, 0, 128, 0);
	hGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
	hGrad.addColorStop(0.24, 'rgba(255, 255, 255, 0.22)');
	hGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.78)');
	hGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
	hGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.78)');
	hGrad.addColorStop(0.76, 'rgba(255, 255, 255, 0.22)');
	hGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
	ctx.fillStyle = hGrad;
	ctx.fillRect(0, 0, 128, 256);

	ctx.globalCompositeOperation = 'destination-in';
	const vGrad = ctx.createLinearGradient(0, 0, 0, 256);
	vGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
	vGrad.addColorStop(0.18, 'rgba(255, 255, 255, 0.9)');
	vGrad.addColorStop(0.84, 'rgba(255, 255, 255, 1)');
	vGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
	ctx.fillStyle = vGrad;
	ctx.fillRect(0, 0, 128, 256);

	return Texture.from(canvas);
}

/**
 * Soft earthy-charcoal ground dust cloud with multi-stop alpha feathering.
 */
function buildDustPuff(): Texture {
	const { canvas, ctx } = createCanvas(128, 128);
	if (!ctx) return Texture.from(canvas);

	const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
	g.addColorStop(0, 'rgba(64, 72, 86, 0.44)');
	g.addColorStop(0.45, 'rgba(34, 40, 52, 0.24)');
	g.addColorStop(0.78, 'rgba(18, 22, 30, 0.08)');
	g.addColorStop(1, 'rgba(14, 18, 24, 0)');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, 128, 128);

	return Texture.from(canvas);
}

export function buildTitanVfxTextures(): TitanVfxTextures {
	return {
		astrolabeOuter: buildAstrolabeOuter(),
		astrolabeInner: buildAstrolabeInner(),
		craterDecal: buildCraterDecal(),
		impactBloom: buildImpactBloom(),
		shockwaveRing: buildShockwaveRing(),
		stoneShard: buildStoneShard(),
		chainLink: buildChainLink(),
		celestialBeam: buildCelestialBeam(),
		dustPuff: buildDustPuff(),
	};
}

export function destroyTitanTextureSet(set: TitanVfxTextures): void {
	set.astrolabeOuter.destroy(true);
	set.astrolabeInner.destroy(true);
	set.craterDecal.destroy(true);
	set.impactBloom.destroy(true);
	set.shockwaveRing.destroy(true);
	set.stoneShard.destroy(true);
	set.chainLink.destroy(true);
	set.celestialBeam.destroy(true);
	set.dustPuff.destroy(true);
}
