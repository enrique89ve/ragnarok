/**
 * Seed Pack Types Script
 *
 * Populates the pack_types table with 4 pack configurations.
 * Uses ON CONFLICT for idempotent re-runs.
 *
 * Run with: npx tsx server/seedPackTypes.ts
 *   or via: npm run db:seed-packs
 */

import 'dotenv/config';
import { directDb } from './db';

const PACK_TYPES = [
	{
		name: 'Starter Pack',
		description: 'A basic pack to kickstart your collection. Contains 5 cards with a chance at rare upgrades.',
		card_count: 5,
		price: 100,
		common_slots: 3,
		rare_slots: 1,
		epic_slots: 0,
		wildcard_slots: 1,
		legendary_chance: 8,
		mythic_chance: 1,
		is_active: true,
	},
	{
		name: 'Booster Pack',
		description: 'A solid 7-card pack with improved odds. Two guaranteed rares and a wildcard slot.',
		card_count: 7,
		price: 250,
		common_slots: 4,
		rare_slots: 2,
		epic_slots: 0,
		wildcard_slots: 1,
		legendary_chance: 10,
		mythic_chance: 2,
		is_active: true,
	},
	{
		name: 'Premium Pack',
		description: 'A 9-card premium pack with a guaranteed epic and two wildcard slots for mythic pulls.',
		card_count: 9,
		price: 500,
		common_slots: 4,
		rare_slots: 2,
		epic_slots: 1,
		wildcard_slots: 2,
		legendary_chance: 15,
		mythic_chance: 3,
		is_active: true,
	},
	{
		name: 'Mythic Pack',
		description: 'The ultimate pack. No commons — guaranteed epic, double wildcards with the highest mythic odds.',
		card_count: 5,
		price: 1000,
		common_slots: 0,
		rare_slots: 2,
		epic_slots: 1,
		wildcard_slots: 2,
		legendary_chance: 25,
		mythic_chance: 5,
		is_active: true,
	},
];

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
