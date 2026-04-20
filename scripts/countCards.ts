import { cardRegistry } from '../client/src/game/data/cardRegistry/index.ts';

const collectible = cardRegistry.filter((c: any) => c.collectible !== false);
const nonCollectible = cardRegistry.filter((c: any) => c.collectible === false);

const byRarity: Record<string, number> = {};
const byType: Record<string, number> = {};
const byClass: Record<string, number> = {};
for (const c of collectible) {
	const r = (c as any).rarity || 'unknown';
	const t = (c as any).type || 'unknown';
	const cl = (c as any).class || (c as any).heroClass || 'Neutral';
	byRarity[r] = (byRarity[r] || 0) + 1;
	byType[t] = (byType[t] || 0) + 1;
	byClass[cl] = (byClass[cl] || 0) + 1;
}

console.log('Total cards:', cardRegistry.length);
console.log('Collectible:', collectible.length);
console.log('Non-collectible:', nonCollectible.length);
console.log('\nBy rarity:', JSON.stringify(byRarity, null, 2));
console.log('\nBy type:', JSON.stringify(byType, null, 2));
console.log('\nBy class:', JSON.stringify(byClass, null, 2));

const CAPS: Record<string, number> = { mythic: 250, epic: 500, rare: 1000, common: 2000 };
let totalSupply = 0;
for (const [r, count] of Object.entries(byRarity)) {
	const cap = CAPS[r] || 0;
	if (cap > 0) {
		totalSupply += count * cap;
		console.log(`${r}: ${count} cards x ${cap} copies = ${(count * cap).toLocaleString()}`);
	}
}
console.log('\nTotal NFT supply:', totalSupply.toLocaleString());
