import fs from 'fs';
import path from 'path';

// Note: I will use a regex-based approach to extract the full card mapping from artMapping.ts
// specifically the CARD_ID_TO_ART record if it exists, or the combination.

const mappingFile = 'client/src/game/utils/art/artMapping.ts';
const content = fs.readFileSync(mappingFile, 'utf8');

// Regex for 'card-id': '/art/nfts/hex-id.webp' or similar
const cardMappingRegex = /["']([^"']+)["']:\s*["']\/art\/nfts\/([0-9a-f]{4}-[0-9a-z]{8})\.webp["']/g;
const idToCards = new Map();

let match;
while ((match = cardMappingRegex.exec(content)) !== null) {
  const cardId = match[1];
  const artId = match[2];
  
  const existing = idToCards.get(artId) || [];
  existing.push(cardId);
  idToCards.set(artId, existing);
}

// Also check Hero mappings from earlier turn
const heroMatch = /'([^']+)': '([0-9a-f]{4}-[0-9a-z]{8})'/g;
while ((match = heroMatch.exec(content)) !== null) {
  const heroId = match[1];
  const artId = match[2];
  if (heroId.includes('hero-') || heroId.includes('king-')) {
    const existing = idToCards.get(artId) || [];
    if (!existing.includes(heroId)) existing.push(heroId);
    idToCards.set(artId, existing);
  }
}

console.log("=== GLOBAL RAGNAROK ART AUDIT ===");
const duplicates = [];
const uniqueArtIds = Array.from(idToCards.keys());

idToCards.forEach((cards, artId) => {
  if (cards.length > 1) {
    duplicates.push({ artId, cards });
  }
});

console.log(`\n📊 STATS:`);
console.log(`- Total Unique Art IDs used: ${uniqueArtIds.length}`);
console.log(`- Total Card/Hero References: ${Array.from(idToCards.values()).flat().length}`);
console.log(`- Total Images with multiple users: ${duplicates.length}`);

if (duplicates.length > 0) {
  console.log(`\n❌ DUPLICATE USAGE DETECTED!`);
  duplicates.sort((a,b) => b.cards.length - a.cards.length).slice(0, 20).forEach(d => {
    console.log(`  - [${d.artId}] used by: ${d.cards.join(', ')}`);
  });
}

// Check for missing files
const nftFolder = 'client/public/art/nfts/';
const artFiles = new Set(fs.readdirSync(nftFolder).filter(f => f.endsWith('.webp')).map(f => f.replace('.webp', '')));
const missingFiles = uniqueArtIds.filter(id => !artFiles.has(id));

console.log(`\n❌ MISSING ART FILES: ${missingFiles.length}`);
missingFiles.forEach(id => console.log(`  - ${id}`));

// Orphan detection (Extra art)
const orphanFiles = [...artFiles].filter(id => !idToCards.has(id));
console.log(`\n♻️ ORPHAN ASSETS (Art without card): ${orphanFiles.length}`);
