const fs = require('fs');
const https = require('https');

const filePath = 'src/assets/nword5_simple.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const MAX_LEN = 80;

function normalizeSpaces(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function truncateToMax(text, maxLen = MAX_LEN) {
  const clean = normalizeSpaces(text);
  if (clean.length <= maxLen) return clean;
  const cut = clean.lastIndexOf(' ', maxLen);
  if (cut >= 35) return clean.slice(0, cut) + '...';
  return clean.slice(0, maxLen - 3) + '...';
}

function isPlaceholder(definition) {
  const d = normalizeSpaces(definition).toLowerCase();
  if (!d) return true;
  if (d === '...' || d === 'rate limited.' || d === 'definition unavailable.') return true;
  if (d.startsWith('any of the many definitions or uses related to')) return true;
  return false;
}

function stripHtml(text) {
  return normalizeSpaces(String(text || '').replace(/<[^>]+>/g, ' '));
}

function pickEmoji(word, definition) {
  const w = String(word || '').toLowerCase();
  const d = normalizeSpaces(definition).toLowerCase();

  // Direction and map context first
  if (/(north|south|east|west|compass|direction)/.test(d) || /(north|south)/.test(w)) return '🧭';
  if (/(time|year|month|day|hour|minute|period|clock|watch)/.test(d)) return '⏳';
  if (/(person|people|someone|human|man|woman|child|friend|leader)/.test(d)) return '👤';
  if (/(animal|bird|fish|dog|cat|horse|snake|insect|reptile)/.test(d)) return '🐾';
  if (/(plant|tree|flower|grass|seed|leaf|fruit|crop|onion|wheat)/.test(d)) return '🌿';
  if (/(water|river|ocean|sea|liquid|rain|drink)/.test(d)) return '💧';
  if (/(fire|heat|burn|flame|hot|lava)/.test(d)) return '🔥';
  if (/(sound|speak|voice|say|talk|shout|speech)/.test(d)) return '🗣️';
  if (/(money|price|cost|pay|cash|currency|pound|penny|value)/.test(d)) return '💵';
  if (/(tool|machine|device|engine|motor|robot|laser|screw)/.test(d)) return '⚙️';
  if (/(number|math|count|measure|digit|ratio|cardinal)/.test(d)) return '🔢';
  if (/(food|eat|meal|bread|cook|salad|sauce|sugar)/.test(d)) return '🍔';
  if (/(emotion|feeling|happy|sad|angry|fear|love|shame|grief)/.test(d)) return '💖';
  if (/(move|run|walk|travel|go|drive|march|route)/.test(d)) return '🏃';
  if (/(book|write|story|text|letter|essay|diary)/.test(d)) return '📘';
  if (/(light|bright|shine|glow)/.test(d)) return '✨';
  if (/(place|area|region|city|country|land|room|building|house|venue)/.test(d)) return '🌍';

  return ['🎯', '💡', '🧠', '🧩'][w.length % 4];
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

async function fetchDefinitionDictionaryApi(word) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const payload = await httpGetJson(url, { 'User-Agent': 'Wordle-Oxford/1.0' });
    const raw = payload?.[0]?.meanings?.[0]?.definitions?.[0]?.definition;
    const clean = normalizeSpaces(raw);
    if (clean) return truncateToMax(clean);
    await new Promise((r) => setTimeout(r, 300 + attempt * 400));
  }
  return null;
}

async function fetchDefinitionWiktionary(word) {
  const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`;
  const payload = await httpGetJson(
    url,
    { 'User-Agent': 'Wordle-Oxford/1.0 (dictionary cleanup task)' },
    14000
  );

  if (!payload || !Array.isArray(payload.en)) return null;

  for (const sense of payload.en) {
    const defs = sense?.definitions;
    if (!Array.isArray(defs)) continue;
    for (const d of defs) {
      const clean = stripHtml(d?.definition);
      if (clean) return truncateToMax(clean);
    }
  }

  return null;
}

async function fetchDefinition(word) {
  const a = await fetchDefinitionDictionaryApi(word);
  if (a) return a;
  const b = await fetchDefinitionWiktionary(word);
  if (b) return b;
  return null;
}

async function run() {
  let fetched = 0;
  let unresolved = 0;
  let normalized = 0;

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    process.stdout.write(`Processing ${i + 1}/${data.length}: ${item.word}       \r`);

    if (isPlaceholder(item.definition)) {
      const got = await fetchDefinition(item.word);
      if (got) {
        item.definition = got;
        fetched++;
      } else {
        // Keep it meaningful and short if term is likely broken/unknown.
        item.definition = 'Likely rare or malformed entry; definition unavailable from sources.';
        unresolved++;
      }
      await new Promise((r) => setTimeout(r, 160));
    } else {
      const clipped = truncateToMax(item.definition);
      if (clipped !== item.definition) {
        item.definition = clipped;
        normalized++;
      }
    }

    // Refresh emoji for all entries based on final definition.
    item.emoji = pickEmoji(item.word, item.definition);
  }

  let out = '[\n';
  for (let i = 0; i < data.length; i++) {
    out += '  ' + JSON.stringify(data[i]);
    out += i < data.length - 1 ? ',\n' : '\n';
  }
  out += ']\n';

  fs.writeFileSync(filePath, out, 'utf8');

  console.log('\nDone finalize.');
  console.log(`Fetched replacements: ${fetched}`);
  console.log(`Unresolved fallback replacements: ${unresolved}`);
  console.log(`Normalized to <= ${MAX_LEN} chars: ${normalized}`);
}

run();
