import fs from 'fs';
import path from 'path';

// Since I can't easily import the cardRegistry TS here, I'll use a hack to read the IDs
// or just look for the occurrences of art IDs in the codebase.
// Actually, I'll search for the card definitions in the src folder.

const nftFolder = 'client/public/art/nfts/';
const artFiles = new Set(fs.readdirSync(nftFolder).filter(f => f.endsWith('.webp')).map(f => f.replace('.webp', '')));

// I'll extract IDs from artMapping.ts which is the most updated bridge
const mappingFile = 'client/src/game/utils/art/artMapping.ts';
const content = fs.readFileSync(mappingFile, 'utf8');

const hexRegex = /[0-9a-f]{4}-[0-9a-z]{8}/g;
const mappedIds = new Set(content.match(hexRegex) || []);

console.log("=== RAGNAROK ASSET GAP ANALYSIS ===");
console.log(`Physical Art Files in folder: ${artFiles.size}`);
console.log(`Art IDs referenced in code: ${mappedIds.size}`);

const orphanFiles = [...artFiles].filter(id => !mappedIds.has(id));
const missingFiles = [...mappedIds].filter(id => !artFiles.has(id));

console.log(`\n❌ MISSING ART (Code references them, but file is missing): ${missingFiles.length}`);
missingFiles.forEach(id => console.log(`  - ${id}`));

console.log(`\n♻️ ORPHAN ART (Files exist but are NOT used in code): ${orphanFiles.length}`);
console.log(`  (Showing first 10: ${orphanFiles.slice(0, 10).join(', ')}...)`);

// Check Hero uniqueness specifically
const heroSectionMatch = content.match(/const HERO_ART_OVERRIDE[\s\S]*?};/);
const heroIds = heroSectionMatch ? heroSectionMatch[0].match(hexRegex) || [] : [];

console.log(`\n👑 HERO ART CHECK:`);
const missingHeroes = heroIds.filter(id => !artFiles.has(id));
console.log(`  - Heroes missing art: ${missingHeroes.length}`);
missingHeroes.forEach(id => console.log(`    Missing Hero Art ID: ${id}`));
