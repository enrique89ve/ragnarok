#!/usr/bin/env npx tsx
/**
 * Rename card definitions by ID.
 *
 * Locates card object literals with matching `id` and replaces the `name`
 * property's string literal. Idempotent — re-running with the same plan is a
 * no-op once names already match.
 *
 * Plan format:
 *   [{ "file": "<path>", "renames": [{ "id": 197, "newName": "Shield of Asgard Token" }] }]
 *
 * Run:
 *   tsx scripts/renameCardsByIds.ts <plan.json>           # dry-run
 *   tsx scripts/renameCardsByIds.ts <plan.json> --apply   # apply
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Project, SyntaxKind, type ObjectLiteralExpression, type StringLiteral } from 'ts-morph';

interface Rename {
	readonly id: number;
	readonly newName: string;
}

interface RenameGroup {
	readonly file: string;
	readonly renames: ReadonlyArray<Rename>;
}

interface RenameResult {
	readonly file: string;
	readonly applied: ReadonlyArray<{ id: number; from: string; to: string }>;
	readonly missing: ReadonlyArray<number>;
}

const readPlan = (planPath: string): ReadonlyArray<RenameGroup> =>
	JSON.parse(fs.readFileSync(planPath, 'utf8')) as RenameGroup[];

const getId = (obj: ObjectLiteralExpression): number | null => {
	const prop = obj.getProperty('id')?.asKind(SyntaxKind.PropertyAssignment);
	const init = prop?.getInitializer();
	if (!init) return null;
	const text = init.getText().replace(/['"]/g, '').trim();
	const n = Number(text);
	return Number.isFinite(n) ? n : null;
};

const renameNameProperty = (obj: ObjectLiteralExpression, newName: string): string | null => {
	const prop = obj.getProperty('name')?.asKind(SyntaxKind.PropertyAssignment);
	const init = prop?.getInitializer();
	if (!init || init.getKind() !== SyntaxKind.StringLiteral) return null;
	const lit = init as StringLiteral;
	const before = lit.getLiteralText();
	if (before === newName) return before;
	lit.setLiteralValue(newName);
	return before;
};

const renameInFile = (project: Project, group: RenameGroup, apply: boolean): RenameResult => {
	const sourceFile = project.addSourceFileAtPath(group.file);
	const wanted = new Map(group.renames.map(r => [r.id, r.newName] as const));
	const objects = sourceFile.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression);

	const applied: { id: number; from: string; to: string }[] = [];
	const seen = new Set<number>();
	for (const obj of objects) {
		const id = getId(obj);
		if (id === null || !wanted.has(id)) continue;
		const newName = wanted.get(id)!;
		if (apply) {
			const before = renameNameProperty(obj, newName);
			if (before !== null) {
				applied.push({ id, from: before, to: newName });
				seen.add(id);
			}
		} else {
			const prop = obj.getProperty('name')?.asKind(SyntaxKind.PropertyAssignment);
			const before = prop?.getInitializer()?.getText().replace(/['"]/g, '') ?? '?';
			applied.push({ id, from: before, to: newName });
			seen.add(id);
		}
	}

	if (apply && applied.length > 0) sourceFile.saveSync();

	const missing = group.renames.filter(r => !seen.has(r.id)).map(r => r.id);
	return { file: group.file, applied, missing };
};

const main = (): void => {
	const args = process.argv.slice(2);
	const planPath = args[0];
	const apply = args.includes('--apply');
	if (!planPath || !fs.existsSync(planPath)) {
		console.error('Usage: tsx scripts/renameCardsByIds.ts <plan.json> [--apply]');
		process.exit(2);
	}

	const plan = readPlan(planPath);
	const project = new Project({ skipAddingFilesFromTsConfig: true });

	const results = plan.map(g => renameInFile(project, g, apply));

	console.log(`mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);
	for (const r of results) {
		const rel = path.relative(process.cwd(), r.file);
		console.log(`  ${rel}`);
		for (const a of r.applied) console.log(`     id=${a.id}: "${a.from}" → "${a.to}"`);
		if (r.missing.length) console.log(`     MISSING: [${r.missing.join(', ')}]`);
	}

	const totalMissing = results.reduce((n, r) => n + r.missing.length, 0);
	if (totalMissing > 0) {
		console.error('\nWARNING: some IDs were not found.');
		process.exit(1);
	}
};

main();
