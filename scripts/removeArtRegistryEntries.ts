#!/usr/bin/env npx tsx
/**
 * Remove orphan entries from ART_REGISTRY.
 *
 * Targets keys that the audit flagged as `art_registry_orphan`,
 * `unknown_hero_mapping` or `unknown_king_mapping` — i.e. entries that map a
 * cardId / heroId / kingId the rest of the codebase does not understand.
 *
 * Reads the ART_REGISTRY object literal in
 * `client/src/game/utils/art/artMapping.ts` and removes one property per key.
 * Asset .webp files on disk are left intact; only the mapping is dropped.
 *
 * Plan format: a JSON file with `{ "keys": ["161", "1005", "hero-baldr", ...] }`.
 *
 * Run:
 *   tsx scripts/removeArtRegistryEntries.ts <plan.json>           # dry-run
 *   tsx scripts/removeArtRegistryEntries.ts <plan.json> --apply
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

interface Plan {
	readonly keys: ReadonlyArray<string>;
}

const readPlan = (planPath: string): Plan =>
	JSON.parse(fs.readFileSync(planPath, 'utf8')) as Plan;

const findArtRegistryLiteral = (project: Project): ObjectLiteralExpression => {
	const sf = project.addSourceFileAtPath(ART_MAPPING_PATH);
	const decl = sf.getVariableDeclarationOrThrow('ART_REGISTRY');
	const init = decl.getInitializerIfKind(SyntaxKind.AsExpression)?.getExpression()
		?? decl.getInitializerOrThrow();
	if (init.getKind() !== SyntaxKind.ObjectLiteralExpression) {
		throw new Error('ART_REGISTRY is not an object literal');
	}
	return init as ObjectLiteralExpression;
};

const propertyKey = (prop: PropertyAssignment): string => {
	const name = prop.getNameNode();
	const text = name.getText();
	return text.replace(/^['"`]|['"`]$/g, '');
};

const removeKeysFromArtRegistry = (
	literal: ObjectLiteralExpression,
	wanted: ReadonlySet<string>,
	apply: boolean,
): { removed: string[]; missing: string[] } => {
	const props = literal.getProperties();
	const toRemove: { prop: PropertyAssignment; key: string }[] = [];
	for (const p of props) {
		if (p.getKind() !== SyntaxKind.PropertyAssignment) continue;
		const pa = p as PropertyAssignment;
		const k = propertyKey(pa);
		if (wanted.has(k)) toRemove.push({ prop: pa, key: k });
	}
	const removedKeys = toRemove.map(t => t.key);
	if (apply) for (const t of toRemove) t.prop.remove();
	const seen = new Set(removedKeys);
	return { removed: removedKeys, missing: [...wanted].filter(k => !seen.has(k)) };
};

const main = (): void => {
	const args = process.argv.slice(2);
	const planPath = args[0];
	const apply = args.includes('--apply');
	if (!planPath || !fs.existsSync(planPath)) {
		console.error('Usage: tsx scripts/removeArtRegistryEntries.ts <plan.json> [--apply]');
		process.exit(2);
	}
	const plan = readPlan(planPath);
	const wanted = new Set(plan.keys.map(String));

	const project = new Project({ skipAddingFilesFromTsConfig: true });
	const literal = findArtRegistryLiteral(project);
	const { removed, missing } = removeKeysFromArtRegistry(literal, wanted, apply);

	if (apply && removed.length > 0) {
		literal.getSourceFile().saveSync();
	}

	console.log(`mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);
	console.log(`requested: ${wanted.size}, ${apply ? 'removed' : 'would-remove'}: ${removed.length}, missing: ${missing.length}`);
	if (removed.length <= 30) {
		console.log(`keys: [${removed.join(', ')}]`);
	} else {
		console.log(`first 20: [${removed.slice(0, 20).join(', ')}], ...+${removed.length - 20} more`);
	}
	if (missing.length > 0) {
		console.error('MISSING:', missing);
		process.exit(1);
	}
};

main();
