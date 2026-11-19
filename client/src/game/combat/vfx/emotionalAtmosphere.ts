/**
 * emotionalAtmosphere.ts
 *
 * Psychological Convolutional Color & Diffusion Engine for Ragnarok Poker Combat.
 *
 * Translates live match stages (opening strategy, rising stakes, winning momentum,
 * survival dread, high-stakes climax, all-in Ragnarök) into smooth, continuous:
 *   1. PixiJS v8 GPU 4x5 RGBA Color-Matrix Convolution (`ColorMatrixFilter`)
 *   2. PixiJS v8 GPU Separable Gaussian Blur Convolution (`BlurFilter`)
 *   3. Normalized 1D/2D Gaussian kernel weights for procedural edge-diffusion blooms
 *   4. Subtle background-only CSS tone grading (cards & HUD remain 100% razor-sharp)
 */

export type EmotionalMood =
	| 'calm'
	| 'rising'
	| 'momentum'
	| 'dread'
	| 'climax'
	| 'allin';

export type EmotionalImpulseKind = 'shock' | 'euphoria' | 'dread' | 'climax';

export interface EmotionalTelemetry {
	readonly phase?: string;
	readonly potRatio: number;
	readonly isAllInShowdown: boolean;
	readonly playerHpPct: number;
	readonly opponentHpPct: number;
	readonly handTier?: 'low' | 'mid' | 'high' | 'godly';
	readonly playerStreak?: number;
	readonly opponentStreak?: number;
}

export interface EmotionalAtmosphereParams {
	readonly mood: EmotionalMood;
	/** PixiJS v8 GPU BlurFilter Gaussian strength on atmospheric diffusion layer. */
	readonly blurStrength: number;
	/** Hue rotation in degrees (-20..+20) for subtle psychological color shift. */
	readonly hueShiftDeg: number;
	/** Color saturation multiplier (0.72..1.42). */
	readonly saturation: number;
	/** Tonal contrast multiplier (0.95..1.26). */
	readonly contrast: number;
	/** Luminance multiplier (0.86..1.14). */
	readonly brightness: number;
	/** RGB (0..1) atmospheric diffusion tint (edges & ambient mist). */
	readonly tintR: number;
	readonly tintG: number;
	readonly tintB: number;
	/** Opacity of the peripheral chromatic diffusion field (0..0.48). */
	readonly edgeAlpha: number;
	/** Breathing / heartbeat pulse frequency in Hz. */
	readonly pulseHz: number;
	/** Subtle blur (px) applied strictly to `.layer-background` (0..3px). */
	readonly bgBlurPx: number;
}

export interface EmotionalImpulseState {
	readonly kind: EmotionalImpulseKind;
	/** Decaying normalized strength (0..1). */
	readonly strength: number;
}

export type ColorMatrixTuple = [
	number, number, number, number, number,
	number, number, number, number, number,
	number, number, number, number, number,
	number, number, number, number, number,
];

const MOOD_PRESETS: Record<EmotionalMood, EmotionalAtmosphereParams> = {
	calm: {
		mood: 'calm',
		blurStrength: 1.5,
		hueShiftDeg: 0,
		saturation: 1.0,
		contrast: 1.0,
		brightness: 1.0,
		tintR: 0.2,
		tintG: 0.54,
		tintB: 0.85,
		edgeAlpha: 0.025,
		pulseHz: 0.25,
		bgBlurPx: 0,
	},
	rising: {
		mood: 'rising',
		blurStrength: 2.2,
		hueShiftDeg: -2,
		saturation: 1.04,
		contrast: 1.02,
		brightness: 1.0,
		tintR: 0.88,
		tintG: 0.62,
		tintB: 0.26,
		edgeAlpha: 0.05,
		pulseHz: 0.42,
		bgBlurPx: 0,
	},
	momentum: {
		mood: 'momentum',
		blurStrength: 2.6,
		hueShiftDeg: 4,
		saturation: 1.08,
		contrast: 1.04,
		brightness: 1.02,
		tintR: 0.94,
		tintG: 0.78,
		tintB: 0.3,
		edgeAlpha: 0.065,
		pulseHz: 0.52,
		bgBlurPx: 0,
	},
	dread: {
		mood: 'dread',
		blurStrength: 3.6,
		hueShiftDeg: -4,
		saturation: 0.92,
		contrast: 1.06,
		brightness: 0.97,
		tintR: 0.78,
		tintG: 0.16,
		tintB: 0.26,
		edgeAlpha: 0.095,
		pulseHz: 0.95,
		bgBlurPx: 0.5,
	},
	climax: {
		mood: 'climax',
		blurStrength: 3.2,
		hueShiftDeg: -3,
		saturation: 1.09,
		contrast: 1.05,
		brightness: 1.01,
		tintR: 0.9,
		tintG: 0.48,
		tintB: 0.22,
		edgeAlpha: 0.08,
		pulseHz: 0.72,
		bgBlurPx: 0.35,
	},
	allin: {
		mood: 'allin',
		blurStrength: 4.4,
		hueShiftDeg: -5,
		saturation: 1.14,
		contrast: 1.08,
		brightness: 1.0,
		tintR: 0.9,
		tintG: 0.24,
		tintB: 0.2,
		edgeAlpha: 0.13,
		pulseHz: 1.25,
		bgBlurPx: 0.8,
	},
};

export function getEmotionalMoodPreset(mood: EmotionalMood): EmotionalAtmosphereParams {
	return MOOD_PRESETS[mood];
}

function clamp(v: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, v));
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

/**
 * Resolves the psychological emotional atmosphere from live combat telemetry.
 * Priority captures genuine dramatic inflection points without flickering:
 *   All-In / Showdown > Survival Dread > High-Stakes Climax > Momentum > Rising > Calm.
 */
export function resolveEmotionalAtmosphere(
	telemetry: EmotionalTelemetry,
): EmotionalAtmosphereParams {
	const phase = (telemetry.phase ?? '').toLowerCase();
	const potRatio = clamp(telemetry.potRatio, 0, 1);
	const playerHpPct = clamp(telemetry.playerHpPct, 0, 1);
	const opponentHpPct = clamp(telemetry.opponentHpPct, 0, 1);
	const playerStreak = telemetry.playerStreak ?? 0;
	const opponentStreak = telemetry.opponentStreak ?? 0;

	let base: EmotionalAtmosphereParams;
	if (telemetry.isAllInShowdown || phase === 'resolution' || phase === 'showdown') {
		base = MOOD_PRESETS.allin;
	} else if (playerHpPct <= 0.32 || opponentStreak >= 2) {
		base = MOOD_PRESETS.dread;
	} else if (potRatio > 0.3 || phase === 'destiny' || opponentHpPct <= 0.25) {
		base = MOOD_PRESETS.climax;
	} else if (
		telemetry.handTier === 'godly'
		|| telemetry.handTier === 'high'
		|| playerStreak >= 2
	) {
		base = MOOD_PRESETS.momentum;
	} else if (potRatio > 0.1 || phase === 'foresight' || phase === 'faith') {
		base = MOOD_PRESETS.rising;
	} else {
		base = MOOD_PRESETS.calm;
	}

	// Subtle continuous micro-modulation from pot pressure
	const pressureBoost = potRatio * 0.25;
	return {
		...base,
		blurStrength: clamp(base.blurStrength + pressureBoost * 1.4, 1.0, 6.0),
		saturation: clamp(base.saturation + pressureBoost * 0.06, 0.88, 1.2),
		edgeAlpha: clamp(base.edgeAlpha + pressureBoost * 0.04, 0.02, 0.16),
	};
}

/**
 * Computes a normalized 1D Gaussian convolution kernel of length `2 * radius + 1`.
 * The sum of all weights is guaranteed to equal `1.0`.
 */
export function computeGaussianKernel1D(sigma: number, radius: number): number[] {
	const safeRadius = Math.max(1, Math.floor(radius));
	const safeSigma = Math.max(0.25, sigma);
	const invTwoSigmaSq = 1 / (2 * safeSigma * safeSigma);
	const raw: number[] = [];
	let sum = 0;

	for (let i = -safeRadius; i <= safeRadius; i += 1) {
		const w = Math.exp(-(i * i) * invTwoSigmaSq);
		raw.push(w);
		sum += w;
	}
	return raw.map(w => w / sum);
}

/**
 * Applies a 1D separable Gaussian convolution pass to a scalar signal (used for
 * banding-free radial atmospheric diffusion LUTs).
 */
export function convolve1D(signal: readonly number[], kernel: readonly number[]): number[] {
	const radius = Math.floor(kernel.length / 2);
	const n = signal.length;
	const out = new Array<number>(n);
	for (let i = 0; i < n; i += 1) {
		let acc = 0;
		for (let k = -radius; k <= radius; k += 1) {
			const idx = clamp(i + k, 0, n - 1);
			acc += signal[idx] * kernel[k + radius];
		}
		out[i] = acc;
	}
	return out;
}

/**
 * Exponentially interpolates the live atmosphere toward target parameters and
 * blends any transient psychological impulse (critical shock, euphoria, dread).
 */
export function stepEmotionalAtmosphere(
	current: EmotionalAtmosphereParams,
	target: EmotionalAtmosphereParams,
	impulse: EmotionalImpulseState | null,
	dtSec: number,
): {
	readonly state: EmotionalAtmosphereParams;
	readonly nextImpulse: EmotionalImpulseState | null;
} {
	const alpha = 1 - Math.exp(-3.0 * Math.max(0, dtSec));
	const base: EmotionalAtmosphereParams = {
		mood: target.mood,
		blurStrength: lerp(current.blurStrength, target.blurStrength, alpha),
		hueShiftDeg: lerp(current.hueShiftDeg, target.hueShiftDeg, alpha),
		saturation: lerp(current.saturation, target.saturation, alpha),
		contrast: lerp(current.contrast, target.contrast, alpha),
		brightness: lerp(current.brightness, target.brightness, alpha),
		tintR: lerp(current.tintR, target.tintR, alpha),
		tintG: lerp(current.tintG, target.tintG, alpha),
		tintB: lerp(current.tintB, target.tintB, alpha),
		edgeAlpha: lerp(current.edgeAlpha, target.edgeAlpha, alpha),
		pulseHz: lerp(current.pulseHz, target.pulseHz, alpha),
		bgBlurPx: lerp(current.bgBlurPx, target.bgBlurPx, alpha),
	};

	if (!impulse || impulse.strength <= 0.01) {
		return { state: base, nextImpulse: null };
	}

	const nextStrength = impulse.strength * Math.exp(-2.4 * Math.max(0, dtSec));
	const nextImpulse = nextStrength > 0.01
		? { kind: impulse.kind, strength: nextStrength }
		: null;

	return { state: base, nextImpulse };
}

/**
 * Applies a decaying emotional impulse and breathing wave on top of the smoothly
 * tracked atmosphere state for a single frame (without mutating the baseline).
 */
export function evaluateFrameAtmosphere(
	baseline: EmotionalAtmosphereParams,
	impulse: EmotionalImpulseState | null,
	clockSec: number,
	reducedMotion = false,
): EmotionalAtmosphereParams {
	const breath = reducedMotion
		? 0.5
		: 0.5 + 0.5 * Math.sin(clockSec * baseline.pulseHz * Math.PI * 2);

	let blurStrength = baseline.blurStrength + (breath - 0.5) * 1.1;
	let saturation = baseline.saturation + (breath - 0.5) * 0.05;
	let contrast = baseline.contrast;
	let brightness = baseline.brightness;
	let hueShiftDeg = baseline.hueShiftDeg;
	let edgeAlpha = baseline.edgeAlpha * (0.86 + breath * 0.28);
	let tintR = baseline.tintR;
	let tintG = baseline.tintG;
	let tintB = baseline.tintB;

	if (impulse && impulse.strength > 0.01) {
		const s = clamp(impulse.strength, 0, 1);
		switch (impulse.kind) {
			case 'shock':
				blurStrength += s * 1.8;
				contrast += s * 0.06;
				saturation += s * 0.08;
				edgeAlpha += s * 0.065;
				tintR = lerp(tintR, 0.95, s * 0.55);
				tintG = lerp(tintG, 0.24, s * 0.55);
				tintB = lerp(tintB, 0.2, s * 0.55);
				break;
			case 'euphoria':
				blurStrength += s * 1.2;
				brightness += s * 0.04;
				saturation += s * 0.09;
				hueShiftDeg += s * 4;
				edgeAlpha += s * 0.055;
				tintR = lerp(tintR, 0.98, s * 0.5);
				tintG = lerp(tintG, 0.82, s * 0.5);
				tintB = lerp(tintB, 0.3, s * 0.5);
				break;
			case 'dread':
				blurStrength += s * 1.6;
				saturation -= s * 0.09;
				brightness -= s * 0.03;
				edgeAlpha += s * 0.065;
				tintR = lerp(tintR, 0.55, s * 0.55);
				tintG = lerp(tintG, 0.14, s * 0.55);
				tintB = lerp(tintB, 0.65, s * 0.55);
				break;
			case 'climax':
				blurStrength += s * 1.9;
				contrast += s * 0.07;
				saturation += s * 0.1;
				edgeAlpha += s * 0.07;
				break;
		}
	}

	return {
		...baseline,
		blurStrength: clamp(blurStrength, 0.5, 6.5),
		hueShiftDeg: clamp(hueShiftDeg, -12, 12),
		saturation: clamp(saturation, 0.85, 1.24),
		contrast: clamp(contrast, 0.95, 1.16),
		brightness: clamp(brightness, 0.92, 1.08),
		tintR: clamp(tintR, 0, 1),
		tintG: clamp(tintG, 0, 1),
		tintB: clamp(tintB, 0, 1),
		edgeAlpha: clamp(edgeAlpha, 0.015, 0.2),
	};
}

/**
 * Multiplies two 4x5 RGBA color convolution matrices (`a * b`).
 */
function multiplyColorMatrices(a: ColorMatrixTuple, b: ColorMatrixTuple): ColorMatrixTuple {
	const out = new Array<number>(20).fill(0);
	for (let row = 0; row < 4; row += 1) {
		const r = row * 5;
		for (let col = 0; col < 5; col += 1) {
			let sum =
				a[r] * b[col]
				+ a[r + 1] * b[col + 5]
				+ a[r + 2] * b[col + 10]
				+ a[r + 3] * b[col + 15];
			if (col === 4) sum += a[r + 4];
			out[r + col] = sum;
		}
	}
	return out as ColorMatrixTuple;
}

/**
 * Builds a composed 4x5 GPU Color-Matrix Convolution tuple compatible with
 * PixiJS v8 `ColorMatrixFilter.matrix`, combining Rec.709 hue rotation,
 * saturation, contrast, and luminance bias.
 */
export function buildConvolutionalColorMatrix(
	params: Pick<EmotionalAtmosphereParams, 'hueShiftDeg' | 'saturation' | 'contrast' | 'brightness'>,
): ColorMatrixTuple {
	const rad = (params.hueShiftDeg * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);

	// Rec.709 luminance weights
	const lumR = 0.213;
	const lumG = 0.715;
	const lumB = 0.072;

	const hueMat: ColorMatrixTuple = [
		lumR + cos * (1 - lumR) + sin * (-lumR),
		lumG + cos * (-lumG) + sin * (-lumG),
		lumB + cos * (-lumB) + sin * (1 - lumB),
		0, 0,
		lumR + cos * (-lumR) + sin * 0.143,
		lumG + cos * (1 - lumG) + sin * 0.14,
		lumB + cos * (-lumB) + sin * -0.283,
		0, 0,
		lumR + cos * (-lumR) + sin * (-(1 - lumR)),
		lumG + cos * (-lumG) + sin * lumG,
		lumB + cos * (1 - lumB) + sin * lumB,
		0, 0,
		0, 0, 0, 1, 0,
	];

	const s = params.saturation;
	const sr = (1 - s) * lumR;
	const sg = (1 - s) * lumG;
	const sb = (1 - s) * lumB;
	const satMat: ColorMatrixTuple = [
		sr + s, sg, sb, 0, 0,
		sr, sg + s, sb, 0, 0,
		sr, sg, sb + s, 0, 0,
		0, 0, 0, 1, 0,
	];

	const c = params.contrast;
	const b = params.brightness;
	const scale = c * b;
	const offset = 0.5 * (1 - c);
	const toneMat: ColorMatrixTuple = [
		scale, 0, 0, 0, offset,
		0, scale, 0, 0, offset,
		0, 0, scale, 0, offset,
		0, 0, 0, 1, 0,
	];

	return multiplyColorMatrices(toneMat, multiplyColorMatrices(satMat, hueMat));
}

export function rgbToHexNumber(r: number, g: number, b: number): number {
	const ri = Math.round(clamp(r, 0, 1) * 255);
	const gi = Math.round(clamp(g, 0, 1) * 255);
	const bi = Math.round(clamp(b, 0, 1) * 255);
	return (ri << 16) | (gi << 8) | bi;
}

/**
 * Generates a subtle CSS filter string intended ONLY for `.layer-background`
 * so the painted arena backdrop shares the psychological mood while cards &
 * HUD stay 100% crisp.
 */
export function buildBackgroundCssFilter(params: EmotionalAtmosphereParams): string {
	const parts: string[] = [
		`saturate(${params.saturation.toFixed(2)})`,
		`contrast(${params.contrast.toFixed(2)})`,
		`brightness(${params.brightness.toFixed(2)})`,
	];
	if (Math.abs(params.hueShiftDeg) >= 0.5) {
		parts.push(`hue-rotate(${params.hueShiftDeg.toFixed(1)}deg)`);
	}
	if (params.bgBlurPx >= 0.15) {
		parts.push(`blur(${params.bgBlurPx.toFixed(2)}px)`);
	}
	return parts.join(' ');
}
