import { seededRngFromString } from '../../utils/seededRng';

export type EffectRandom = {
	next: () => number;
	int: (minInclusive: number, maxInclusive: number) => number;
	pick: <T>(values: readonly T[]) => T;
	weightedPick: <T>(values: readonly WeightedChoice<T>[]) => T;
	jitter: (maximumAbsoluteValue: number) => number;
};

export type WeightedChoice<T> = {
	readonly value: T;
	readonly weight: number;
};

function assertFiniteInteger(value: number, name: string): void {
	if (!Number.isSafeInteger(value)) {
		throw new Error(`[EffectRandom] ${name} must be a safe integer.`);
	}
}

function assertNonNegativeFinite(value: number, name: string): void {
	if (!Number.isFinite(value) || value < 0) {
		throw new Error(`[EffectRandom] ${name} must be a finite non-negative number.`);
	}
}

/**
 * Creates a deterministic random stream for one visual effect.
 *
 * The seed must be an effect identity, never a gameplay input chosen by the
 * renderer. This keeps visual variety reproducible without coupling it to
 * cards, damage, turns, or the match RNG stream.
 */
export function createEffectRandom(seed: string): EffectRandom {
	if (seed.trim().length === 0) {
		throw new Error('[EffectRandom] seed must not be empty.');
	}

	const seeded = seededRngFromString(`visual-effect:${seed}`);
	const next = (): number => seeded();

	const int = (minInclusive: number, maxInclusive: number): number => {
		assertFiniteInteger(minInclusive, 'minInclusive');
		assertFiniteInteger(maxInclusive, 'maxInclusive');
		if (maxInclusive < minInclusive) {
			throw new Error('[EffectRandom] maxInclusive must be >= minInclusive.');
		}
		return minInclusive + Math.floor(next() * (maxInclusive - minInclusive + 1));
	};

	const pick = <T>(values: readonly T[]): T => {
		if (values.length === 0) {
			throw new Error('[EffectRandom] cannot pick from an empty collection.');
		}
		return values[int(0, values.length - 1)];
	};

	const weightedPick = <T>(values: readonly WeightedChoice<T>[]): T => {
		if (values.length === 0) {
			throw new Error('[EffectRandom] cannot weighted-pick from an empty collection.');
		}
		const totalWeight = values.reduce((total, choice) => {
			if (!Number.isFinite(choice.weight) || choice.weight <= 0) {
				throw new Error('[EffectRandom] every weight must be finite and > 0.');
			}
			return total + choice.weight;
		}, 0);

		let cursor = next() * totalWeight;
		for (const choice of values) {
			cursor -= choice.weight;
			if (cursor < 0) return choice.value;
		}
		return values[values.length - 1].value;
	};

	const jitter = (maximumAbsoluteValue: number): number => {
		assertNonNegativeFinite(maximumAbsoluteValue, 'maximumAbsoluteValue');
		return (next() * 2 - 1) * maximumAbsoluteValue;
	};

	return { next, int, pick, weightedPick, jitter };
}
