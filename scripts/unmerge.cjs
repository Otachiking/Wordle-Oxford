const fs = require('fs');
const path = require('path');

const fullPath = path.resolve('src/assets/full_dict.json');
const n5Path = path.resolve('src/assets/nword_5_dict.json');

const wordsToRemove = [
    "fibre", "field", "fifth", "fifty", "fight", "final", "first", "fixed", "flame", "flash", 
    "fleet", "flesh", "float", "flood", "floor", "flour", "fluid", "maker", "modal", "words"
];

let fullDict = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
let n5Dict = JSON.parse(fs.readFileSync(n5Path, 'utf8'));

fullDict = fullDict.filter(w => !wordsToRemove.includes(w.word));
n5Dict = n5Dict.filter(w => !wordsToRemove.includes(w.word));

fs.writeFileSync(fullPath, JSON.stringify(fullDict, null, 2));
fs.writeFileSync(n5Path, JSON.stringify(n5Dict, null, 2));

console.log(`Removed ${wordsToRemove.length} words.`);
console.log(`full_dict.json now has ${fullDict.length} words.`);
console.log(`nword_5_dict.json now has ${n5Dict.length} words.`);
