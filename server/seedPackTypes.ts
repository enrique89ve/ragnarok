/**
 * Seed Pack Types Script
 *
 * Populates the pack_types table with 4 pack configurations.
 * Uses ON CONFLICT for idempotent re-runs.
 *
 * Run with: pnpm exec tsx server/seedPackTypes.ts
 *   or via: pnpm run db:seed-packs
 */

import 'dotenv/config';
import { directDb } from './db';
import { PACK_DEFINITION_LIST } from '../shared/protocol-core/packCatalog';

const PACK_TYPES = PACK_DEFINITION_LIST.map((pack) => ({
	name: pack.name,
	description: pack.description,
	card_count: pack.cardCount,
	price: pack.price,
	common_slots: pack.commonSlots,
	rare_slots: pack.rareSlots,
	epic_slots: pack.epicSlots,
	wildcard_slots: pack.wildcardSlots,
	epic_chance: pack.epicChance,
	mythic_chance: pack.mythicChance,
	is_active: pack.isActive,
}));

async function seedPackTypes() {
	if (!directDb) {
		console.error('DATABASE_URL not set — cannot seed. Create a .env file (see .env.example)');
		process.exit(1);
	}

	console.log('Seeding pack types...');

	for (const pack of PACK_TYPES) {
		const keys = Object.keys(pack);
		const values = Object.values(pack);
		const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
		const updateSet = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

		await directDb.query(
			`INSERT INTO pack_types (${keys.join(', ')}) VALUES (${placeholders})
			 ON CONFLICT (name) DO UPDATE SET ${updateSet}`,
			values
		);
		console.log(`  ✓ ${pack.name} (${pack.card_count} cards, ${pack.price} gold)`);
	}

	console.log(`\nSeeded ${PACK_TYPES.length} pack types`);
	await directDb.end();
	process.exit(0);
}

seedPackTypes().catch((err) => {
	console.error('Seed failed:', err);
	process.exit(1);
});
