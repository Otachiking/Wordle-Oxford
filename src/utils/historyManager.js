const HISTORY_KEY = 'appWordHistoryLog';
const TICK_KEY = 'appWordTicks';
const LEGACY_TICK_KEY = 'trainWordHistory';

function normalizeTickMap(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const normalized = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!key) continue;
    const word = key.toLowerCase();
    if (value === 'correct' || value === true) normalized[word] = 'correct';
    else if (value === 'wrong' || value === false) normalized[word] = 'wrong';
  }
  return normalized;
}

// Load full history log
export function loadHistoryLog() {
  try {
    const s = localStorage.getItem(HISTORY_KEY);
    if (s) return JSON.parse(s);
  } catch (e) {}
  return [];
}

// Load tick status: { "word": "correct" | "wrong" }
export function loadWordTicks() {
  try {
    const s = localStorage.getItem(TICK_KEY);
    if (s) {
      return normalizeTickMap(JSON.parse(s));
    }

    // Backward-compatibility for older versions that stored ticks in trainWordHistory.
    const legacy = localStorage.getItem(LEGACY_TICK_KEY);
    if (legacy) {
      const migrated = normalizeTickMap(JSON.parse(legacy));
      localStorage.setItem(TICK_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch (e) {}
  return {};
}

// Save word attempt
export function saveWordAttempt({ word, level, won, guesses, timeMs, score, game }) {
  // 1. Update log
  const logs = loadHistoryLog();
  const entry = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    word: word.toLowerCase(),
    level, won, guesses,
    timeLeftMs: timeMs || 0,
    score: score || 0,
    game // 'Daily' | 'Train' | 'Comp'
  };
  logs.push(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(logs));

  // 2. Update tick
  const ticks = loadWordTicks();
  const w = word.toLowerCase();
  // Only override to correct if it was wrong or not played. Once correct, stays correct.
  if (ticks[w] !== 'correct') {
    ticks[w] = won ? 'correct' : 'wrong';
  }
  localStorage.setItem(TICK_KEY, JSON.stringify(ticks));

  return entry;
}
