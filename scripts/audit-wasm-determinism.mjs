#!/usr/bin/env node
/**
 * audit-wasm-determinism.mjs — Phase 1 determinism gate.
 *
 * Two scopes (per ADR 0004 §Implementation notes + DECISIONS.md D7):
 *   1. assembly/**       — AS rules (no f32/f64, no Math.random,
 *                          no Date.now, no Maps without audit marker, etc).
 *   2. chess slices      — chess hook deny list (no non-seeded random,
 *                          no wall clock, no timing-coupled state mutation).
 *
 * Under Phase 1-lite (D12) the chess-hook scope covers the runtime
 * authority (`chessCombatSlice.ts`); the regex against the future
 * `chessReducer.ts` is a no-op today and auto-activates in Phase 1.5.
 *
 * Exit 0  → clean.
 * Exit 1  → violations found, printed file:line — rule — fix-hint.
 *
 * Wired into:
 *   - npm run audit:determinism
 *   - .github/workflows/ci.yml (PR gate)
 */

import { lstatSync, readFileSync, readdirSync } from 'fs';
import { resolve, relative, sep } from 'path';

const ROOT = resolve(import.meta.dirname, '..');

function toPosix(p) {
	return sep === '/' ? p : p.split(sep).join('/');
}

const RULES = [
	{
		name: 'as-rules',
		match: (path) => path.startsWith('assembly/') && path.endsWith('.ts'),
		exemptions: ['assembly/util/seededRng.ts'],
		forbidden: [
			{ rx: /\bf32\b/, hint: 'use i32 / u32 instead' },
			{ rx: /\bf64\b/, hint: 'use i64 / u64 instead' },
			{ rx: /:\s*number\b/, hint: 'use explicit i32 / u32 / i64 / u64' },
			{ rx: /\bMath\.random\b/, hint: 'use seededRng.nextInt or nextFloat' },
			{ rx: /\bMath\.(?!floor|max|min|abs)\w+/, hint: 'only Math.floor/max/min/abs allowed; document new helpers in audit comment' },
			{ rx: /\bDate\.now\b/, hint: 'no wall clock in assembly/' },
			{ rx: /\bperformance\.now\b/, hint: 'no wall clock in assembly/' },
			{ rx: /\bcrypto\./, hint: 'host-environment reach forbidden' },
			{ rx: /\bnew\s+Map\b/, allowAuditMarker: true, hint: 'new Map<> requires "// audit: <reason insertion order is deterministic>" on the same line' },
		],
	},
	{
		name: 'chess-hooks',
		match: (path) => /client\/src\/game\/stores\/combat\/chess.*Slice\.ts$/.test(path)
			|| /client\/src\/game\/engine\/chessReducer\.ts$/.test(path),
		exemptions: [],
		forbidden: [
			{ rx: /\bMath\.random\b/, hint: 'chess hooks must be deterministic — use seeded RNG from engine' },
			{ rx: /\bDate\.now\b/, hint: 'no wall clock in chess hot path; animation timing lives in animation slice' },
			{ rx: /\bperformance\.now\b/, hint: 'no wall clock in chess hot path' },
			{ rx: /\bcrypto\.(?:getRandomValues|subtle)/, hint: 'non-seeded randomness forbidden in chess hooks' },
			{ rx: /setTimeout\([^,)]+,\s*\d+\).*\b(?:set|setState|update|mutate)\b/, hint: 'state-mutating setTimeout couples state to wall-clock' },
		],
	},
];

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);

function walk(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const full = resolve(dir, entry);
		let st;
		try {
			st = lstatSync(full);
		} catch {
			continue;
		}
		if (st.isSymbolicLink()) continue;
		if (st.isDirectory()) {
			if (SKIP_DIRS.has(entry)) continue;
			walk(full, out);
		} else if (st.isFile() && entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
			out.push(full);
		}
	}
	return out;
}

const COMMENT_LINE = /^\s*(?:\/\/|\/\*|\*)/;
const AUDIT_MARKER = /\/\/\s*audit:/;

const violations = [];
for (const file of walk(ROOT)) {
	const rel = toPosix(relative(ROOT, file));
	for (const rule of RULES) {
		if (!rule.match(rel)) continue;
		if (rule.exemptions.includes(rel)) continue;
		const lines = readFileSync(file, 'utf8').split('\n');
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (COMMENT_LINE.test(line)) continue;
			for (const f of rule.forbidden) {
				if (!f.rx.test(line)) continue;
				if (f.allowAuditMarker && AUDIT_MARKER.test(line)) continue;
				violations.push({
					file: rel,
					line: i + 1,
					rule: rule.name,
					pattern: f.rx.source,
					hint: f.hint,
					snippet: line.trim(),
				});
			}
		}
	}
}

if (violations.length === 0) {
	console.log('audit:determinism — clean (0 violations).');
	process.exit(0);
}

console.error(`audit:determinism — ${violations.length} violation(s):\n`);
for (const v of violations) {
	console.error(`  ${v.file}:${v.line}  [${v.rule}]  /${v.pattern}/`);
	console.error(`    ${v.snippet}`);
	console.error(`    → ${v.hint}\n`);
}
process.exit(1);
