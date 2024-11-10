import {compilePack, extractPack} from '@foundryvtt/foundryvtt-cli';
let itemPacks = [
    'santana',
    'kaldor'
];
let actorPacks = []
for (let i of itemPacks) {
    await extractPack('packs/' + i, 'packData/' + i, {'log': true, 'documentType': 'Item', transformEntry: (entry) => {delete entry._stats; delete entry.sort; delete entry.ownership;}});
}
for (let i of actorPacks) {
    await extractPack('packs/' + i, 'packData/' + i, {'log': true, 'documentType': 'Actor', transformEntry: (entry) => {delete entry._stats; delete entry.sort; delete entry.ownership;}});
}