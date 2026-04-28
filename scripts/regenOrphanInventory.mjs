import * as fs from 'node:fs';
import * as path from 'node:path';

const ORPHAN_DIR = 'client/public/art/orphaned';
const INVENTORY_PATH = path.join(ORPHAN_DIR, 'ORPHAN_INVENTORY.txt');

// 1. Read current files
const files = fs.readdirSync(ORPHAN_DIR)
  .filter(f => f.endsWith('.webp'))
  .sort();

// 2. Parse old inventory for legacy cardId/name annotations
const oldText = fs.existsSync(INVENTORY_PATH) ? fs.readFileSync(INVENTORY_PATH, 'utf8') : '';
const legacyMap = new Map(); // assetId -> { cardId, name }
for (const line of oldText.split('\n')) {
  const m = line.match(/^(\d+):\s+(.+?)\s+->\s+([0-9a-f]{4}-[0-9a-z]{8})\.webp\s*$/);
  if (m) legacyMap.set(m[3], { cardId: m[1], name: m[2] });
}

// 3. Compose new inventory
const annotated = [];
const unknown = [];
for (const f of files) {
  const id = f.replace(/\.webp$/, '');
  if (legacyMap.has(id)) {
    const { cardId, name } = legacyMap.get(id);
    annotated.push(`${cardId}: ${name} -> ${f}`);
  } else {
    unknown.push(f);
  }
}

const totalCount = files.length;
const annotatedCount = annotated.length;
const unknownCount = unknown.length;

const out = `Orphaned Art Inventory (${totalCount} files)

Art retired from /art/nfts/ — no current entity (card, hero, king) references them.
Preserved here for potential revival; the audit treats /art/orphaned/ as out of scope.
The legacy cardId / name annotations come from external batch exports — they
are hints, not bindings. Use \`npm run audit:art -- --search "<term>"\` to find
matches when assigning art to a new card.

── With legacy intent (${annotatedCount}) ──
${annotated.join('\n')}

── Provenance unknown (${unknownCount}) ──
${unknown.join('\n')}
`;

fs.writeFileSync(INVENTORY_PATH, out);
console.log(`Total: ${totalCount} (annotated: ${annotatedCount}, unknown: ${unknownCount})`);
