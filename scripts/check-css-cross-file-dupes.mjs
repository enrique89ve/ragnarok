#!/usr/bin/env node
/**
 * Cross-file CSS duplicate selector checker.
 *
 * Why: stylelint's `no-duplicate-selectors` only catches duplicates within a
 * SINGLE file. The bigger pain in this codebase is the same selector defined
 * across MANY files (e.g. `.battlefield-hero-square` defined in 8 places),
 * which causes "I edited the rule and nothing changed" because a different
 * file's rule wins the cascade.
 *
 * This script complements stylelint by failing the build if any selector is
 * defined in more than one file. Pre-commit + CI run this on every CSS commit.
 *
 * Token-only rules are treated as a scope layer, not a competing declaration
 * layer. This lets a component keep its semantic aliases in `tokens.css`
 * while its visual rules stay in the component stylesheet.
 *
 * Usage:
 *   node scripts/check-css-cross-file-dupes.mjs                # whole client/src/
 *   node scripts/check-css-cross-file-dupes.mjs --files a.css  # only listed files
 *   node scripts/check-css-cross-file-dupes.mjs --baseline     # write baseline
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const BASELINE_PATH = resolve(REPO_ROOT, '.css-cross-file-dupes-baseline.json');

const args = process.argv.slice(2);
const writeBaseline = args.includes('--baseline');
const filesIdx = args.indexOf('--files');
// `--files` filters WHICH dupes are reported (only those touching the listed
// files), but the scan ALWAYS covers the whole project. Otherwise lint-staged
// would miss dupes where the staged file references a selector defined in an
// unstaged file.
const filterFiles = filesIdx >= 0 ? args.slice(filesIdx + 1).map((f) => f.replace(/\\/g, '/')) : null;

/**
 * Extract selectors from a CSS file. We deliberately use a simple regex parser
 * — full PostCSS would be more correct but adds 200ms × 100 files of overhead
 * for a pre-commit hook. Selectors inside @media / @supports / @keyframes are
 * still extracted as-is; that's intentional (we want to catch them too).
 */
function splitSelectorList(selector) {
  const parts = [];
  let start = 0;
  let parentheses = 0;
  let brackets = 0;
  let quote = null;
  let escaped = false;

  for (let index = 0; index < selector.length; index += 1) {
    const char = selector[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '(') {
      parentheses += 1;
    } else if (char === ')') {
      parentheses = Math.max(0, parentheses - 1);
    } else if (char === '[') {
      brackets += 1;
    } else if (char === ']') {
      brackets = Math.max(0, brackets - 1);
    } else if (char === ',' && parentheses === 0 && brackets === 0) {
      parts.push(selector.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(selector.slice(start));
  return parts;
}

function extractRuleData(css) {
  // Strip comments
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  // Find all "selector { ... }" blocks. The selector is everything before {.
  // Skip @-rules whose body isn't a declaration block (@import, @charset, @namespace).
  const selectors = new Set();
  const tokenOnlySelectors = new Set();
  const re = /([^{}@][^{}]*?)\s*\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    let sel = m[1].trim();
    if (!sel) continue;
    // Skip if this looks like the inside of a @keyframes (e.g. "from", "0%", "50%")
    if (/^(from|to|\d+%(\s*,\s*\d+%)*)$/i.test(sel)) continue;
    // Skip @-rule headers (we already excluded them in the regex but be safe)
    if (sel.startsWith('@')) continue;
    // Normalize: collapse whitespace, strip trailing commas
    sel = sel.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',');
    // Split only top-level selector lists. Commas inside :is(), :where(),
    // attribute selectors, or another functional pseudo-class are part of the
    // same selector and must not become false cross-file duplicates.
    const parts = splitSelectorList(sel)
      .map((part) => part.trim())
      .filter(Boolean);
    const declarations = m[2]
      .split(';')
      .map((declaration) => declaration.trim())
      .filter(Boolean);
    const tokenOnly = declarations.length > 0 && declarations.every((declaration) => /^--[\w-]+\s*:/.test(declaration));

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      selectors.add(trimmed);
      if (tokenOnly) tokenOnlySelectors.add(trimmed);
      else tokenOnlySelectors.delete(trimmed);
    }
  }
  return { selectors, tokenOnlySelectors };
}

// Always scan the entire project — cross-file detection requires the full set.
const cssGlob = await glob('client/src/**/*.css', {
  cwd: REPO_ROOT,
  ignore: ['**/node_modules/**', '**/dist/**'],
});

/** @type {Map<string, string[]>} selector -> list of files defining it */
const selectorToFiles = new Map();
const selectorToTokenOnlyFiles = new Map();

for (const file of cssGlob) {
  const abs = resolve(REPO_ROOT, file);
  const css = readFileSync(abs, 'utf8');
  const { selectors, tokenOnlySelectors } = extractRuleData(css);
  for (const sel of selectors) {
    if (!selectorToFiles.has(sel)) selectorToFiles.set(sel, []);
    const list = selectorToFiles.get(sel);
    if (!list.includes(file)) list.push(file);
  }
  for (const sel of tokenOnlySelectors) {
    if (!selectorToTokenOnlyFiles.has(sel)) selectorToTokenOnlyFiles.set(sel, []);
    const list = selectorToTokenOnlyFiles.get(sel);
    if (!list.includes(file)) list.push(file);
  }
}

const dupes = new Map();
for (const [sel, files] of selectorToFiles) {
  const tokenOnlyFiles = selectorToTokenOnlyFiles.get(sel) ?? [];
  const declarationFiles = files.filter((file) => !tokenOnlyFiles.includes(file));
  if (files.length > 1 && declarationFiles.length > 1) dupes.set(sel, files);
}

// Build a stable signature for baseline comparison.
const sortedDupes = Object.fromEntries(
  [...dupes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sel, files]) => [sel, [...files].sort()])
);

if (writeBaseline) {
  writeFileSync(BASELINE_PATH, JSON.stringify(sortedDupes, null, 2) + '\n');
  console.log(`✓ Baseline written: ${relative(REPO_ROOT, BASELINE_PATH)}`);
  console.log(`  ${dupes.size} cross-file duplicate selectors recorded.`);
  process.exit(0);
}

// Compare against baseline if it exists.
let baseline = {};
if (existsSync(BASELINE_PATH)) {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
}

// Normalize the --files filter to repo-relative forward-slash paths so it
// matches whatever git/lint-staged hands us (Windows backslashes, absolute
// paths, etc.).
const normalizedFilter = filterFiles
  ? filterFiles.map((f) => {
      const resolved = resolve(REPO_ROOT, f);
      return relative(REPO_ROOT, resolved).replace(/\\/g, '/');
    })
  : null;

const newDupes = [];
for (const [sel, files] of Object.entries(sortedDupes)) {
  const baselineFiles = baseline[sel];

  // Determine what's "new" relative to baseline.
  let kind, isNew;
  if (!baselineFiles) {
    kind = 'NEW SELECTOR';
    isNew = true;
  } else {
    const newFiles = files.filter((f) => !baselineFiles.includes(f));
    if (newFiles.length > 0) {
      kind = `NEW FILE: ${newFiles.join(', ')}`;
      isNew = true;
    } else {
      isNew = false;
    }
  }
  if (!isNew) continue;

  // If --files filter is active, only report dupes that involve a filtered file.
  if (normalizedFilter && !files.some((f) => normalizedFilter.includes(f))) {
    continue;
  }

  newDupes.push({ sel, files, kind });
}

const total = dupes.size;
const baselineCount = Object.keys(baseline).length;
const fixedSinceBaseline = baselineCount - (total - newDupes.length);

console.log(`Cross-file CSS selector audit:`);
console.log(`  Total cross-file duplicates: ${total}`);
console.log(`  Baseline count:              ${baselineCount}`);
if (fixedSinceBaseline > 0) {
  console.log(`  ✓ Fixed since baseline:      ${fixedSinceBaseline}`);
}

if (newDupes.length > 0) {
  console.log(`\n✖ ${newDupes.length} NEW cross-file duplicate(s) introduced:\n`);
  for (const { sel, files, kind } of newDupes) {
    console.log(`  ${sel}  [${kind}]`);
    for (const f of files) console.log(`    - ${f}`);
  }
  console.log(
    `\nFix: consolidate the selector into ONE file. If you legitimately need\n` +
      `the same selector in two files, refactor so the common parts live\n` +
      `together (e.g. base rule in zones.css consumed via CSS variables).\n` +
      `\n` +
      `If this is intentional and you understand the cascade implications,\n` +
      `update the baseline:\n` +
      `  node scripts/check-css-cross-file-dupes.mjs --baseline\n`
  );
  process.exit(1);
}

console.log(`\n✓ No new cross-file duplicates.`);
process.exit(0);
