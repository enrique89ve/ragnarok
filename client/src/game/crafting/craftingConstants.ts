// Legacy local-Eitr constants — kept only for the dissolve/forge confirm copy
// in CollectionPage. Canonical values live in
// `shared/protocol-core/eitrEconomy.ts` (EITR_DISSOLVE_VALUES /
// EITR_FORGE_COSTS); drop this file when the UI imports the shared helpers
// directly.

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

export function getEitrValue(rarity: string): number {
	return EITR_VALUES[rarity.toLowerCase()] ?? 0;
}

export function getCraftCost(rarity: string): number {
	return CRAFT_COSTS[rarity.toLowerCase()] ?? 0;
}
