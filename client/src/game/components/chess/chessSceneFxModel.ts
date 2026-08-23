export type ChessSceneFxPoint = Readonly<{
	x: number;
	y: number;
}>;

type FractalPathInput = Readonly<{
	seed: number;
	start: ChessSceneFxPoint;
	end: ChessSceneFxPoint;
	iterations: number;
	displacement: number;
	roughness?: number;
}>;

const clampUnit = (value: number): number => Math.max(0, Math.min(1, value));
const LIGHTNING_FRACTAL_DIMENSION = 1.25;
const LIGHTNING_HURST_EXPONENT = 2 - LIGHTNING_FRACTAL_DIMENSION;
const LIGHTNING_ROUGHNESS = 2 ** -LIGHTNING_HURST_EXPONENT;
const ELEMENTAL_CYCLE_SECONDS = 16;

export const getCenteredCoverTransform = (
	viewportWidth: number,
	viewportHeight: number,
	designWidth: number,
	designHeight: number,
): Readonly<{ scale: number; x: number; y: number }> => {
	const safeDesignWidth = Math.max(1, designWidth);
	const safeDesignHeight = Math.max(1, designHeight);
	const scale = Math.max(viewportWidth / safeDesignWidth, viewportHeight / safeDesignHeight);
	return {
		scale,
		x: (viewportWidth - safeDesignWidth * scale) / 2,
		y: (viewportHeight - safeDesignHeight * scale) / 2,
	};
};

export const shouldEnableRagnarokSceneFx = (realmClass: string): boolean => (
	realmClass === '' || realmClass === 'realm-midgard'
);

export const createSeededRandom = (seed: number): (() => number) => {
	let state = seed >>> 0;
	return () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 0x100000000;
	};
};

export const getAlternatingElementMix = (elapsedSeconds: number): Readonly<{ fire: number; snow: number }> => {
	const normalized = ((elapsedSeconds % ELEMENTAL_CYCLE_SECONDS) + ELEMENTAL_CYCLE_SECONDS) % ELEMENTAL_CYCLE_SECONDS;
	const wave = (Math.cos(normalized / ELEMENTAL_CYCLE_SECONDS * Math.PI * 2) + 1) / 2;
	const fire = wave * wave * (3 - 2 * wave);
	return { fire, snow: 1 - fire };
};

const displaceMidpoint = (
	start: ChessSceneFxPoint,
	end: ChessSceneFxPoint,
	random: () => number,
	displacement: number,
): ChessSceneFxPoint => {
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const length = Math.hypot(dx, dy) || 1;
	const offset = (random() * 2 - 1) * displacement;
	return {
		x: clampUnit((start.x + end.x) / 2 - dy / length * offset),
		y: clampUnit((start.y + end.y) / 2 + dx / length * offset),
	};
};

const subdividePath = (
	points: readonly ChessSceneFxPoint[],
	random: () => number,
	displacement: number,
): readonly ChessSceneFxPoint[] => (
	points.slice(0, -1).flatMap((point, index) => {
		const next = points[index + 1];
		return next ? [point, displaceMidpoint(point, next, random, displacement)] : [point];
	}).concat(points.at(-1) ?? [])
);

export const createFractalLeaderPath = ({
	seed,
	start,
	end,
	iterations,
	displacement,
	roughness = LIGHTNING_ROUGHNESS,
}: FractalPathInput): readonly ChessSceneFxPoint[] => {
	const random = createSeededRandom(seed);
	let points: readonly ChessSceneFxPoint[] = [start, end];
	let scale = Math.max(0, displacement);
	for (let iteration = 0; iteration < Math.max(1, Math.floor(iterations)); iteration += 1) {
		points = subdividePath(points, random, scale);
		scale *= clampUnit(roughness);
	}
	return points;
};

export const createThorBoltPath = (seed: number, fromLeft: boolean): readonly ChessSceneFxPoint[] => (
	createFractalLeaderPath({
		seed,
		start: { x: fromLeft ? 0.1 : 0.9, y: 0 },
		end: { x: fromLeft ? 0.2 : 0.8, y: 0.38 },
		iterations: 5,
		displacement: 0.038,
	})
);

export const createThorBoltBranches = (
	seed: number,
	fromLeft: boolean,
	leader: readonly ChessSceneFxPoint[],
): readonly (readonly ChessSceneFxPoint[])[] => {
	const branchAnchors = [10, 20];
	return branchAnchors.flatMap((pointIndex, branchIndex) => {
		const start = leader[pointIndex];
		if (!start) return [];
		const direction = branchIndex === 0 ? -1 : 1;
		return [createFractalLeaderPath({
			seed: seed + 101 + branchIndex * 79,
			start,
			end: {
				x: clampUnit(start.x + direction * (fromLeft ? 0.055 : 0.065)),
				y: clampUnit(start.y + 0.075 + branchIndex * 0.018),
			},
			iterations: 3,
			displacement: 0.016,
		})];
	});
};
