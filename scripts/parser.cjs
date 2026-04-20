const fs = require('fs');
const path = require('path');

const inputPath = path.resolve('Data/newOxfordMerge.txt');
const rawText = fs.readFileSync(inputPath, 'utf8');

// Pre-process: join continuation lines (lines that start with whitespace or don't have a word at the start)
const rawLines = rawText.split(/\r?\n/);
const mergedLines = [];

for (let line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if this line starts with a word (lowercase letter) - meaning it's a new entry
    // If it starts with a POS descriptor (adj., adv., n., v., etc.) it's a continuation
    const startsWithWord = /^[a-zA-Z]/.test(trimmed);
    const looksLikeContinuation = /^[a-z]+\.\s?[A-C][1-2]/.test(trimmed);

    if (looksLikeContinuation && mergedLines.length > 0) {
        // Append to previous line
        mergedLines[mergedLines.length - 1] += ' ' + trimmed;
    } else {
        mergedLines.push(trimmed);
    }
}

const results = [];
const wordMap = new Map(); // Track dupes

for (let line of mergedLines) {
    // Extract the first word token (strip numeric suffixes like close1, close2, can1, can2)
    const wordMatch = line.match(/^([a-zA-Z][a-zA-Z\-]*\d*)\s/);
    if (!wordMatch) continue;

    let rawWord = wordMatch[1];
    // Strip trailing digits (close1 -> close)
    const word = rawWord.replace(/\d+$/, '').toLowerCase();

    // Minimum 4 chars
    if (word.length < 4) continue;
    // Only pure alphabetical
    if (!/^[a-z]+$/.test(word)) continue;

    // Skip if already added
    if (wordMap.has(word)) continue;

    // Extract CEFR level: find first occurrence of A1, A2, B1, B2, C1, C2
    // Handle both "adj. A2" and "adj.B1"
    const levelMatch = line.match(/([A-C][1-2])/);
    if (!levelMatch) continue;
    const level = levelMatch[1];

    // Extract Part of Speech: text between word and first level
    // First, remove the word from the start
    let remaining = line.slice(wordMatch[0].length).trim();
    // Take text BEFORE the first CEFR code
    const posSection = remaining.split(/[A-C][1-2]/)[0];
    
    // Clean up partOfSpeech: remove trailing commas, dots, spaces
    let partOfSpeech = posSection
        .replace(/\(.*?\)/g, '') // remove parentheticals
        .replace(/[,\.]+$/, '')
        .trim()
        // Normalize common abbreviations
        .replace(/\bv\b/g, 'verb')
        .replace(/\bn\b/g, 'noun')
        .replace(/\badj\b/g, 'adj')
        .replace(/\badv\b/g, 'adv')
        .replace(/\bprep\b/g, 'prep')
        .replace(/\bpron\b/g, 'pron')
        .replace(/\bconj\b/g, 'conj')
        .replace(/\bdet\b/g, 'det')
        .replace(/\bexclam\b/g, 'exclam')
        .replace(/\bmodal\b/g, 'modal')
        .replace(/\bauxiliary\b/g, 'aux')
        .replace(/\bnumber\b/g, 'number')
        .replace(/\barticle\b/g, 'article')
        .replace(/\s+/g, ' ')
        .trim();

    // Handle edge case where POS is empty (e.g. when level was directly attached)
    if (!partOfSpeech || /^[A-C][1-2]/.test(partOfSpeech)) {
        partOfSpeech = 'unknown';
    }

    results.push({
        id: `w_${word}`,
        word: word,
        nWord: word.length,
        partOfSpeech: partOfSpeech,
        level: level,
        definition: "",
        emoji: ""
    });

    wordMap.set(word, true);
}

// Sort alphabetically
results.sort((a, b) => a.word.localeCompare(b.word));

// Stats: count words per nWord length
const stats = {};
for (const w of results) {
    stats[w.nWord] = (stats[w.nWord] || 0) + 1;
}

console.log(`\n=== PARSING COMPLETE ===`);
console.log(`Total unique words (min 4 chars): ${results.length}`);
console.log(`\nBreakdown by word length:`);

const statsRows = Object.keys(stats)
    .map(Number)
    .sort((a, b) => a - b)
    .map(len => ({ nWord: len, count: stats[len] }));

for (const row of statsRows) {
    console.log(`  ${row.nWord} letters: ${row.count} words`);
}

// Save full dict
fs.mkdirSync('src/assets', { recursive: true });
fs.writeFileSync('src/assets/full_dict.json', JSON.stringify(results, null, 2));
console.log(`\nSaved ${results.length} words -> src/assets/full_dict.json`);

// Save 5-letter dict (no nWord field)
const n5 = results
    .filter(w => w.nWord === 5)
    .map(({ nWord, ...rest }) => rest);
fs.writeFileSync('src/assets/nword_5_dict.json', JSON.stringify(n5, null, 2));
console.log(`Saved ${n5.length} 5-letter words -> src/assets/nword_5_dict.json`);

// Save CSV: nWord count stats
const csvHeader = 'nWord,count';
const csvRows = statsRows.map(r => `${r.nWord},${r.count}`);
const csvContent = [csvHeader, ...csvRows].join('\n');
fs.writeFileSync('src/assets/word_length_stats.csv', csvContent);
console.log(`Saved word length stats -> src/assets/word_length_stats.csv`);
console.log(`\nCSV Preview:`);
console.log(csvContent);
