const fs = require('fs');
const https = require('https');

const nwordPath = 'src/assets/nword5_simple.json';
const BATCH_SIZE = 200;

const nword = JSON.parse(fs.readFileSync(nwordPath, 'utf8'));

function isBadDefinition(definition) {
  if (!definition) return true;
  const d = String(definition).trim().toLowerCase();
  if (d === '' || d === '...' || d === 'rate limited.' || d === 'definition unavailable.') return true;
  if (d.startsWith('any of the many definitions or uses related to')) return true;
  return false;
}

function shorten(definition, maxLen = 90) {
  const d = String(definition).replace(/\s+/g, ' ').trim();
  if (d.length <= maxLen) return d;
  const cut = d.lastIndexOf(' ', maxLen);
  if (cut > 45) return d.slice(0, cut) + '...';
  return d.slice(0, maxLen - 3) + '...';
}

function guessEmoji(word, definition) {
  const t = String(definition).toLowerCase();
  if (/(person|people|someone|man|woman|child|human)/.test(t)) return '👤';
  if (/(animal|bird|fish|dog|cat|horse|snake|insect)/.test(t)) return '🐾';
  if (/(plant|tree|flower|grass|seed|leaf|fruit)/.test(t)) return '🌿';
  if (/(water|river|ocean|sea|liquid|rain)/.test(t)) return '💧';
  if (/(fire|heat|burn|flame|hot)/.test(t)) return '🔥';
  if (/(sound|speak|voice|say|talk|word)/.test(t)) return '🗣️';
  if (/(time|year|month|day|hour|period)/.test(t)) return '⏳';
  if (/(place|area|region|city|country|land|room|building)/.test(t)) return '🌍';
  if (/(money|price|cost|pay|cash|value)/.test(t)) return '💵';
  if (/(tool|machine|device|engine|motor|vehicle)/.test(t)) return '⚙️';
  if (/(number|math|count|measure)/.test(t)) return '🔢';
  if (/(food|eat|meal|bread|cook|kitchen)/.test(t)) return '🍔';
  if (/(emotion|feeling|happy|sad|angry|fear|love)/.test(t)) return '💖';
  if (/(move|run|walk|travel|go)/.test(t)) return '🏃';
  if (/(light|bright|shine)/.test(t)) return '✨';
  if (/(book|write|story|text|letter)/.test(t)) return '📘';
  return ['🎯', '🧭', '💡', '🔤'][word.length % 4];
}

function stripHtml(text) {
  return String(text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function httpGetJson(url, headers = {}, timeoutMs = 12000) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(null);
        }
      });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(null);
    });

    req.on('error', () => resolve(null));
  });
}

async function fetchFromDictionaryApi(word) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const payload = await httpGetJson(url, { 'User-Agent': 'Wordle-Oxford/1.0' });
    const definition = payload?.[0]?.meanings?.[0]?.definitions?.[0]?.definition;
    if (definition && definition.trim()) return shorten(definition);
    await new Promise((r) => setTimeout(r, 300 + attempt * 500));
  }
  return null;
}

async function fetchFromWiktionary(word) {
  const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`;
  const payload = await httpGetJson(
    url,
    { 'User-Agent': 'Wordle-Oxford/1.0 (dictionary cleanup task)' },
    14000
  );
  if (!payload || !payload.en || !Array.isArray(payload.en)) return null;

  for (const sense of payload.en) {
    const defs = sense?.definitions;
    if (!Array.isArray(defs)) continue;
    for (const d of defs) {
      const raw = d?.definition;
      if (!raw) continue;
      const clean = stripHtml(raw);
      if (clean) return shorten(clean);
    }
  }
  return null;
}

async function fetchDefinition(word) {
  const primary = await fetchFromDictionaryApi(word);
  if (primary) return primary;
  const secondary = await fetchFromWiktionary(word);
  if (secondary) return secondary;
  return null;
}

const targets = [];
for (let i = 0; i < nword.length; i++) {
  if (isBadDefinition(nword[i].definition)) {
    targets.push(i);
    if (targets.length >= BATCH_SIZE) break;
  }
}

let updated = 0;
let unresolved = 0;

async function run() {
  for (let i = 0; i < targets.length; i++) {
    const idx = targets[i];
    const word = nword[idx].word;
    process.stdout.write(`Processing ${i + 1}/${targets.length}: ${word}         \r`);

    const definition = await fetchDefinition(word);
    if (definition) {
      nword[idx].definition = definition;
      nword[idx].emoji = guessEmoji(word, definition);
      updated++;
    } else {
      unresolved++;
    }

    await new Promise((r) => setTimeout(r, 180));
  }

  let out = '[\n';
  for (let i = 0; i < nword.length; i++) {
    out += '  ' + JSON.stringify(nword[i]);
    out += i < nword.length - 1 ? ',\n' : '\n';
  }
  out += ']\n';

  fs.writeFileSync(nwordPath, out, 'utf8');

  console.log('\nDone.');
  console.log(`Targets: ${targets.length}`);
  console.log(`Updated from online dictionary: ${updated}`);
  console.log(`Still unresolved in this batch: ${unresolved}`);
}

run();
