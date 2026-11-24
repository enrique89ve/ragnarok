import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CAMPAIGN_REGISTRY_HASH } from './campaign/constants';
import { calculateDuatPacks } from './protocol-core/types';
import duatSnapshot from './protocol-core/duatSnapshot.json';
import {
	GenesisCollectionSchema,
	StarterCollectionSchema,
} from './schemas/collections';
import { RARITY_TABLE, type Rarity } from './schemas/rarity';

function sortKeys(value: unknown): unknown {
	if (value === null || value === undefined) return value;
	if (Array.isArray(value)) return value.map(sortKeys);
	if (typeof value === 'object') {
		const sorted: Record<string, unknown> = {};
		for (const key of Object.keys(value as Record<string, unknown>).sort()) {
			sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
		}
		return sorted;
	}
	return value;
}

describe('static data integrity', () => {
	it('keeps campaign registry hash aligned with canonical JSON', () => {
		const registryPath = path.join(process.cwd(), 'shared/campaign/campaign-registry.v1.json');
		const parsed = JSON.parse(fs.readFileSync(registryPath, 'utf8')) as unknown;
		const canonical = JSON.stringify(sortKeys(parsed));
		const digest = crypto.createHash('sha256').update(canonical).digest('hex');
		expect(digest).toBe(CAMPAIGN_REGISTRY_HASH);
	});

	it('keeps duatSnapshot internally consistent', () => {
		const snapshot = duatSnapshot as {
			frozenAt: string;
			stats: { eligibleHolders: number; totalPacks: number };
			holders: Array<{ duatRaw: number }>;
		};
		expect(snapshot.frozenAt.trim().length).toBeGreaterThan(0);
		expect(snapshot.holders.length).toBe(snapshot.stats.eligibleHolders);
		let derivedPacks = 0;
		for (const holder of snapshot.holders) {
			derivedPacks += calculateDuatPacks(holder.duatRaw);
		}
		expect(derivedPacks).toBe(snapshot.stats.totalPacks);
	});

	it('validates genesisCollection.json schema and rarity table drift', () => {
		const genesisPath = path.join(process.cwd(), 'client/public/data/genesisCollection.json');
		const parsed = JSON.parse(fs.readFileSync(genesisPath, 'utf8'));
		const genesis = GenesisCollectionSchema.parse(parsed);
		expect(genesis.cards.length).toBeGreaterThan(0);

		for (const rarity of Object.keys(RARITY_TABLE) as Rarity[]) {
			const canon = RARITY_TABLE[rarity];
			const fromFile = genesis.rarityTable[rarity];
			expect(fromFile).toBeDefined();
			expect(fromFile.supplyCap).toBe(canon.supplyCap);
			expect(fromFile.deckLimit).toBe(canon.deckLimit);
			expect(fromFile.eitrForge).toBe(canon.eitrForge);
			expect(fromFile.eitrDissolve).toBe(canon.eitrDissolve);
		}
	});

	it('validates starterCollection.json schema', () => {
		const starterPath = path.join(process.cwd(), 'client/public/data/starterCollection.json');
		const parsed = JSON.parse(fs.readFileSync(starterPath, 'utf8'));
		const starter = StarterCollectionSchema.parse(parsed);
		expect(starter.cards.length).toBeGreaterThan(0);
	});
});