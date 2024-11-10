import {compilePack, extractPack} from '@foundryvtt/foundryvtt-cli';
let packs = [
    'santana',
    'kaldor'
];
for (let i of packs) {
    await compilePack('./packData/' + i, './packs/' + i, {'log': true});
}