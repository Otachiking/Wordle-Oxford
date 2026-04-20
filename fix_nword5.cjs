const fs = require('fs');
const https = require('https');

const path = 'src/assets/nword5_simple.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const genericEmojis = ['💭','✨','💡','📘','🧭','🎯','🚀','🌟','⚡','🛠️'];

function getEmoji(word, def) {
    if (!def) return genericEmojis[word.length % genericEmojis.length];
    
    const words = def.toLowerCase();
    if (words.match(/(person|someone|who|man|woman|child|people)/)) return '👤';
    if (words.match(/(place|city|country|area|land|world|region)/)) return '🌍';
    if (words.match(/(time|period|year|month|day|hour|minute)/)) return '⏳';
    if (words.match(/(money|pay|cost|price|bank|cash|value)/)) return '💵';
    if (words.match(/(feel|emotion|love|hate|angry|happy|sad|fear|scare)/)) return '💖';
    if (words.match(/(move|walk|go|run|fly|swim|drive|travel)/)) return '🏃';
    if (words.match(/(say|speak|word|talk|tell|ask|call|voice)/)) return '🗣️';
    if (words.match(/(animal|bird|fish|dog|cat|horse|snake|beast)/)) return '🐾';
    if (words.match(/(machine|tool|device|engine|motor|car|vehicle)/)) return '⚙️';
    if (words.match(/(water|liquid|sea|ocean|river|drink|rain)/)) return '💧';
    if (words.match(/(fire|heat|burn|hot|sun|light)/)) return '🔥';
    if (words.match(/(food|eat|meal|bread|fruit|meat|cook)/)) return '🍔';
    if (words.match(/(building|house|room|wall|door|window|roof)/)) return '🏠';
    if (words.match(/(idea|think|mind|brain|know|understand|logic)/)) return '🧠';
    if (words.match(/(number|math|calculate|count|measure|size)/)) return '🔢';
    if (words.match(/(plant|tree|flower|grass|leaf|seed)/)) return '🌿';
    if (words.match(/(art|music|song|dance|paint|draw|play)/)) return '🎨';
    if (words.match(/(fight|war|battle|weapon|sword|gun|kill)/)) return '⚔️';
    
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
    let count = 0;
    console.log(`Checking ${data.length} total words in nword5_simple.json...`);
    
    for (let i = 0; i < data.length; i++) {
        const def = data[i].definition;
        
        // Check if definition is invalid, missing, "Rate limited.", etc.
        if (!def || def === "" || def === "Rate limited." || def.includes("Rate limited.") || def === "..." || def === "Definition unavailable.") {
            const word = data[i].word;
            process.stdout.write(`Fetching missing/invalid definition for word: ${word} ...\r`);
            
            let newDef = await fetchDef(word);
            if (newDef) {
                data[i].definition = newDef;
                data[i].emoji = getEmoji(word, newDef);
            } else {
                // If API still doesn't find it, provide a simple placeholder or a smarter fallback
                data[i].definition = `Any of the many definitions or uses related to '${word}'.`;
                data[i].emoji = '💭';
            }
            count++;
            
            // 150ms delay to respect rate limit
            await new Promise(r => setTimeout(r, 150));
        } else {
            // Even if definition is valid, if emoji is empty or blank, fetch a new emoji
            if (!data[i].emoji || data[i].emoji === "") {
                 data[i].emoji = getEmoji(data[i].word, data[i].definition);
            }
        }
    }
    
    console.log(`\nBerhasil mem-fetch ulang & memperbaiki ${count} kata!`);
    
    let newContent = "[\n";
    data.forEach((item, idx) => {
        newContent += "  " + JSON.stringify(item);
        newContent += (idx < data.length - 1) ? ",\n" : "\n";
    });
    newContent += "]\n";
    
    fs.writeFileSync(path, newContent, 'utf8');
    console.log("File nword5_simple.json telah berhasil diperbarui dan diformat!");
}

run();