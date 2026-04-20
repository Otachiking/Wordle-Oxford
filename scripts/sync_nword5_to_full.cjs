const fs = require('fs');

const fullPath = 'src/assets/full_dict.json';
const simplePath = 'src/assets/nword5_simple.json';

try {
    const fullDict = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    const simpleDict = JSON.parse(fs.readFileSync(simplePath, 'utf8'));

    const simpleMap = new Map();
    simpleDict.forEach(item => {
        simpleMap.set(item.word, { definition: item.definition, emoji: item.emoji });
    });

    let updatedCount = 0;
    fullDict.forEach(item => {
        if (simpleMap.has(item.word)) {
            const source = simpleMap.get(item.word);
            if (item.definition !== source.definition || item.emoji !== source.emoji) {
                item.definition = source.definition;
                item.emoji = source.emoji;
                updatedCount++;
            }
        }
    });

    // Format exactly like the original to keep structure clean
    const out = '[\n' + fullDict.map(item => '  ' + JSON.stringify(item)).join(',\n') + '\n]\n';
    
    fs.writeFileSync(fullPath, out, 'utf8');
    console.log(`Successfully updated ${updatedCount} words in full_dict.json from nword5_simple.json`);
} catch (err) {
    console.error('Error syncing dictionaries:', err);
}
