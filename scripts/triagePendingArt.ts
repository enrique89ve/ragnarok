#!/usr/bin/env npx tsx
/**
 * Pending-art triage report.
 *
 * For every cardId in `scripts/pending-art.json`, scan external batch
 * exports under /mnt/c/Users/Admin/Documents/ragartdev/all_arts/ and
 * orphaned `.webp` files in `client/public/art/orphaned/` to suggest
 * candidates for reassignment.
 *
 * Output ranking:
 *   1. Direct cardId match in external dataset (highest confidence).
 *   2. Fuzzy name match against orphan annotations (token overlap >= 50%).
 *   3. Below-threshold matches (25-49%) — review manually before applying.
 *
 * The token-overlap rule explicitly avoids false positives where the only
 * shared word is a stopword like "of" / "the". See NFT_ART_PROTOCOL.md
 * §"Mismatch detection".
 *
 * Usage:
 *   npm run triage:art            # human report to stdout
 *   npm run triage:art -- --json  # machine-readable
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const EXT_ROOT = '/mnt/c/Users/Admin/Documents/ragartdev/all_arts';

const EXPORTS = [
	'Proyecto-0c1a8619/ragnarok-art-export.json',
	'ragnarok-art/ragnarok-art-export.json',
	'ragnarok-art-35/ragnarok-art-export.json',
	'ragnarok-art-691/ragnarok-art-cards.json',
	'arte 14-3/ragnarok-art/ragnarok-art-export.json',
] as const;

interface ExternalEntry {
	readonly assetId: string;
	readonly name: string;
	readonly source: string;
	readonly cardId?: string;
}

const loadExternals = (): ExternalEntry[] => {
	const out: ExternalEntry[] = [];
	for (const rel of EXPORTS) {
		const full = path.join(EXT_ROOT, rel);
		if (!fs.existsSync(full)) continue;
		const data = JSON.parse(fs.readFileSync(full, 'utf8'));
		const items: Array<{ id?: string; name?: string; filename?: string }> = Array.isArray(data)
			? data
			: ((data as { cards?: unknown[]; items?: unknown[] }).cards as Array<Record<string, string>> ?? (data as { items?: unknown[] }).items as Array<Record<string, string>> ?? []);
		for (const it of items) {
			const m = (it.filename ?? '').match(/^([0-9a-f]{4}-[0-9a-z]{8})\./i);
			if (!m || !it.name) continue;
			out.push({ assetId: m[1].toLowerCase(), name: it.name, source: rel, cardId: it.id });
		}
	}
	return out;
};

const tokenize = (s: string): Set<string> =>
	new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t.length >= 4));

const scoreNames = (a: string, b: string): number => {
	const ta = tokenize(a);
	const tb = tokenize(b);
	if (tb.size === 0) return 0;
	let m = 0;
	for (const t of tb) if (ta.has(t)) m++;
	return (m / Math.max(ta.size, tb.size)) * 100;
};

const findCardName = (cardId: string): string | null => {
	const dir = path.join(REPO_ROOT, 'client', 'src', 'game', 'data');
	const walk = (d: string): string | null => {
		for (const e of fs.readdirSync(d, { withFileTypes: true })) {
			const p = path.join(d, e.name);
			if (e.isDirectory()) {
				const r = walk(p);
				if (r) return r;
			} else if (e.name.endsWith('.ts')) {
				const txt = fs.readFileSync(p, 'utf8');
				const re = new RegExp(`id:\\s*${cardId}\\s*,[^}]*?name:\\s*['"]([^'"]+)['"]`, 's');
				const m = txt.match(re);
				if (m) return m[1];
			}
		}
		return null;
	};
	return walk(dir);
};

const main = (): void => {
	const json = process.argv.includes('--json');
	const externals = loadExternals();
	const orphans = new Set(
		fs.readdirSync(path.join(REPO_ROOT, 'client', 'public', 'art', 'orphaned'))
			.filter(f => f.endsWith('.webp'))
			.map(f => f.replace(/\.webp$/, '')),
	);
	const reg = new Set<string>();
	const mappingSrc = fs.readFileSync(
		path.join(REPO_ROOT, 'client', 'src', 'game', 'utils', 'art', 'artMapping.ts'),
		'utf8',
	);
	for (const m of mappingSrc.matchAll(/'\/art\/nfts\/([0-9a-f]{4}-[0-9a-z]{8})\.webp'/g)) {
		reg.add(m[1]);
	}

	const pending = (JSON.parse(fs.readFileSync(
		path.join(REPO_ROOT, 'scripts', 'pending-art.json'),
		'utf8',
	)) as { cardIds: number[] }).cardIds;

	const result = pending.map(id => {
		const name = findCardName(String(id)) ?? '?';
		const direct = externals.filter(e => e.cardId === String(id) && orphans.has(e.assetId));
		const fuzzy = !direct.length ? externals
			.filter(e => orphans.has(e.assetId) && !reg.has(e.assetId))
			.map(e => ({ ...e, score: scoreNames(e.name, name) }))
			.filter(e => e.score >= 25)
			.sort((a, b) => b.score - a.score)
			.slice(0, 5) : [];
		return { cardId: id, name, direct, fuzzy };
	});

	if (json) {
		process.stdout.write(JSON.stringify(result, null, 2) + '\n');
		return;
	}

	let direct = 0, highFuzzy = 0, lowFuzzy = 0, none = 0;
	console.log(`# Pending art triage — ${pending.length} cards\n`);
	for (const r of result) {
		console.log(`## ${r.cardId} ${r.name}`);
		if (r.direct.length > 0) {
			console.log(`  ✅ DIRECT: ${r.direct[0].assetId} "${r.direct[0].name}"`);
			direct++;
		} else if (r.fuzzy.length > 0 && r.fuzzy[0].score >= 50) {
			console.log(`  ⚡ FUZZY ≥50: ${r.fuzzy[0].assetId} "${r.fuzzy[0].name}" (${Math.round(r.fuzzy[0].score)}%)`);
			highFuzzy++;
		} else if (r.fuzzy.length > 0) {
			console.log(`  ⚠️  FUZZY <50: ${r.fuzzy[0].assetId} "${r.fuzzy[0].name}" (${Math.round(r.fuzzy[0].score)}%) — review manually`);
			lowFuzzy++;
		} else {
			console.log(`  ❌ no candidate — needs new art`);
			none++;
		}
	}
	console.log(`\n## Summary`);
	console.log(`  ${direct} direct cardId matches`);
	console.log(`  ${highFuzzy} high-confidence fuzzy (≥50%)`);
	console.log(`  ${lowFuzzy} low-confidence fuzzy (<50%, needs review)`);
	console.log(`  ${none} no candidate — needs new art`);
};

main();
