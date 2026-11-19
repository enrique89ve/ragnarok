/**
 * dragonFlameTextures.ts
 *
 * Procedural GPU textures for League-of-Legends-balanced stylized 2D dragon fire VFX.
 * Uses clean, sinuous S-curved flame silhouettes, flowing spiral fire ribbons,
 * translucent layered washes (~35%-65% alpha), and delicate detached flame wisps —
 * zero interior cutout holes or dark spots.
 */

import { Texture } from 'pixi.js';

export interface DragonFlameTextures {
	readonly flameLick: Texture;
	readonly flameVortex: Texture;
	readonly windArc: Texture;
	readonly flamePlume: Texture;
	readonly scorchRing: Texture;
	readonly emberSpark: Texture;
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

/**
 * Clean, sinuous S-curved LoL-style flame tongue with a forked side-lick and
 * two delicate detached rising flame wisps — zero interior holes.
 */
function buildCelFlameLick(): Texture {
	const { canvas, ctx } = createCanvas(128, 192);
	if (!ctx) return Texture.from(canvas);

	// 1. Translucent outer vermilion-amber sinuous silhouette with organic side-lick
	const outerGrad = ctx.createLinearGradient(64, 186, 64, 8);
	outerGrad.addColorStop(0, 'rgba(220, 56, 26, 0.56)');
	outerGrad.addColorStop(0.5, 'rgba(235, 82, 26, 0.44)');
	outerGrad.addColorStop(0.85, 'rgba(232, 68, 22, 0.24)');
	outerGrad.addColorStop(1, 'rgba(220, 56, 26, 0)');
	ctx.fillStyle = outerGrad;
	ctx.beginPath();
	ctx.moveTo(64, 186);
	ctx.bezierCurveTo(106, 178, 114, 134, 96, 98);
	// Small organic outer side-flame lick
	ctx.bezierCurveTo(106, 84, 108, 66, 98, 56);
	ctx.bezierCurveTo(92, 68, 86, 74, 82, 72);
	// Main sinuous S-curve flame tip
	ctx.bezierCurveTo(84, 48, 82, 26, 65, 6);
	ctx.bezierCurveTo(48, 30, 50, 54, 40, 78);
	ctx.bezierCurveTo(32, 70, 28, 60, 26, 52);
	ctx.bezierCurveTo(18, 72, 20, 96, 28, 116);
	ctx.bezierCurveTo(18, 152, 28, 178, 64, 186);
	ctx.closePath();
	ctx.fill();

	// 2. Translucent warm tangerine mid-band
	const midGrad = ctx.createLinearGradient(64, 178, 64, 24);
	midGrad.addColorStop(0, 'rgba(255, 142, 36, 0.64)');
	midGrad.addColorStop(0.58, 'rgba(255, 156, 48, 0.46)');
	midGrad.addColorStop(1, 'rgba(255, 134, 32, 0)');
	ctx.fillStyle = midGrad;
	ctx.beginPath();
	ctx.moveTo(64, 178);
	ctx.bezierCurveTo(94, 170, 98, 128, 82, 88);
	ctx.bezierCurveTo(72, 62, 74, 40, 64, 22);
	ctx.bezierCurveTo(50, 46, 48, 70, 42, 94);
	ctx.bezierCurveTo(30, 132, 36, 170, 64, 178);
	ctx.closePath();
	ctx.fill();

	// 3. Slim luminous golden-yellow inner filament
	const coreGrad = ctx.createLinearGradient(64, 168, 64, 52);
	coreGrad.addColorStop(0, 'rgba(255, 228, 108, 0.78)');
	coreGrad.addColorStop(0.62, 'rgba(255, 214, 82, 0.52)');
	coreGrad.addColorStop(1, 'rgba(255, 200, 64, 0)');
	ctx.fillStyle = coreGrad;
	ctx.beginPath();
	ctx.moveTo(64, 168);
	ctx.bezierCurveTo(82, 158, 82, 122, 68, 88);
	ctx.bezierCurveTo(64, 72, 66, 60, 62, 50);
	ctx.bezierCurveTo(54, 72, 50, 94, 47, 114);
	ctx.bezierCurveTo(42, 142, 48, 160, 64, 168);
	ctx.closePath();
	ctx.fill();

	// 4. Delicate incandescent core glint
	ctx.fillStyle = 'rgba(255, 250, 214, 0.74)';
	ctx.beginPath();
	ctx.moveTo(64, 158);
	ctx.bezierCurveTo(72, 148, 71, 128, 64, 104);
	ctx.bezierCurveTo(57, 128, 56, 148, 64, 158);
	ctx.closePath();
	ctx.fill();

	// 5. Two delicate detached rising flame wisps above the shoulders
	ctx.fillStyle = 'rgba(255, 168, 56, 0.5)';
	ctx.beginPath();
	ctx.moveTo(96, 42);
	ctx.bezierCurveTo(102, 34, 102, 24, 96, 18);
	ctx.bezierCurveTo(91, 26, 91, 35, 96, 42);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = 'rgba(255, 206, 84, 0.45)';
	ctx.beginPath();
	ctx.moveTo(32, 38);
	ctx.bezierCurveTo(37, 32, 36, 24, 31, 20);
	ctx.bezierCurveTo(27, 26, 28, 33, 32, 38);
	ctx.closePath();
	ctx.fill();

	return Texture.from(canvas);
}

/**
 * Clean translucent spiral fire ribbons (LoL elemental vortex) — flowing curved
 * flame tails sweeping around a soft luminous core with zero dark holes.
 */
function buildCelFlameVortex(): Texture {
	const { canvas, ctx } = createCanvas(256, 256);
	if (!ctx) return Texture.from(canvas);

	ctx.save();
	ctx.translate(128, 128);

	// Outer sweeping tapered flame ribbons (5 clean spiral arms)
	for (let i = 0; i < 5; i += 1) {
		ctx.save();
		ctx.rotate((Math.PI * 2 * i) / 5);
		const armGrad = ctx.createLinearGradient(0, -18, 86, 24);
		armGrad.addColorStop(0, 'rgba(255, 138, 36, 0.46)');
		armGrad.addColorStop(0.55, 'rgba(224, 62, 24, 0.36)');
		armGrad.addColorStop(1, 'rgba(220, 48, 24, 0)');
		ctx.fillStyle = armGrad;
		ctx.beginPath();
		ctx.moveTo(6, -16);
		ctx.bezierCurveTo(54, -76, 112, -32, 92, 22);
		ctx.bezierCurveTo(86, -8, 52, -38, 12, -6);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}

	// Inner warm golden-amber crescent swirls
	for (let i = 0; i < 4; i += 1) {
		ctx.save();
		ctx.rotate((Math.PI * 2 * i) / 4 + 0.42);
		const innerGrad = ctx.createLinearGradient(0, -10, 62, 16);
		innerGrad.addColorStop(0, 'rgba(255, 224, 96, 0.62)');
		innerGrad.addColorStop(0.65, 'rgba(255, 148, 42, 0.38)');
		innerGrad.addColorStop(1, 'rgba(255, 122, 20, 0)');
		ctx.fillStyle = innerGrad;
		ctx.beginPath();
		ctx.moveTo(4, -10);
		ctx.bezierCurveTo(38, -54, 78, -18, 62, 18);
		ctx.bezierCurveTo(56, -4, 34, -24, 8, -2);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}

	// Delicate luminous golden curl filaments
	ctx.strokeStyle = 'rgba(255, 232, 122, 0.68)';
	ctx.lineWidth = 3.2;
	ctx.lineCap = 'round';
	for (let i = 0; i < 3; i += 1) {
		ctx.save();
		ctx.rotate((Math.PI * 2 * i) / 3 + 0.3);
		ctx.beginPath();
		ctx.arc(0, 0, 42, -0.35, 0.95);
		ctx.stroke();
		ctx.restore();
	}

	// Soft translucent luminous center
	const core = ctx.createRadialGradient(0, 0, 2, 0, 0, 36);
	core.addColorStop(0, 'rgba(255, 250, 214, 0.68)');
	core.addColorStop(0.5, 'rgba(255, 204, 78, 0.32)');
	core.addColorStop(1, 'rgba(255, 140, 36, 0)');
	ctx.fillStyle = core;
	ctx.beginPath();
	ctx.arc(0, 0, 36, 0, Math.PI * 2);
	ctx.fill();

	ctx.restore();
	return Texture.from(canvas);
}

/**
 * Light, sleek sweeping silver-white wind pressure arc (LoL readability restraint).
 */
function buildWindArc(): Texture {
	const { canvas, ctx } = createCanvas(256, 256);
	if (!ctx) return Texture.from(canvas);

	ctx.save();
	ctx.translate(128, 128);

	const grad = ctx.createLinearGradient(-110, -110, 110, 110);
	grad.addColorStop(0, 'rgba(226, 238, 255, 0)');
	grad.addColorStop(0.24, 'rgba(235, 244, 255, 0.42)');
	grad.addColorStop(0.55, 'rgba(255, 255, 255, 0.56)');
	grad.addColorStop(0.84, 'rgba(210, 224, 240, 0.3)');
	grad.addColorStop(1, 'rgba(200, 215, 235, 0)');

	ctx.fillStyle = grad;
	ctx.beginPath();
	ctx.arc(0, 0, 114, -Math.PI * 0.76, Math.PI * 0.38, false);
	ctx.arc(3, 2, 102, Math.PI * 0.38, -Math.PI * 0.76, true);
	ctx.closePath();
	ctx.fill();

	ctx.strokeStyle = 'rgba(255, 255, 255, 0.36)';
	ctx.lineWidth = 1.6;
	ctx.beginPath();
	ctx.arc(0, 0, 90, -Math.PI * 0.52, Math.PI * 0.18, false);
	ctx.stroke();

	ctx.restore();
	return Texture.from(canvas);
}

/**
 * Subtle warm environmental light bounce halo (additive).
 */
function buildFlamePlume(): Texture {
	const { canvas, ctx } = createCanvas(128, 128);
	if (!ctx) return Texture.from(canvas);

	const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
	g.addColorStop(0, 'rgba(255, 236, 170, 0.46)');
	g.addColorStop(0.35, 'rgba(255, 148, 48, 0.26)');
	g.addColorStop(0.7, 'rgba(220, 56, 26, 0.09)');
	g.addColorStop(1, 'rgba(220, 38, 38, 0)');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, 128, 128);
	return Texture.from(canvas);
}

/**
 * Soft Riot / Unity multi-stop feathered radial heat-scorch ground decal.
 * Charred dark core -> warm translucent amber energy wave -> smooth 0% alpha
 * feathering at the perimeter (zero hard circular sticker outline).
 */
function buildScorchRing(): Texture {
	const { canvas, ctx } = createCanvas(256, 256);
	if (!ctx) return Texture.from(canvas);

	ctx.save();
	ctx.translate(128, 128);

	// 1. Soft charred heat-scorch vignette feathering cleanly into the stone board
	const charGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, 122);
	charGrad.addColorStop(0, 'rgba(6, 5, 8, 0.56)');
	charGrad.addColorStop(0.38, 'rgba(18, 10, 8, 0.34)');
	charGrad.addColorStop(0.74, 'rgba(14, 10, 12, 0.12)');
	charGrad.addColorStop(1, 'rgba(10, 8, 12, 0)');
	ctx.fillStyle = charGrad;
	ctx.fillRect(-128, -128, 256, 256);

	// 2. Soft feathered golden-amber thermal heat ring (multi-stop inner & outer fade)
	const heatRing = ctx.createRadialGradient(0, 0, 20, 0, 0, 114);
	heatRing.addColorStop(0, 'rgba(255, 224, 110, 0.34)');
	heatRing.addColorStop(0.38, 'rgba(255, 148, 42, 0.22)');
	heatRing.addColorStop(0.68, 'rgba(255, 198, 76, 0.38)');
	heatRing.addColorStop(0.84, 'rgba(220, 68, 24, 0.16)');
	heatRing.addColorStop(1, 'rgba(180, 36, 18, 0)');
	ctx.fillStyle = heatRing;
	ctx.fillRect(-128, -128, 256, 256);

	ctx.restore();
	return Texture.from(canvas);
}

/**
 * Delicate golden-yellow additive diamond spark.
 */
function buildEmberSpark(): Texture {
	const { canvas, ctx } = createCanvas(48, 48);
	if (!ctx) return Texture.from(canvas);

	const glow = ctx.createRadialGradient(24, 24, 1, 24, 24, 20);
	glow.addColorStop(0, 'rgba(255, 250, 214, 0.92)');
	glow.addColorStop(0.38, 'rgba(255, 222, 96, 0.58)');
	glow.addColorStop(1, 'rgba(255, 130, 32, 0)');
	ctx.fillStyle = glow;
	ctx.fillRect(0, 0, 48, 48);

	ctx.fillStyle = 'rgba(255, 252, 226, 0.92)';
	ctx.beginPath();
	ctx.moveTo(24, 9);
	ctx.lineTo(27, 21);
	ctx.lineTo(39, 24);
	ctx.lineTo(27, 27);
	ctx.lineTo(24, 39);
	ctx.lineTo(21, 27);
	ctx.lineTo(9, 24);
	ctx.lineTo(21, 21);
	ctx.closePath();
	ctx.fill();

	return Texture.from(canvas);
}

export function buildDragonFlameTextures(): DragonFlameTextures {
	return {
		flameLick: buildCelFlameLick(),
		flameVortex: buildCelFlameVortex(),
		windArc: buildWindArc(),
		flamePlume: buildFlamePlume(),
		scorchRing: buildScorchRing(),
		emberSpark: buildEmberSpark(),
	};
}

export function destroyDragonFlameTextureSet(set: DragonFlameTextures): void {
	set.flameLick.destroy(true);
	set.flameVortex.destroy(true);
	set.windArc.destroy(true);
	set.flamePlume.destroy(true);
	set.scorchRing.destroy(true);
	set.emberSpark.destroy(true);
}
