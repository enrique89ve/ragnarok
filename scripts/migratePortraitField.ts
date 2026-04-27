#!/usr/bin/env npx tsx
/**
 * Migrate ART_REGISTRY hero/king mappings into the entity's `portrait` field.
 *
 * After this migration the `portrait` field on each `NorseHero` /
 * `NorseKing` entry is the single source of truth for which `.webp`
 * the entity uses; the `'hero-X':` and `'king-X':` lines in
 * `client/src/game/utils/art/artMapping.ts` become redundant and a
 * follow-up step will delete them.
 *
 * For every key in ART_REGISTRY that starts with `hero-` or `king-`:
 *   1. Extract the asset id from `/art/nfts/<id>.webp`.
 *   2. Locate the object literal `'hero-X': { ... }` in the
 *      definitions files (heroDefinitions.ts, additionalHeroes.ts,
 *      japaneseHeroes.ts, egyptianHeroes.ts, baseHeroes.ts,
 *      commonHeroes.ts, kingDefinitions.ts).
 *   3. Add or update the `portrait: '<assetId>'` property right after `id`.
 *
 * Idempotent: re-running with the same registry is a no-op.
 *
 * Run:
 *   tsx scripts/migratePortraitField.ts            # dry-run (default)
 *   tsx scripts/migratePortraitField.ts --apply    # write files
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
	Project,
	SyntaxKind,
	type ObjectLiteralExpression,
	type PropertyAssignment,
} from 'ts-morph';

const ART_MAPPING_PATH = path.join(
	process.cwd(),
	'client', 'src', 'game', 'utils', 'art', 'artMapping.ts',
);

const DEFINITION_FILES: ReadonlyArray<string> = [
	'client/src/game/data/norseHeroes/heroDefinitions.ts',
	'client/src/game/data/norseHeroes/additionalHeroes.ts',
	'client/src/game/data/norseHeroes/japaneseHeroes.ts',
	'client/src/game/data/norseHeroes/egyptianHeroes.ts',
	'client/src/game/data/norseHeroes/baseHeroes.ts',
	'client/src/game/data/norseHeroes/commonHeroes.ts',
	'client/src/game/data/norseKings/kingDefinitions.ts',
];

const ASSET_PATH_RE = /\/art\/nfts\/([0-9a-f]{4}-[0-9a-z]{8})\.webp$/;

const loadArtRegistryEntries = (): Map<string, string> => {
	const project = new Project({ skipAddingFilesFromTsConfig: true });
	const sf = project.addSourceFileAtPath(ART_MAPPING_PATH);
	const decl = sf.getVariableDeclarationOrThrow('ART_REGISTRY');
	const init = decl.getInitializerOrThrow().asKind(SyntaxKind.ObjectLiteralExpression);
	if (!init) throw new Error('ART_REGISTRY is not an object literal');
	const out = new Map<string, string>();
	for (const prop of init.getProperties()) {
		if (prop.getKind() !== SyntaxKind.PropertyAssignment) continue;
		const pa = prop as PropertyAssignment;
		const key = pa.getName().replace(/^['"`]|['"`]$/g, '');
		if (!key.startsWith('hero-') && !key.startsWith('king-')) continue;
		const value = pa.getInitializer()?.getText().replace(/['"`]/g, '') ?? '';
		const m = ASSET_PATH_RE.exec(value);
		if (m) out.set(key, m[1]);
	}
	return out;
};

const findEntityLiteral = (sf: ReturnType<Project['addSourceFileAtPath']>, entityId: string): ObjectLiteralExpression | null => {
	for (const obj of sf.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression)) {
		const idProp = obj.getProperty('id')?.asKind(SyntaxKind.PropertyAssignment);
		if (!idProp) continue;
		const text = idProp.getInitializer()?.getText().replace(/['"`]/g, '') ?? '';
		if (text === entityId) return obj;
	}
	return null;
};

const applyPortrait = (obj: ObjectLiteralExpression, assetId: string): 'added' | 'updated' | 'unchanged' => {
	const existing = obj.getProperty('portrait')?.asKind(SyntaxKind.PropertyAssignment);
	if (existing) {
		const current = existing.getInitializer()?.getText().replace(/['"`]/g, '') ?? '';
		if (current === assetId) return 'unchanged';
		existing.setInitializer(`'${assetId}'`);
		return 'updated';
	}
	const idProp = obj.getProperty('id');
	if (!idProp) {
		obj.insertPropertyAssignment(0, { name: 'portrait', initializer: `'${assetId}'` });
		return 'added';
	}
	const idIndex = obj.getProperties().indexOf(idProp);
	obj.insertPropertyAssignment(idIndex + 1, { name: 'portrait', initializer: `'${assetId}'` });
	return 'added';
};

interface FileResult {
	readonly file: string;
	readonly entries: ReadonlyArray<{ id: string; assetId: string; status: string }>;
}

const main = (): void => {
	const apply = process.argv.includes('--apply');
	const registry = loadArtRegistryEntries();
	console.log(`Loaded ${registry.size} hero/king entries from ART_REGISTRY`);

	const project = new Project({ skipAddingFilesFromTsConfig: true });
	const idsApplied = new Set<string>();
	const results: FileResult[] = [];

	for (const relPath of DEFINITION_FILES) {
		const fullPath = path.join(process.cwd(), relPath);
		if (!fs.existsSync(fullPath)) continue;
		const sf = project.addSourceFileAtPath(fullPath);
		const fileEntries: { id: string; assetId: string; status: string }[] = [];

		for (const [entityId, assetId] of registry) {
			if (idsApplied.has(entityId)) continue;
			const obj = findEntityLiteral(sf, entityId);
			if (!obj) continue;
			const status = apply ? applyPortrait(obj, assetId) : 'would-set';
			fileEntries.push({ id: entityId, assetId, status });
			idsApplied.add(entityId);
		}

		if (apply && fileEntries.some(e => e.status === 'added' || e.status === 'updated')) {
			sf.saveSync();
		}
		results.push({ file: relPath, entries: fileEntries });
	}

	const missing = [...registry.keys()].filter(id => !idsApplied.has(id));
	console.log(`mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);
	for (const r of results) {
		const counts = { added: 0, updated: 0, unchanged: 0, 'would-set': 0 } as Record<string, number>;
		for (const e of r.entries) counts[e.status] = (counts[e.status] ?? 0) + 1;
		const summary = Object.entries(counts).filter(([, n]) => n > 0).map(([k, n]) => `${k}=${n}`).join(', ');
		if (r.entries.length === 0) continue;
		console.log(`  ${r.file}: ${r.entries.length} entries (${summary})`);
	}
	if (missing.length > 0) {
		console.error(`\nNOT FOUND in any definition file (${missing.length}):`);
		for (const id of missing) console.error('  ' + id);
		process.exit(1);
	}
};

main();
