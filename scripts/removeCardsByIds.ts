#!/usr/bin/env npx tsx
/**
 * Remove card definitions by ID from registry source files.
 *
 * Uses ts-morph to locate ObjectLiteralExpression nodes whose `id` property
 * equals one of the provided numeric IDs, then removes the node along with
 * its trailing comma. Operates on whole files so a single load handles all
 * deletions for that file.
 *
 * Input: JSON file with shape:
 *   [{ "file": "<path>", "ids": [4376, 4405, 4416] }, ...]
 *
 * Run:
 *   tsx scripts/removeCardsByIds.ts <plan.json>           # dry-run preview
 *   tsx scripts/removeCardsByIds.ts <plan.json> --apply   # actually edit
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Project, SyntaxKind, type ArrayLiteralExpression, type ObjectLiteralExpression } from 'ts-morph';

interface RemovalGroup {
	readonly file: string;
	readonly ids: ReadonlyArray<number>;
}

interface RemovalResult {
	readonly file: string;
	readonly requested: ReadonlyArray<number>;
	readonly removed: ReadonlyArray<number>;
	readonly missing: ReadonlyArray<number>;
}

const readPlan = (planPath: string): ReadonlyArray<RemovalGroup> => {
	const raw = fs.readFileSync(planPath, 'utf8');
	const data = JSON.parse(raw) as unknown;
	if (!Array.isArray(data)) throw new Error('plan must be an array');
	return data.map((g: unknown) => {
		const o = g as { file: string; ids: number[] };
		return { file: o.file, ids: o.ids };
	});
};

const getIdLiteral = (obj: ObjectLiteralExpression): number | null => {
	const prop = obj.getProperty('id');
	if (!prop) return null;
	const initializer = prop.asKind(SyntaxKind.PropertyAssignment)?.getInitializer();
	if (!initializer) return null;
	const text = initializer.getText().replace(/['"]/g, '').trim();
	const n = Number(text);
	return Number.isFinite(n) ? n : null;
};

const removeCardsFromFile = (
	project: Project,
	group: RemovalGroup,
	apply: boolean,
): RemovalResult => {
	const sourceFile = project.addSourceFileAtPath(group.file);
	const wantedIds = new Set(group.ids);
	const objects = sourceFile.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression);

	type Pending = { readonly array: ArrayLiteralExpression; readonly index: number; readonly id: number };
	const pending: Pending[] = [];
	for (const obj of objects) {
		const id = getIdLiteral(obj);
		if (id === null || !wantedIds.has(id)) continue;
		const array = obj.getParentIfKind(SyntaxKind.ArrayLiteralExpression);
		if (!array) continue;
		const index = array.getElements().indexOf(obj);
		if (index < 0) continue;
		pending.push({ array, index, id });
	}

	const removed: number[] = pending.map(p => p.id);
	if (apply) {
		// Remove highest-index first per array so earlier indices remain valid.
		const sorted = [...pending].sort((a, b) => b.index - a.index);
		for (const p of sorted) p.array.removeElement(p.index);
	}

	if (apply && removed.length > 0) sourceFile.saveSync();

	const removedSet = new Set(removed);
	const missing = group.ids.filter(id => !removedSet.has(id));
	return { file: group.file, requested: group.ids, removed, missing };
};

const main = (): void => {
	const args = process.argv.slice(2);
	const planPath = args[0];
	const apply = args.includes('--apply');

	if (!planPath || !fs.existsSync(planPath)) {
		console.error('Usage: tsx scripts/removeCardsByIds.ts <plan.json> [--apply]');
		process.exit(2);
	}

	const plan = readPlan(planPath);
	const project = new Project({
		tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
		skipAddingFilesFromTsConfig: true,
	});

	const results: RemovalResult[] = [];
	for (const group of plan) {
		results.push(removeCardsFromFile(project, group, apply));
	}

	const totalRequested = results.reduce((n, r) => n + r.requested.length, 0);
	const totalRemoved = results.reduce((n, r) => n + r.removed.length, 0);
	const totalMissing = results.reduce((n, r) => n + r.missing.length, 0);

	console.log(`mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);
	console.log(`requested: ${totalRequested}, ${apply ? 'removed' : 'would-remove'}: ${totalRemoved}, missing: ${totalMissing}`);
	console.log();

	for (const r of results) {
		const rel = path.relative(process.cwd(), r.file);
		const prefix = r.removed.length > 0 ? '  ' : '  ⊘ ';
		console.log(`${prefix}${rel}`);
		if (r.removed.length) console.log(`     removed: [${r.removed.join(', ')}]`);
		if (r.missing.length) console.log(`     MISSING: [${r.missing.join(', ')}] — id not found in this file`);
	}

	if (totalMissing > 0) {
		console.error('\nWARNING: some IDs were not found. Plan may be wrong.');
		process.exit(1);
	}
};

main();
