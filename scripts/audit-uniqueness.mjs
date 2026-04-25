import fs from 'fs';

const mappingFile = 'client/src/game/utils/art/artMapping.ts';
const content = fs.readFileSync(mappingFile, 'utf8');

// Regex to find 'hero-x': 'hex-id' or 'king-x': 'hex-id'
const hexMatch = /'([^']+)': '([0-9a-f]{4}-[0-9a-z]{8})'/g;
const idToHeroes = new Map();

let match;
while ((match = hexMatch.exec(content)) !== null) {
  const heroId = match[1];
  const artId = match[2];
  
  const existing = idToHeroes.get(artId) || [];
  existing.push(heroId);
  idToHeroes.set(artId, existing);
}

console.log("=== RAGNAROK ART UNIQUENESS AUDIT ===");
let duplicatesFound = false;

idToHeroes.forEach((heroes, artId) => {
  if (heroes.length > 1) {
    // Filter out king/hero variants of the SAME character (e.g. hero-askr and king-askr)
    // as those are technically the same person in different slots.
    const uniqueCharacters = new Set(heroes.map(h => h.replace('hero-', '').replace('king-', '')));
    
    if (uniqueCharacters.size > 1) {
      console.log(`❌ DUPLICATE ART ID: ${artId}`);
      console.log(`   Used by: ${heroes.join(', ')}`);
      duplicatesFound = true;
    }
  }
});

if (!duplicatesFound) {
  console.log("✅ All Art IDs are unique across different characters.");
}
