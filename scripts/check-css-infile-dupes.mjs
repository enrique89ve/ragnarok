#!/usr/bin/env node
/**
 * In-file CSS duplicate selector ratchet.
 *
 * Why: stylelint's `no-duplicate-selectors` is the right detector but it has
 * no concept of a baseline. The codebase has 115 pre-existing in-file dupes
 * across 24 files; we don't want every commit that touches one of those files
 * to fail outright, but we also don't want anyone adding NEW dupes.
 *
 * This script wraps stylelint:
 *   1. Runs stylelint --formatter=json on the given files (or whole project)
 *   2. Counts no-duplicate-selectors warnings per file
 *   3. Compares against `.css-infile-dupes-baseline.json`
 *   4. Fails if any file has MORE warnings than baseline (regression)
 *   5. Reports if any file has FEWER (cleanup progress)
 *
 * Usage:
 *   node scripts/check-css-infile-dupes.mjs                    # whole project
 *   node scripts/check-css-infile-dupes.mjs path/to/a.css ...  # specific files (lint-staged mode)
 *   node scripts/check-css-infile-dupes.mjs --baseline         # rebake baseline
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const BASELINE_PATH = resolve(REPO_ROOT, '.css-infile-dupes-baseline.json');

const args = process.argv.slice(2);
const writeBaseline = args.includes('--baseline');
const fileArgs = args.filter((a) => !a.startsWith('--'));

// Resolve target files. Either an explicit list (lint-staged mode) or the
// whole project. lint-staged passes absolute paths; normalize to repo-relative.
let targets;
if (fileArgs.length > 0) {
  targets = fileArgs.map((f) => relative(REPO_ROOT, resolve(REPO_ROOT, f)).replace(/\\/g, '/'));
} else {
  targets = await glob('client/src/**/*.css', {
    cwd: REPO_ROOT,
    ignore: ['**/node_modules/**', '**/dist/**'],
  });
}

if (targets.length === 0) {
  console.log('No CSS files to check.');
  process.exit(0);
}

// Run stylelint on the target files. We always scan the WHOLE project for
// baseline write so the baseline reflects every file; for non-baseline runs
// we only need the staged files because we compare each file independently.
const filesToScan = writeBaseline
  ? await glob('client/src/**/*.css', {
      cwd: REPO_ROOT,
      ignore: ['**/node_modules/**', '**/dist/**'],
    })
  : targets;

const result = spawnSync(
  'npx',
  ['stylelint', '--formatter=json', '--allow-empty-input', ...filesToScan],
  { cwd: REPO_ROOT, encoding: 'utf8', shell: true, maxBuffer: 50 * 1024 * 1024 }
);

// stylelint quirk: with --formatter=json, the report goes to stderr (not
// stdout) when there are warnings. Try stdout first, fall back to stderr.
let report;
const raw = result.stdout?.trim() || result.stderr?.trim() || '[]';
try {
  report = JSON.parse(raw);
} catch (e) {
  console.error('Failed to parse stylelint output:');
  console.error('stdout:', result.stdout?.slice(0, 500));
  console.error('stderr:', result.stderr?.slice(0, 500));
  process.exit(2);
}

/** @type {Object<string, number>} */
const counts = {};
for (const fileReport of report) {
  const rel = relative(REPO_ROOT, fileReport.source).replace(/\\/g, '/');
  const dupeWarnings = fileReport.warnings.filter(
    (w) => w.rule === 'no-duplicate-selectors'
  ).length;
  if (dupeWarnings > 0) counts[rel] = dupeWarnings;
}

if (writeBaseline) {
  const sorted = Object.fromEntries(
    Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))
  );
  writeFileSync(BASELINE_PATH, JSON.stringify(sorted, null, 2) + '\n');
  const total = Object.values(sorted).reduce((s, n) => s + n, 0);
  console.log(`✓ Baseline written: ${relative(REPO_ROOT, BASELINE_PATH)}`);
  console.log(`  ${Object.keys(sorted).length} files, ${total} in-file duplicates recorded.`);
  process.exit(0);
}

const baseline = existsSync(BASELINE_PATH)
  ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  : {};

// For each scanned file, compare current count to baseline.
const regressions = [];
const improvements = [];
for (const file of targets) {
  const current = counts[file] ?? 0;
  const baselineCount = baseline[file] ?? 0;
  if (current > baselineCount) {
    regressions.push({ file, current, baseline: baselineCount });
  } else if (current < baselineCount) {
    improvements.push({ file, current, baseline: baselineCount });
  }
}

if (improvements.length > 0) {
  console.log('In-file CSS duplicate cleanup progress:');
  for (const { file, current, baseline: b } of improvements) {
    console.log(`  ✓ ${file}: ${b} → ${current}  (${b - current} fixed)`);
  }
  console.log(
    `\n  Run \`npm run lint:css:dupes:infile:baseline\` to lock these in.\n`
  );
}

if (regressions.length > 0) {
  console.log(`\n✖ ${regressions.length} file(s) added new in-file duplicate selectors:\n`);
  for (const { file, current, baseline: b } of regressions) {
    console.log(`  ${file}: ${b} → ${current}  (+${current - b} new)`);
  }
  console.log(
    `\nFix: find the duplicate selector(s) in the file above and merge them\n` +
      `into a single rule. The whole point of having one definition per\n` +
      `selector is so editing a rule has predictable effects.\n` +
      `\n` +
      `Run for details:\n` +
      `  npx stylelint <file>\n`
  );
  process.exit(1);
}

if (regressions.length === 0 && improvements.length === 0) {
  console.log(`✓ In-file CSS duplicates: ${targets.length} file(s) checked, no regressions.`);
}
process.exit(0);
