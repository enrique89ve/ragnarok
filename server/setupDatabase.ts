/**
 * Database Setup Orchestrator
 *
 * One-command setup that:
 * 1. Pushes schema to PostgreSQL via Drizzle Kit
 * 2. Creates a test user
 * 3. Seeds pack types (4 configurations)
 * 4. Seeds card supply (~1,400+ cards + heroes targeting 3.3M total)
 *
 * Run with: npx tsx server/setupDatabase.ts
 *   or via: npm run db:setup
 */

import 'dotenv/config';
import { execSync } from 'child_process';

async function setup() {
	console.log('╔══════════════════════════════════════╗');
	console.log('║   Norse Mythos — Database Setup      ║');
	console.log('╚══════════════════════════════════════╝\n');

	if (!process.env.DATABASE_URL) {
		console.error('ERROR: DATABASE_URL not set in .env');
		console.error('Make sure PostgreSQL is running and .env exists.');
		console.error('See .env.example for the expected format.');
		process.exit(1);
	}

	// Step 1: Push schema
	console.log('Step 1/4: Pushing schema to database...');
	try {
		execSync('npx drizzle-kit push', { stdio: 'inherit' });
	} catch {
		console.error('Schema push failed. Is PostgreSQL running?');
		console.error('Try: docker compose up -d');
		process.exit(1);
	}

	// Step 2: Create test user
	console.log('\nStep 2/4: Creating test user...');
	try {
		const { directDb } = await import('./db');
		if (directDb) {
			await directDb.query(
				`INSERT INTO users (username, password) VALUES ('testuser', 'testpass')
				 ON CONFLICT (username) DO NOTHING`
			);
			console.log('  ✓ Test user ready (username: testuser)');
		}
	} catch (err: any) {
		console.warn('  Warning: Could not create test user:', err.message);
	}

	// Step 3: Seed pack types
	console.log('\nStep 3/4: Seeding pack types...');
	try {
		execSync('npx tsx server/seedPackTypes.ts', { stdio: 'inherit' });
	} catch {
		console.error('Pack type seeding failed.');
		process.exit(1);
	}

	// Step 4: Seed card supply
	console.log('\nStep 4/4: Seeding card supply (this may take a moment)...');
	try {
		execSync('npx tsx server/seedCardSupply.ts', { stdio: 'inherit' });
	} catch {
		console.error('Card supply seeding failed.');
		process.exit(1);
	}

	console.log('\n╔══════════════════════════════════════╗');
	console.log('║   Setup Complete!                    ║');
	console.log('╠══════════════════════════════════════╣');
	console.log('║   npm run dev    → Start server      ║');
	console.log('║   localhost:5000/packs → Open packs   ║');
	console.log('╚══════════════════════════════════════╝');
}

setup().catch((err) => {
	console.error('Setup failed:', err);
	process.exit(1);
});
