import { loadWordTicks } from './historyManager';

// Picks a word from the pool, prioritizing unplayed
export function pickPrioritizedWord(pool) {
  if (!pool || pool.length === 0) return null;
  const ticks = loadWordTicks();
  
  const unplayed = [];
  const wrong = [];
  const correct = [];

  for (const w of pool) {
    const t = ticks[w.word.toLowerCase()];
    if (!t) unplayed.push(w);
    else if (t === 'wrong') wrong.push(w);
    else correct.push(w);
  }

  if (unplayed.length > 0) {
    return unplayed[Math.floor(Math.random() * unplayed.length)];
  }
  if (wrong.length > 0) {
    return wrong[Math.floor(Math.random() * wrong.length)];
  }
  return correct[Math.floor(Math.random() * correct.length)];
}

// For Competition: Random strictly
export function pickRandomWordComp(pool) {
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
