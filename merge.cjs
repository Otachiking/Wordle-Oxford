const fs = require('fs');
const path = require('path');

const fullPath = path.resolve('src/assets/full_dict.json');
const n5Path = path.resolve('src/assets/nword_5_dict.json');
const backupPath = path.resolve('src/assets/wordbackup.json');

const fullDict = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
const backupWords = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

// create a map of existing words
const map = new Map();
for(const w of fullDict) {
    map.set(w.word, true);
}

let added = 0;
// Merge logic
for(const word of backupWords) {
    if(!map.has(word)) {
        fullDict.push({
            id: `w_bkup_${word}`,
            word: word,
            nWord: word.length, // they are all 5 anyway
            partOfSpeech: "unknown",
            level: "UNRATED",
            definition: "",
            emoji: ""
        });
        added++;
        map.set(word, true);
    }
}

console.log(`Merged ${added} new words from wordbackup.json`);

fs.writeFileSync(fullPath, JSON.stringify(fullDict, null, 2));

const n5WordsList = fullDict
    .filter(w => w.nWord === 5)
    .map(({ nWord, ...rest }) => rest);
    
fs.writeFileSync(n5Path, JSON.stringify(n5WordsList, null, 2));
console.log(`Saved ${fullDict.length} to full_dict.json`);
console.log(`Saved ${n5WordsList.length} to nword_5_dict.json`);
