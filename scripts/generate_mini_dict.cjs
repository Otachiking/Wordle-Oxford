const fs = require('fs');
const path = require('path');

const fullPath = path.resolve('src/assets/full_dict.json');
const fullDict = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

const miniDict = fullDict.map(item => ({
    word: item.word,
    definition: item.definition || "",
    emoji: item.emoji || ""
}));

const miniPath = path.resolve('src/assets/mini_dict.json');
fs.writeFileSync(miniPath, JSON.stringify(miniDict, null, 2));

console.log(`Created mini_dict.json with ${miniDict.length} words containing only word, definition, and emoji.`);
