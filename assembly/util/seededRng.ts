/**
 * Seeded PRNG (mulberry32) + deterministic Fisher-Yates shuffle.
 * Identical to client/src/game/utils/seededRng.ts for cross-verification.
 */

export class SeededRng {
	private state: u32;

	constructor(seed: u32) {
		this.state = seed;
	}

	/** Returns a float in [0, 1) — identical to mulberry32 in TypeScript */
	next(): f64 {
		this.state = (this.state + 0x6d2b79f5) | 0;
		let t: u32 = this.state;
		t = (t ^ (t >>> 15)) * (1 | this.state);
		t = (t + ((t ^ (t >>> 7)) * (61 | t))) ^ t;
		return f64((t ^ (t >>> 14)) >>> 0) / 4294967296.0;
	}

	/** Returns an integer in [0, max) */
	nextInt(max: i32): i32 {
		return i32(Math.floor(this.next() * f64(max)));
	}

	/** Get current internal state for serialization */
	getState(): u32 {
		return this.state;
	}

	/** Restore from serialized state */
	setState(s: u32): void {
		this.state = s;
	}

	/** Create from hex seed string (takes first 8 hex chars) */
	static fromHex(hexSeed: string): SeededRng {
		let numeric: u32 = 1;
		const slice = hexSeed.length >= 8 ? hexSeed.substring(0, 8) : hexSeed;
		if (slice.length > 0) {
			numeric = u32(parseInt(slice, 16));
			if (numeric == 0) numeric = 1;
		}
		return new SeededRng(numeric);
	}
}

/** Fisher-Yates shuffle using seeded RNG — produces same order as TypeScript version */
export function seededShuffleI32(arr: i32[], rng: SeededRng): i32[] {
	const result = arr.slice(0);
	for (let i = result.length - 1; i > 0; i--) {
		const j = rng.nextInt(i + 1);
		const tmp = result[i];
		result[i] = result[j];
		result[j] = tmp;
	}
	return result;
}
