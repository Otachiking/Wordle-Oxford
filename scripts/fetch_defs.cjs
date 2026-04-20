const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// Simple heuristic emoji fallback mapping
const genericEmojis = ['💭','✨','💡','📘','🧩','🧭','🎲','🎯','🚀','🌟','⚡','🛠️'];
const emojiMap = {
    'verb': '⚡', 'noun': '📦', 'adj': '✨', 'adv': '💨', 'prep': '🔗', 'pron': '👤'
};
function getFallbackEmoji(word, pos) {
    if (emojiMap[pos]) return emojiMap[pos];
    return genericEmojis[word.length % genericEmojis.length];
}

async function run() {
    const p5 = path.resolve('src/assets/nword_5_dict.json');
    const pFull = path.resolve('src/assets/full_dict.json');
    
    const words5 = JSON.parse(fs.readFileSync(p5, 'utf8'));
    const fullDict = JSON.parse(fs.readFileSync(pFull, 'utf8'));
    
    // We will do only the first 500 as requested, or up to 500 that lack a definition
    let countToFetch = 0;
    const maxFetch = 500;
    
    console.log(`Starting bulk fetch for definitions (Limit: ${maxFetch} words) ...`);

    for (let item of words5) {
        if (!item.definition || item.definition === "") {
            try {
                // Free dictionary API
                const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${item.word}`;
                const response = await axios.get(url);
                const meanings = response.data[0]?.meanings;
                
                let def = "";
                if (meanings && meanings.length > 0) {
                    def = meanings[0].definitions[0].definition;
                }
                
                if (def) {
                    item.definition = def.slice(0, 75) + (def.length > 75 ? "..." : ""); // clip too long definitions visually
                } else {
                    item.definition = "Definition not found.";
                }
            } catch (err) {
                // Not found or rate limited
                if (err.response && err.response.status === 404) {
                    item.definition = "Definition unavailable.";
                } else {
                    console.error(`Rate limited or Error for ${item.word}, skipping...`);
                    item.definition = "Rate limited.";
                }
            }
            
            // Emoji logic
            item.emoji = getFallbackEmoji(item.word, item.partOfSpeech);
            
            countToFetch++;
            process.stdout.write(`\rFetched: ${countToFetch}/${maxFetch} [${item.word}]      `);
            
            // Sync with full_dict
            const fullRef = fullDict.find(w => w.id === item.id);
            if (fullRef) {
                fullRef.definition = item.definition;
                fullRef.emoji = item.emoji;
            }
            
            if (countToFetch >= maxFetch) break;
            
            // 200ms delay to respect free API rate limits safely
            await delay(200);
        }
    }
    
    console.log(`\n\nCompleted definitions update!`);
    fs.writeFileSync(p5, JSON.stringify(words5, null, 2));
    fs.writeFileSync(pFull, JSON.stringify(fullDict, null, 2));
    
    console.log('Saved back to nword_5_dict.json and full_dict.json');
}

run();
