# 05 — Determinism audit script + CI gate scaffold

**Status**: ready-for-agent
**Depends on**: nothing (parallel from day 1)
**Blocks**: 07 (RETRO + docs reference the gate)
**ADR**: [docs/adr/0004-game-protocol-deterministic-engine.md §Implementation notes](../../../docs/adr/0004-game-protocol-deterministic-engine.md#implementation-notes-non-binding)
**Decisions**: [DECISIONS.md](../DECISIONS.md) — D7 (two-scope audit), D11 (CI workflow)

---

## Goal

Ship the determinism audit script ADR §Implementation notes promised, with the two scopes resolved in D7 (AS rules + chess-hook deny list). Add the `.github/workflows/ci.yml` PR gate that wires this script (and the existing/future smoke tests) into the merge contract.

## Why

ADR §Implementation notes states: *"A new lint script `scripts/audit-wasm-determinism.mjs` will enforce these on every push. Failure blocks merge."* The script does not exist on `439ff28` (verified during the grill: `find scripts -name "*wasm*"` returns only `scripts/test-wasm-engine.mjs`). And `.github/workflows/` contains only `deploy.yml` (publish to GitHub Pages), not a PR gate — so "blocks merge" has nothing to block on today. Phase 1 closes both gaps in one workstream because they're trivially small individually and conceptually a single contract: *"determinism violations block merge"*.

This issue ships in parallel from day 1 of Phase 1 — it does not depend on issues 01–04.

## Files to touch

### NEW `scripts/audit-wasm-determinism.mjs`

```js
#!/usr/bin/env node
/**
 * audit-wasm-determinism.mjs — Phase 1 determinism gate.
 *
 * Two scopes:
 *   1. assembly/**       — AS rules (no f32/f64, no Math.random,
 *                          no Date.now, no Maps without note, etc).
 *   2. chess*Slice.ts    — chess hook deny list (no non-seeded
 *                          random, no wall clock, no timing-coupled
 *                          state mutation).
 *
 * Exit 0  → clean.
 * Exit 1  → violations found, printed file:line — rule — fix-hint.
 *
 * Wired into:
 *   - npm run audit:determinism
 *   - .github/workflows/ci.yml (PR gate)
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, relative } from 'path';

const ROOT = resolve(import.meta.dirname, '..');

const RULES = [
	{
		name: 'as-rules',
		match: (path) => path.startsWith('assembly/') && path.endsWith('.ts'),
		// Allow f32/f64 ONLY in the documented PRNG file:
		exemptions: ['assembly/util/seededRng.ts'],
		forbidden: [
			{ rx: /\bf32\b/, hint: 'use i32 / u32 instead' },
			{ rx: /\bf64\b/, hint: 'use i64 / u64 instead' },
			{ rx: /:\s*number\b/, hint: 'use explicit i32 / u32 / i64 / u64' },
			{ rx: /\bMath\.random\b/, hint: 'use seededRng.nextInt or nextFloat' },
			{ rx: /\bMath\.(?!floor|max|min|abs)\w+/, hint: 'only floor/max/min/abs allowed; document in comment if new' },
			{ rx: /\bDate\.now\b/, hint: 'no wall clock in assembly/' },
			{ rx: /\bperformance\.now\b/, hint: 'no wall clock in assembly/' },
			{ rx: /\bcrypto\./, hint: 'host-environment reach forbidden' },
			{ rx: /\bnew\s+Map\b(?![^;]*\/\/\s*audit:)/, hint: 'new Map<> requires "// audit: insertion-order required because ..."' },
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
			{ rx: /setTimeout\([^,)]+,\s*\d+\).*\b(set|setState|update|mutate)\b/, hint: 'state-mutating setTimeout couples state to wall-clock' },
		],
	},
];

function walk(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const full = resolve(dir, entry);
		const st = statSync(full);
		if (st.isDirectory()) {
			if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
			walk(full, out);
		} else if (st.isFile() && entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
			out.push(full);
		}
	}
	return out;
}

const violations = [];
for (const file of walk(ROOT)) {
	const rel = relative(ROOT, file);
	for (const rule of RULES) {
		if (!rule.match(rel)) continue;
		if (rule.exemptions.includes(rel)) continue;
		const lines = readFileSync(file, 'utf8').split('\n');
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			// Skip pure comment lines:
			if (/^\s*\/\//.test(line)) continue;
			for (const f of rule.forbidden) {
				if (f.rx.test(line)) {
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
```

### MODIFY `package.json` — add npm script

```json
"audit:determinism": "node scripts/audit-wasm-determinism.mjs",
```

(Insert near `lint:css` / `smoke:phase0`.)

### NEW `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
  push:
    branches-ignore: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    runs-on: ubuntu-latest
    env:
      NODE_OPTIONS: '--max-old-space-size=8192'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run check
      - run: npm run lint
      - run: npm run lint:css
      - run: npm run audit:determinism
      - run: npm test
      - run: npm run smoke:phase0
      # smoke:phase1 step appended by issue 06.
```

## Branch protection (manual, outside Phase 1 issue scope)

After this issue lands and is observed green on at least one PR, the repo owner manually enables branch protection on `main`:

- Require pull-request reviews: 1.
- Require status checks: `CI / check` must pass.
- Linear history (optional, recommended).

This step is **F3 in DECISIONS.md follow-ups**, not part of this issue's diff — but document the intent in the PR description.

## Acceptance criteria

1. `scripts/audit-wasm-determinism.mjs` exists and is executable.
2. `npm run audit:determinism` exits 0 on the clean tree as of `439ff28` + the parallel state of issues 01–02–03 (i.e. the new AS chess port + the new shim must not violate the audit when this issue is rebased atop them).
3. Injecting `Math.random()` into any file matching scope 1 OR scope 2 causes the audit to exit non-zero and print the violation with file:line, the rule name, and the hint.
4. `.github/workflows/ci.yml` exists and runs on PRs.
5. The first PR after this issue lands shows the `CI / check` job green.
6. `deploy.yml` is untouched.

## Non-goals (for this issue)

- No `smoke:phase1` step — that's issue 06.
- No branch-protection-rule API call — manual setup, follow-up.
- No pre-commit changes — `lint-staged.config.mjs` stays as-is (per D11 rationale).

## Commit message (suggested)

```
feat(protocol): ADR 0004 issue 05 — determinism audit + CI PR gate
```
