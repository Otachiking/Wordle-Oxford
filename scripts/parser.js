import fs from 'fs';
import path from 'path';

let pdfParse;
async function loadPdfParse() {
    try {
        const mod = await import('pdf-parse');
        pdfParse = mod.default || mod;
        console.log("Loaded pdf-parse successfully");
    } catch (e) {
        console.error("Failed to load pdf-parse:", e);
    }
}

async function parsePDF(pdfPath) {
    console.log(`Reading: ${pdfPath}`);
    const dataBuffer = fs.readFileSync(pdfPath);
    let data;
    try {
        if (typeof pdfParse === 'function') {
            data = await pdfParse(dataBuffer);
        } else {
            console.log("pdfParse is not a function, using .default");
            data = await pdfParse.default(dataBuffer);
        }
    } catch (err) {
        console.error(`Error parsing PDF ${pdfPath}:`, err.message);
        throw err;
    }

    const text = data.text;
    
    // Split the text into lines to process it
    const lines = text.split('\n');
    console.log(`Total lines extracted from ${pdfPath}: ${lines.length}`);
    
    // Pattern to catch word, POS, level. For example "apple n. A1", "abandon v. B2"
    // Also "a, an indefinite article A1" -> this can be tricky. Let's aim broadly.
    const results = [];
    
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        
        // Regex to separate word, part of speech, and CEFR level.
        // It looks for a sequence of letters (maybe with hyphen), 
        // followed by some POS abbreviations (like n., v., adj.),
        // ending with a CEFR level (A1, A2, B1, B2, C1, C2)
        const match = line.match(/^([a-zA-Z\-]+(?:\s+[a-zA-Z\-]+)*)\s+([a-z\.,\s]+?)\s+([A-C][1-2])$/);
        
        if (match) {
            const word = match[1].toLowerCase().split(' ')[0]; // Take first word if multiple "a, an"
            if (!/^[a-z]+$/.test(word)) continue; // ignore if has special chars

            results.push({
                id: `w_${word}`,
                word: word,
                nWord: word.length,
                partOfSpeech: match[2].trim(),
                level: match[3].trim(),
                definition: "", // Will be filled later by the user
                emoji: ""       // Will be filled later by the user
            });
        }
    }
    console.log(`Successfully extracted ${results.length} words from ${pdfPath}`);
    return results;
}

async function main() {
    await loadPdfParse();
    const p3000 = path.resolve('Data/The_Oxford_3000.pdf');
    const p5000 = path.resolve('Data/The_Oxford_5000.pdf');
    
    let allWords = [];
    try {
        const t3 = await parsePDF(p3000);
        const t5 = await parsePDF(p5000);
        allWords = [...t3, ...t5];
    } catch(err) {
        console.error("FATAL ERROR during extraction:", err);
        return; // stop execution
    }
    
    // Remove duplicates
    const unique = [];
    const map = new Map();
    for(const item of allWords) {
        if(!map.has(item.word)) {
            map.set(item.word, true);
            unique.push(item);
        }
    }
    
    console.log(`Total unique words parsed: ${unique.length}`);
    
    // Full dict
    fs.mkdirSync('src/assets', { recursive: true });
    fs.writeFileSync('src/assets/full_dict.json', JSON.stringify(unique, null, 2));
    
    // NWord 5 specific dict (remove nWord field)
    const n5WordsList = unique
        .filter(w => w.nWord === 5)
        .map(({ nWord, ...rest }) => rest);
        
    fs.writeFileSync('src/assets/nword_5_dict.json', JSON.stringify(n5WordsList, null, 2));
    
    console.log(`Saved ${unique.length} words to full_dict.json`);
    console.log(`Saved ${n5WordsList.length} 5-letter words to nword_5_dict.json`);
}

main();
