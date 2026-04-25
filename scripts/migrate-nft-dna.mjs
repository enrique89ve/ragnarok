import fs from 'fs';

const metadataPath = 'client/public/art/nfts/metadata.json';
const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

metadata.cards = metadata.cards.map(card => ({
  ...card,
  collection: card.collection || "Genesis Alpha",
  styleDNA: card.styleDNA || {
    composition: card.piece === 'pawn' ? 'creature' : 'hero',
    scale: 1.0
  }
}));

fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
console.log("Successfully updated NFT metadata with Aesthetic DNA parameters.");
