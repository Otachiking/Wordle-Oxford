import React, { useState, useEffect, useCallback, useMemo } from 'react';
import fullDictData from '../assets/full_dict.json';

// C2 excluded
const WORDS_5 = fullDictData.filter(w => w.word.length === 5 && w.level !== 'C2');
const VALID_WORDS = new Set(fullDictData.filter(w => w.word.length === 5).map(w => w.word.toLowerCase()));

const ROWS = 6;
const COLS = 5;
const MAX_TIME_MS = 180000; // 3 min
const REPS_PER_ROUND = 10;
const TOTAL_ROUNDS = 3;
const TOTAL_DAILY = REPS_PER_ROUND * TOTAL_ROUNDS; // 30

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['⌫', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'ENTER'],
];

// ── Deterministic seeded RNG (mulberry32) ──────────────────────────────────
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getDateSeed() {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${now.getMonth()}${now.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (Math.imul(31, hash) + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getDailySetlist() {
  const seed = getDateSeed();
  const rng = mulberry32(seed);
  const shuffled = [...WORDS_5].sort(() => rng() - 0.5);
  return shuffled.slice(0, TOTAL_DAILY);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function evaluateGuess(guess, secret) {
  const result = Array(COLS).fill('absent');
  const secretArr = secret.split('');
  const guessArr = guess.split('');
  const secretUsed = Array(COLS).fill(false);
  const guessUsed = Array(COLS).fill(false);

  for (let i = 0; i < COLS; i++) {
    if (guessArr[i] === secretArr[i]) {
      result[i] = 'correct'; secretUsed[i] = true; guessUsed[i] = true;
    }
  }
  for (let i = 0; i < COLS; i++) {
    if (guessUsed[i]) continue;
    for (let j = 0; j < COLS; j++) {
      if (secretUsed[j]) continue;
      if (guessArr[i] === secretArr[j]) { result[i] = 'present'; secretUsed[j] = true; break; }
    }
  }
  return result;
}

function makeEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill({ letter: '', state: 'empty' }));
}

function loadStats() {
  try {
    const s = localStorage.getItem('compStats');
    if (s) return JSON.parse(s);
  } catch (e) {}
  return { played: 0, won: 0, highestScore: 0, matchLog: [] };
}

function saveStats(st) {
  localStorage.setItem('compStats', JSON.stringify(st));
}

// ── Component ────────────────────────────────────────────────────────────────
export default function CompetitionPage() {
  const [view, setView] = useState('playing'); // 'playing' | 'stats'
  const [stats, setStats] = useState(loadStats);

  // Daily setlist
  const dailySetlist = useMemo(() => getDailySetlist(), []);

  // Progress in today's set
  const [repIndex, setRepIndex] = useState(0);       // 0-29
  const currentRound = Math.floor(repIndex / REPS_PER_ROUND) + 1; // 1-3
  const repInRound = (repIndex % REPS_PER_ROUND) + 1; // 1-10

  const secretEntry = dailySetlist[repIndex] || dailySetlist[0];
  const secret = secretEntry.word.toLowerCase();

  const [board, setBoard] = useState(makeEmptyBoard);
  const [currentRow, setCurrentRow] = useState(0);
  const [currentCol, setCurrentCol] = useState(0);
  const [letterStates, setLetterStates] = useState({});
  const [timerStatus, setTimerStatus] = useState('idle');
  const [timeMs, setTimeMs] = useState(MAX_TIME_MS);

  const [shake, setShake] = useState(false);
  const [invalidMsg, setInvalidMsg] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [gameResult, setGameResult] = useState('');
  const [finalScore, setFinalScore] = useState(0);
  const [roundDone, setRoundDone] = useState(false);

  // Timer
  useEffect(() => {
    let interval = null;
    if (timerStatus === 'running') {
      interval = setInterval(() => {
        setTimeMs(prev => {
          if (prev <= 100) {
            clearInterval(interval);
            return 0;
          }
          return prev - 100;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [timerStatus]);

  // Timeout trigger
  useEffect(() => {
    if (timerStatus === 'running' && timeMs === 0) {
      handleEndGame(false);
    }
  }, [timeMs, timerStatus]);

  const formatTime = (ms) => {
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const calculateScore = (guessesUsed, timeRemainingMs) => {
    const timeScore = Math.floor((timeRemainingMs / MAX_TIME_MS) * 500);
    const guessScoreArr = [0, 500, 400, 300, 200, 100, 50];
    const guessScore = guessScoreArr[guessesUsed] || 0;
    return 1000 + timeScore + guessScore;
  };

  const handleEndGame = useCallback((won, guessCount) => {
    setTimerStatus('stopped');
    const sc = won ? calculateScore(guessCount, timeMs) : 0;
    setGameResult(won ? 'won' : 'lost');
    setFinalScore(sc);

    // Record stats (no word tick indicator for Comp)
    setStats(prev => {
      const ns = {
        ...prev,
        played: prev.played + 1,
        won: prev.won + (won ? 1 : 0),
        highestScore: Math.max(prev.highestScore || 0, sc),
        matchLog: [...prev.matchLog, {
          date: new Date().toISOString(),
          word: secretEntry.word,
          level: secretEntry.level,
          won,
          guesses: guessCount || ROWS,
          timeLeftMs: timeMs,
          score: sc,
          round: currentRound,
          rep: repInRound,
        }],
      };
      saveStats(ns);
      return ns;
    });

    const isEndOfRound = (repIndex + 1) % REPS_PER_ROUND === 0;
    setRoundDone(isEndOfRound);
    setTimeout(() => setShowModal(true), 1800);
  }, [secretEntry, timeMs, repIndex, currentRound, repInRound]);

  const showInvalid = (msg) => {
    setInvalidMsg(msg);
    setShake(true);
    setTimeout(() => { setShake(false); setInvalidMsg(''); }, 600);
  };

  const submitGuess = useCallback(() => {
    if (timerStatus === 'stopped') return;
    const guess = board[currentRow].map(c => c.letter).join('').toLowerCase();
    if (!secretEntry) return;

    if (guess.length < COLS) { showInvalid('Not enough letters'); return; }
    if (!VALID_WORDS.has(guess)) { showInvalid('Not in word list'); return; }

    const prev = board.slice(0, currentRow).map(r => r.map(c => c.letter).join('').toLowerCase());
    if (prev.includes(guess)) { showInvalid('Already guessed'); return; }

    const evaluation = evaluateGuess(guess, secret);

    setBoard(b => {
      const next = b.map(r => r.map(c => ({ ...c })));
      for (let i = 0; i < COLS; i++) next[currentRow][i] = { letter: guess[i].toUpperCase(), state: evaluation[i] };
      return next;
    });
    setLetterStates(ls => {
      const next = { ...ls };
      const priority = { correct: 3, present: 2, absent: 1 };
      for (let i = 0; i < COLS; i++) {
        const l = guess[i]; const s = evaluation[i];
        if ((priority[s] || 0) > (priority[next[l]] || 0)) next[l] = s;
      }
      return next;
    });

    const won = evaluation.every(s => s === 'correct');
    if (won) {
      setTimerStatus('stopped');
      handleEndGame(true, currentRow + 1);
    } else if (currentRow + 1 >= ROWS) {
      setTimerStatus('stopped');
      handleEndGame(false, ROWS);
    } else {
      setCurrentRow(r => r + 1);
      setCurrentCol(0);
    }
  }, [board, currentRow, secretEntry, timerStatus, handleEndGame, secret]);

  const handleKey = useCallback((key) => {
    const k = key.toUpperCase();
    if (showModal) return;

    if (k === 'ENTER') { submitGuess(); }
    else if (k === '⌫' || k === 'BACKSPACE') {
      if (currentCol === 0) return;
      setBoard(b => { const next = b.map(r => r.map(c => ({ ...c }))); next[currentRow][currentCol - 1] = { letter: '', state: 'empty' }; return next; });
      setCurrentCol(c => c - 1);
    } else if (/^[A-Z]$/.test(k)) {
      if (currentCol >= COLS) return;
      if (timerStatus === 'idle') setTimerStatus('running');
      setBoard(b => { const next = b.map(r => r.map(c => ({ ...c }))); next[currentRow][currentCol] = { letter: k, state: 'tbd' }; return next; });
      setCurrentCol(c => c + 1);
    }
  }, [showModal, currentRow, currentCol, submitGuess, timerStatus]);

  useEffect(() => {
    const handler = (e) => handleKey(e.key);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey]);

  const goNext = () => {
    if (repIndex + 1 >= TOTAL_DAILY) return; // all done
    setRepIndex(i => i + 1);
    setBoard(makeEmptyBoard());
    setCurrentRow(0);
    setCurrentCol(0);
    setLetterStates({});
    setTimeMs(MAX_TIME_MS);
    setTimerStatus('idle');
    setGameResult('');
    setShowModal(false);
    setFinalScore(0);
    setRoundDone(false);
  };

  // ── Stats View ────────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState('date'); // date | score | level
  const winRate = stats.played === 0 ? 0 : Math.round((stats.won / stats.played) * 100);

  const sortedLog = useMemo(() => {
    const log = [...(stats.matchLog || [])];
    switch (sortField) {
      case 'score': return log.sort((a, b) => b.score - a.score);
      case 'level': return log.sort((a, b) => a.level.localeCompare(b.level));
      default: return log.reverse(); // newest first
    }
  }, [stats.matchLog, sortField]);

  if (view === 'stats') {
    return (
      <div className="wordle-page page-transition">
        <div className="glass-panel" style={{ padding: '2rem', width: '90%', maxWidth: '640px', margin: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>📊 Record Stats</h2>
            <button className="modal-btn secondary" style={{ margin: 0, padding: '0.4rem 1rem', flex: 'none' }} onClick={() => setView('playing')}>✕ Close</button>
          </div>

          {/* Summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', gap: '0.5rem' }}>
            <div style={{ textAlign: 'center' }}><h3>{stats.played}</h3><span style={{ opacity: 0.7, fontSize: '0.8rem' }}>Played</span></div>
            <div style={{ textAlign: 'center' }}><h3>{stats.won}</h3><span style={{ opacity: 0.7, fontSize: '0.8rem' }}>Won</span></div>
            <div style={{ textAlign: 'center' }}><h3>{winRate}%</h3><span style={{ opacity: 0.7, fontSize: '0.8rem' }}>Win Rate</span></div>
            <div style={{ textAlign: 'center', color: '#ffeb3b' }}><h3>{stats.highestScore || 0}</h3><span style={{ opacity: 0.7, fontSize: '0.8rem' }}>Best Score</span></div>
          </div>

          {/* Sort controls */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ opacity: 0.7, fontSize: '0.85rem', marginRight: '0.3rem', alignSelf: 'center' }}>Sort:</span>
            {[['date', '🕐 Time'], ['score', '⭐ Score'], ['level', '📚 Level']].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setSortField(v)}
                style={{
                  padding: '0.3rem 0.7rem', fontSize: '0.8rem', borderRadius: '8px', border: 'none',
                  background: sortField === v ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.07)',
                  color: sortField === v ? '#a78bfa' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {sortedLog.map((m, i) => {
              const d = new Date(m.date);
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '0.8rem',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: m.won ? 'rgba(83,141,78,0.08)' : 'rgba(200,50,50,0.08)',
                  borderRadius: '8px', marginBottom: '0.3rem',
                }}>
                  <div>
                    <strong>{m.word.toUpperCase()}</strong>
                    <span style={{ opacity: 0.7, fontSize: '0.8rem', marginLeft: '0.4rem' }}>({m.level})</span>
                    <div style={{ opacity: 0.5, fontSize: '0.7rem', marginTop: '0.2rem' }}>
                      {d.toLocaleDateString()} {d.toLocaleTimeString()}
                      {m.round && ` · R${m.round} Rep${m.rep}`}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.9rem', textAlign: 'right' }}>
                    <div style={{ color: m.won ? '#a8e6cf' : '#ff8b94', fontWeight: 'bold' }}>⭐ {m.score} pts</div>
                    <div style={{ opacity: 0.7, fontSize: '0.8rem' }}>{m.won ? `${m.guesses}/6` : 'Failed'}</div>
                  </div>
                </div>
              );
            })}
            {stats.matchLog.length === 0 && <p style={{ opacity: 0.5, textAlign: 'center', padding: '1rem' }}>No matches yet.</p>}
          </div>
        </div>
      </div>
    );
  }

  // ── Playing View ──────────────────────────────────────────────────────────
  const allDone = repIndex >= TOTAL_DAILY;

  return (
    <div className="wordle-page page-transition">

      {/* Progress Header */}
      <div className="comp-progress-bar">
        <div className="comp-progress-left">
          <span className="comp-round-badge">Round {currentRound}/{TOTAL_ROUNDS}</span>
          <span style={{ opacity: 0.7, fontSize: '0.8rem' }}>Rep {repInRound}/{REPS_PER_ROUND}</span>
        </div>
        <div className="comp-progress-pills">
          {Array.from({ length: TOTAL_DAILY }).map((_, i) => {
            const log = stats.matchLog;
            // Can't reliably map log to index since user might not start from 0, just color by position
            let status = 'upcoming';
            if (i < repIndex) status = 'done';
            else if (i === repIndex) status = 'current';
            return <div key={i} className={`comp-pill comp-pill-${status}`} />;
          })}
        </div>
        <button className="modal-btn secondary" style={{ padding: '0.3rem 0.8rem', flex: 'none', margin: 0, fontSize: '0.8rem' }} onClick={() => setView('stats')}>
          📊 Stats
        </button>
      </div>

      {/* Timer */}
      <div className="glass-panel" style={{
        padding: '0.5rem 1.5rem', marginBottom: '1rem', borderRadius: '50px',
        background: timeMs <= 30000 ? 'rgba(255,50,50,0.2)' : '',
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: timeMs <= 30000 ? '#ff8b94' : 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ⏱ {formatTime(timeMs)}
          {timerStatus === 'idle' && <span style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 'normal' }}>(Starts on type)</span>}
        </div>
      </div>

      {invalidMsg && <div className="wordle-toast">{invalidMsg}</div>}

      {/* Board */}
      <div className="wordle-board">
        {board.map((row, ri) => (
          <div key={ri} className={`wordle-row${ri === currentRow && shake ? ' shake' : ''}`}>
            {row.map((cell, ci) => (
              <div
                key={ci}
                className={`wordle-tile state-${cell.state}${gameResult === 'won' && ri === currentRow - 1 ? ' win-flip' : ''}`}
                style={{ animationDelay: `${ci * 100}ms` }}
              >
                {cell.letter}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Keyboard */}
      <div className="wordle-keyboard">
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="keyboard-row">
            {row.map(key => {
              const lk = key.toLowerCase();
              const ks = letterStates[lk] || '';
              const isWide = key === 'ENTER' || key === '⌫';
              return (
                <button
                  key={key}
                  className={`key-btn${isWide ? ' key-wide' : ''}${ks ? ` key-${ks}` : ''}`}
                  onClick={() => handleKey(key)}
                  aria-label={key}
                >
                  {key}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.stopPropagation()}>
          <div className="modal-card">
            <div className="modal-status">
              {gameResult === 'won' ? 'Correct! 🎉' : 'Next Time! 😔'}
            </div>

            {gameResult === 'won' && (
              <div style={{ margin: '0.5rem 0', background: 'rgba(0,0,0,0.2)', padding: '0.8rem 1.2rem', borderRadius: '12px', textAlign: 'center' }}>
                <h3 style={{ margin: 0, color: '#a8e6cf' }}>+{finalScore} pts</h3>
                <p style={{ opacity: 0.7, fontSize: '0.8rem', marginTop: '0.3rem' }}>
                  Round {currentRound} · Rep {repInRound}
                </p>
              </div>
            )}

            <div className="modal-word-card">
              <div className="modal-emoji">{secretEntry?.emoji || '📘'}</div>
              <div className="modal-word-info">
                <div className="modal-word">{secretEntry?.word.toUpperCase()}</div>
                <div className="modal-pos-level">
                  <span className="modal-level">{secretEntry?.level}</span>
                  <span className="modal-pos">{secretEntry?.partOfSpeech}</span>
                </div>
                <div className="modal-definition">{secretEntry?.definition || 'No definition yet.'}</div>
              </div>
            </div>

            {roundDone && repIndex + 1 < TOTAL_DAILY && (
              <div style={{ textAlign: 'center', padding: '0.5rem 1rem', background: 'rgba(124,58,237,0.15)', borderRadius: '10px', fontSize: '0.9rem', color: '#a78bfa' }}>
                🏁 Round {currentRound} complete!
              </div>
            )}

            {repIndex + 1 >= TOTAL_DAILY ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏆 All 30 words done today!</div>
                <button className="modal-btn secondary" onClick={() => setView('stats')}>View Stats</button>
              </div>
            ) : (
              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setView('stats')}>Stats</button>
                <button className="modal-btn primary" onClick={goNext}>
                  ➡️ Next Word ({repIndex + 2}/{TOTAL_DAILY})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
