import fs from 'fs';
import path from 'path';

function getIdsFromDir(dir) {
    let ids = [];
    const items = fs.readdirSync(dir);
    items.forEach(item => {
        const fullPath = path.join(dir, item);
        if (fs.lstatSync(fullPath).isDirectory()) {
            ids = ids.concat(getIdsFromDir(fullPath));
        } else if (item.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const matches = content.match(/id:\s*([0-9]+)/g) || [];
            matches.forEach(m => ids.push(m.split(':')[1].trim()));
        }
    });
    return ids;
}

const allCardIds = [...new Set(getIdsFromDir('client/src/game/data/cardRegistry/'))];
console.log(`Unique Card IDs in Registry: ${allCardIds.length}`);

const mappingContent = fs.readFileSync('client/src/game/utils/art/artMapping.ts', 'utf8');
const missing = allCardIds.filter(id => {
    const regex = new RegExp(`['"]?${id}['"]?\\s*:`, 'g');
    return !mappingContent.match(regex);
});

console.log(`\nCards with NO entry in artMapping.ts: ${missing.length}`);
if (missing.length > 0) {
    console.log(`Sample missing IDs: ${missing.slice(0, 50).join(', ')}`);
}
