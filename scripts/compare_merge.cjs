const fs = require('fs');
const path = require('path');

const fullPath = path.resolve('src/assets/full_dict.json');
const backupPath = path.resolve('src/assets/Backup/wordbackup.json');
const csvPath = path.resolve('src/assets/word_length_stats.csv');

const fullDict = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
const backupWords = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

// Filter fullDict to get only 5 letter words map
const existing5Words = new Map();
fullDict.filter(w => w.nWord === 5).forEach(w => existing5Words.set(w.word, true));

const missingWords = [];
for (const word of backupWords) {
    if (!existing5Words.has(word)) {
        missingWords.push(word);
    }
}

console.log("=== MISSING WORDS IN OXFORD DICT VS BACKUP ===");
console.log(missingWords.join(", "));
console.log(`\nTotal missing words found: ${missingWords.length}`);

// Add to full dictionary
let addedCount = 0;
const fullMap = new Map();
fullDict.forEach(w => fullMap.set(w.word, true));

for (const word of missingWords) {
    if (!fullMap.has(word)) {
        fullDict.push({
            id: `w_bkup_${word}`,
            word: word,
            nWord: word.length,
            partOfSpeech: "unrated",
            level: "UNRATED",
            definition: "",
            emoji: ""
        });
        addedCount++;
    }
}

// Re-sort fullDict alphabetically
fullDict.sort((a, b) => a.word.localeCompare(b.word));

// Re-calculate stats
const stats = {};
for (const w of fullDict) {
    stats[w.nWord] = (stats[w.nWord] || 0) + 1;
}

// Save JSONs
fs.writeFileSync(fullPath, JSON.stringify(fullDict, null, 2));

const n5 = fullDict.filter(w => w.nWord === 5).map(({nWord, ...rest}) => rest);
const n5Path = path.resolve('src/assets/nword_5_dict.json');
fs.writeFileSync(n5Path, JSON.stringify(n5, null, 2));

// Update CSV
// Yes, CSVs don't have official comment syntax, but prefixing a line with # is conventionally accepted in many parsers
let csvContent = '# This file contains the word count for each word length\n';
csvContent += '# Merged with wordbackup.json\n';
csvContent += 'nWord,count\n';

const statsRows = Object.keys(stats)
    .map(Number)
    .sort((a, b) => a - b)
    .map(len => `${len},${stats[len]}`);

csvContent += statsRows.join('\n');
fs.writeFileSync(csvPath, csvContent);

console.log(`\n=== UPDATE COMPLETE ===`);
console.log(`Updated full_dict.json (Total: ${fullDict.length})`);
console.log(`Updated nword_5_dict.json (Total: ${n5.length})`);
console.log(`Updated word_length_stats.csv`);
