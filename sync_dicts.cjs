const fs = require('fs');

const miniPath = 'src/assets/mini_dict.json';
const fullPath = 'src/assets/full_dict.json';

console.log("Membaca data...");
const miniData = JSON.parse(fs.readFileSync(miniPath, 'utf8'));
const fullData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

let updatedCount = 0;

// Buat dictionary map supaya pencarian lebih cepat (O(1) dibanding O(n))
const fullMap = new Map();
fullData.forEach(item => {
    fullMap.set(item.word, item);
});

console.log("Menyinkronkan definisi dan emoji yang valid...");
miniData.forEach(miniItem => {
    const def = miniItem.definition;
    const word = miniItem.word;
    
    // Cek syarat: definisi ada, tidak sama dengan string kosong, dan bukan "..."
    if (def && def.trim() !== "" && def !== "...") {
        const fullItem = fullMap.get(word);
        if (fullItem) {
            fullItem.definition = def;
            fullItem.emoji = miniItem.emoji || "";
            updatedCount++;
        }
    }
});

console.log(`Berhasil memperbarui ${updatedCount} kata di full_dict.json!`);

// Simpan kembali full_dict.json (menggunakan format 1 baris per objek agar rapi dan ringan)
let newContent = "[\n";
fullData.forEach((item, idx) => {
    newContent += "  " + JSON.stringify(item);
    newContent += (idx < fullData.length - 1) ? ",\n" : "\n";
});
newContent += "]\n";

fs.writeFileSync(fullPath, newContent, 'utf8');
console.log("File full_dict.json telah tersimpan!");
