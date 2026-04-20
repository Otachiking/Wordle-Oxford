const fs = require('fs');
const https = require('https');

const path = 'src/assets/mini_dict.json';

const genericEmojis = ['💭','✨','💡','📘','🧭','🎯','🚀','🌟','⚡','🛠️'];

function getEmojiForFallback(word, def) {
    if (!def) return genericEmojis[word.length % genericEmojis.length];
    
    const words = def.toLowerCase();
    if (words.includes('person') || words.includes('someone') || words.includes('who')) return '👤';
    if (words.includes('place') || words.includes('city') || words.includes('country') || words.includes('area')) return '🌍';
    if (words.includes('time') || words.includes('period') || words.includes('year')) return '⏳';
    if (words.includes('money') || words.includes('pay') || words.includes('cost')) return '💵';
    if (words.includes('feel') || words.includes('emotion') || words.includes('love')) return '💖';
    if (words.includes('move') || words.includes('walk') || words.includes('go')) return '🏃';
    if (words.includes('say') || words.includes('speak') || words.includes('word') || words.includes('talk')) return '🗣️';
    if (words.includes('animal') || words.includes('bird') || words.includes('fish')) return '🐾';
    if (words.includes('machine') || words.includes('tool') || words.includes('device')) return '⚙️';
    if (words.includes('water') || words.includes('liquid')) return '💧';
    if (words.includes('fire') || words.includes('heat') || words.includes('burn')) return '🔥';
    if (words.includes('food') || words.includes('eat') || words.includes('meal')) return '🍔';
    if (words.includes('building') || words.includes('house') || words.includes('room')) return '🏠';
    if (words.includes('car') || words.includes('vehicle') || words.includes('drive')) return '🚗';
    if (words.includes('idea') || words.includes('think') || words.includes('mind')) return '🧠';
    if (words.includes('number') || words.includes('math') || words.includes('calculate')) return '🔢';
    
    return genericEmojis[word.length % genericEmojis.length];
}

async function fetchDef(word) {
    return new Promise((resolve) => {
        const req = https.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const parsed = JSON.parse(body);
                        const meanings = parsed[0]?.meanings;
                        if (meanings && meanings.length > 0) {
                            let def = meanings[0].definitions[0].definition;
                            
                            if (def.length > 70) {
                                const splitPos = def.lastIndexOf(' ', 70);
                                if (splitPos !== -1 && splitPos > 40) {
                                    def = def.substring(0, splitPos) + '...';
                                } else {
                                    def = def.substring(0, 67) + '...';
                                }
                            }
                            resolve(def);
                            return;
                        }
                    } catch(e) {}
                }
                resolve(null);
            });
        });
        
        req.on('error', () => resolve(null));
        req.setTimeout(5000, () => {
            req.abort();
            resolve(null);
        });
    });
}

async function run() {
    console.log("Waiting for the previous update (0-999) to finish saving...");
    
    // Polling so we don't overwrite the previous script's modifications
    while (true) {
        const currentData = JSON.parse(fs.readFileSync(path, 'utf8'));
        // check if index 999 ('creation') was successfully updated by the previous script
        if (currentData[999] && currentData[999].definition && currentData[999].definition !== "") {
            console.log("Previous script finished. Proceeding with 1000-1999...");
            break;
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    
    // Read the freshly saved data
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    let count = 0;
    
    console.log("Updating next 1000 words (index 1000 to 1999)...");
    
    for (let i = 1000; i < 2000; i++) {
        if (!data[i]) break;
        
        const word = data[i].word;
        process.stdout.write(`Progress: ${i-1000}/1000 (${word})      \r`);
        
        let def = await fetchDef(word);
        if (def) {
            data[i].definition = def;
            data[i].emoji = getEmojiForFallback(word, def);
            count++;
        } else {
            if (!data[i].definition) data[i].definition = "...";
            if (!data[i].emoji) data[i].emoji = '💭';
        }
        
        // Wait 100ms before next request to avoid rate limit HTTP 429
        await new Promise(r => setTimeout(r, 100));
    }
    
    console.log(`\nSuccessfully updated ${count} words.`);
    
    // Save to file
    let newContent = "[\n";
    data.forEach((item, idx) => {
        newContent += "  " + JSON.stringify(item);
        newContent += (idx < data.length - 1) ? ",\n" : "\n";
    });
    newContent += "]\n";
    
    fs.writeFileSync(path, newContent, 'utf8');
}

run();