export const EITR_VALUES: Record<string, number> = {
	basic: 0,
	common: 5,
	rare: 20,
	epic: 100,
	mythic: 400,
};

export const CRAFT_COSTS: Record<string, number> = {
	common: 40,
	rare: 100,
	epic: 400,
	mythic: 1600,
};

export const GOLDEN_MULTIPLIER = 4;

export function getEitrValue(rarity: string): number {
	return EITR_VALUES[rarity.toLowerCase()] ?? 0;
}

export function getCraftCost(rarity: string, golden = false): number {
	const base = CRAFT_COSTS[rarity.toLowerCase()] ?? 0;
	return golden ? base * GOLDEN_MULTIPLIER : base;
}
