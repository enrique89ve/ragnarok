/**
 * Seeded PRNG (mulberry32) + deterministic Fisher-Yates shuffle.
 * Used by the commit-reveal seed exchange so neither P2P player controls RNG.
 */

function mulberry32(seed: number): () => number {
	let s = seed | 0;
	return () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function createSeededRng(seedHex: string): () => number {
	const numericSeed = parseInt(seedHex.slice(0, 8), 16) || 1;
	return mulberry32(numericSeed);
}

export function seededShuffle<T>(arr: T[], rng: () => number): T[] {
	const result = [...arr];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/** Proper Fisher-Yates shuffle using Math.random() (for non-P2P, single-player contexts). */
export function shuffleArray<T>(arr: T[]): T[] {
	const result = [...arr];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/** In-place Fisher-Yates shuffle using Math.random(). Mutates the array. */
export function shuffleInPlace<T>(arr: T[]): void {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
}
