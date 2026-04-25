import { cardRegistry } from './client/src/game/data/cardRegistry/index.ts';
import fs from 'fs';
import path from 'path';

const masterList = cardRegistry.map(card => `${card.id}: ${card.name}`).sort((a, b) => {
    const idA = parseInt(a.split(':')[0]);
    const idB = parseInt(b.split(':')[0]);
    return idA - idB;
});

fs.writeFileSync('MASTER_CARD_LIST.txt', masterList.join('\n'));
console.log(`Generated MASTER_CARD_LIST.txt with ${masterList.length} cards.`);
