import fs from 'fs';
import path from 'path';

// Load metadata
const metadataPath = 'client/public/art/nfts/metadata.json';
const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

// Extract character names from metadata
const nftCharacters = new Set();
metadata.cards.forEach(card => {
  nftCharacters.add(card.character);
});

// Playable Heroes from code (manually synced for this analysis)
const heroes = [
  'hero-odin', 'hero-thor', 'hero-loki', 'hero-freya', 'hero-bragi', 'hero-eir',
  'hero-forseti', 'hero-idunn', 'hero-sol', 'hero-kvasir', 'hero-skadi', 'hero-heimdall',
  'hero-zeus', 'hero-athena', 'hero-hades', 'hero-poseidon', 'hero-tyr', 'hero-vidar',
  'hero-frigg', 'hero-frey', 'hero-gullveig', 'hero-sinmara', 'hero-mani', 'hero-hoder',
  'hero-gefjon', 'hero-gerd', 'hero-sigyn', 'hero-ullr', 'hero-njord', 'hero-ragnar',
  'hero-bjorn', 'hero-lagertha', 'hero-ivar', 'hero-rollo', 'hero-leif', 'hero-erik',
  'hero-leif-wayfinder', 'hero-askr', 'hero-embla', 'hero-fjorgyn', 'hero-volva',
  'hero-verdandi', 'hero-lirien', 'hero-solvi', 'hero-ylva', 'hero-fjora', 'hero-eldrin',
  'hero-magni', 'hero-myrka', 'hero-logi', 'hero-izanami', 'hero-tsukuyomi', 'hero-fujin',
  'hero-sarutahiko', 'hero-kamimusubi', 'hero-ammit', 'hero-maat', 'hero-serqet',
  'hero-khepri', 'hero-helios', 'hero-selene', 'hero-perseus', 'hero-prometheus',
  'hero-blainn', 'hero-ran'
];

// Playable Kings from code
const kings = [
  'king-leif', 'king-askr', 'king-embla', 'king-ymir', 'king-buri', 'king-surtr',
  'king-borr', 'king-yggdrasil', 'king-audumbla', 'king-gaia', 'king-brimir',
  'king-ginnungagap', 'king-tartarus', 'king-uranus'
];

// Mappings from artMapping.ts
const HERO_TO_CHARACTER = {
  'hero-odin': 'odin', 'hero-thor': 'thor', 'hero-loki': 'loki', 'hero-freya': 'freya',
  'hero-bragi': 'bragi', 'hero-eir': 'eir', 'hero-forseti': 'forseti', 'hero-idunn': 'idun',
  'hero-sol': 'sol', 'hero-kvasir': 'kvasir', 'hero-skadi': 'skadi', 'hero-heimdall': 'heimdallr',
  'hero-zeus': 'odin', 'hero-athena': 'frigg', 'hero-hades': 'hel', 'hero-poseidon': 'aegir',
  'hero-tyr': 'tyr', 'hero-vidar': 'vidarr', 'hero-frigg': 'frigg', 'hero-frey': 'freyr',
  'hero-gullveig': 'gullveig', 'hero-sinmara': 'sinmara', 'hero-mani': 'mani', 'hero-hoder': 'hodr',
  'hero-gefjon': 'gefjon', 'hero-gerd': 'gerd', 'hero-sigyn': 'sigyn', 'hero-ullr': 'ullr',
  'hero-njord': 'nerthus', 'hero-ragnar': 'ragnar-lothbrok', 'hero-bjorn': 'bjorn-ironside',
  'hero-lagertha': 'lagertha', 'hero-ivar': 'ivar-the-boneless', 'hero-rollo': 'rollo',
  'hero-leif': 'leif-erikson', 'hero-erik': 'erik-the-red', 'hero-leif-wayfinder': 'leif-erikson',
  'hero-askr': 'askr', 'hero-embla': 'embla', 'hero-fjorgyn': 'frigg', 'hero-volva': 'hyndla',
  'hero-verdandi': 'nornweaver', 'hero-lirien': 'drofn', 'hero-solvi': 'sigurd-ring',
  'hero-ylva': 'ulfhednar', 'hero-fjora': 'skadi', 'hero-eldrin': 'glod', 'hero-magni': 'thrud',
  'hero-myrka': 'hel', 'hero-logi': 'sinmara', 'hero-izanami': 'hel', 'hero-tsukuyomi': 'mani',
  'hero-fujin': 'vedrskyruler', 'hero-sarutahiko': 'heimdallr', 'hero-kamimusubi': 'bestla',
  'hero-ammit': 'nott', 'hero-maat': 'forseti', 'hero-serqet': 'helsilk', 'hero-khepri': 'runestonebeetle',
  'hero-helios': '0dc0-t8g7ugzd', 'hero-selene': 'nott', 'hero-perseus': '8159-7d41a656',
  'hero-prometheus': '5dcd-o15t632m', 'hero-blainn': '23a5-lrnxovtk', 'hero-ran': 'blodughadda'
};

const KING_TO_CHARACTER = {
  'king-leif': 'leif-erikson', 'king-askr': 'askr', 'king-embla': 'embla', 'king-ymir': 'ymir',
  'king-buri': 'thrudgelmir', 'king-surtr': 'surtr', 'king-borr': 'borr',
  'king-yggdrasil': 'yggdrasilram', 'king-audumbla': 'audumbla-cow', 'king-gaia': 'gaia',
  'king-brimir': 'brimir', 'king-ginnungagap': 'ginnungagap-void', 'king-tartarus': 'helsilk',
  'king-uranus': 'asgardeagle'
};

const CHARACTER_ART_IDS = {
  'audumbla-cow': 'king-audumbla',
  'ginnungagap-void': 'king-ginnungagap',
  'gaia': 'c838-ebed9878',
  'brimir': 'b1f2-3e7dd08d'
};

console.log("=== RAGNAROK CHARACTER NFT AUDIT ===");
const missing = [];
const proxies = [];

[...heroes, ...kings].forEach(id => {
  const charName = HERO_TO_CHARACTER[id] || KING_TO_CHARACTER[id];
  
  if (!charName) {
    missing.push({ id, reason: "No mapping found in artMapping.ts" });
    return;
  }

  // Check if it's a direct ID or a character name
  const isDirectId = /^[0-9a-f]{4}-[0-9a-z]{8}$/i.test(charName);
  
  if (isDirectId) {
    const exists = metadata.cards.some(c => c.id === charName);
    if (!exists) missing.push({ id, charName, reason: "Direct ID not found in metadata" });
    return;
  }

  // Check if character exists in metadata
  if (nftCharacters.has(charName)) {
    // Check if the game ID matches the character name (Exact)
    const exactName = id.replace('hero-', '').replace('king-', '');
    if (exactName !== charName && !['leif', 'erik', 'odin', 'thor', 'loki'].includes(exactName)) {
      proxies.push({ id, charName });
    }
  } else {
    // Check if it's in CHARACTER_ART_IDS but not metadata character field
    const altId = CHARACTER_ART_IDS[charName];
    if (altId) {
        if (/^[0-9a-f]{4}-[0-9a-z]{8}$/i.test(altId)) {
            const exists = metadata.cards.some(c => c.id === altId);
            if (exists) return;
        }
    }
    missing.push({ id, charName, reason: "Character name not found in metadata" });
  }
});

console.log("\n❌ MISSING FINAL NFT ART (Placeholders/Faulty):");
missing.forEach(m => console.log(`- ${m.id} (${m.charName || 'N/A'}): ${m.reason}`));

console.log("\n🎭 HEROES USING THEMATIC PROXIES (Encaja por tema, pero no es arte único):");
proxies.forEach(p => console.log(`- ${p.id} uses ${p.charName}`));

const usedInGame = new Set([...Object.values(HERO_TO_CHARACTER), ...Object.values(KING_TO_CHARACTER)]);
const remainingNfts = [...nftCharacters].filter(c => !usedInGame.has(c));

console.log(`\n💎 UNUSED CHARACTER NFTS (Available for new heroes/kings): ${remainingNfts.length}`);
console.log(remainingNfts.join(", "));
