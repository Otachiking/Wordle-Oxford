import React, { useState, useEffect, useCallback, useRef } from 'react';
import dictionaryData from '../DICTIONARY_nWord_5.json';
import { pickPrioritizedWord } from '../utils/wordSelection';
import { saveWordAttempt } from '../utils/historyManager';
import HistoryModal from '../components/HistoryModal';

const ALL_WORDS_5 = dictionaryData.filter(w => w.level !== 'C2');
const VALID_WORDS = new Set(dictionaryData.map(w => w.word.toLowerCase()));

const ROWS = 6;
const COLS = 5;
const COMP_SCORE_MAX_TIME_MS = 180000;

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'R'];

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['⌫', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'ENTER'],
];

function makeEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill({ letter: '', state: 'empty' }));
}

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

function pickWord(level) {
  const pool = (level === 'ALL' || level === 'R') ? ALL_WORDS_5 : ALL_WORDS_5.filter(w => w.level === level);
  const finalPool = pool.length > 0 ? pool : ALL_WORDS_5;
  return pickPrioritizedWord(finalPool) || finalPool[0];
}

const calculateScore = (guessesUsed, timeRemainingMs) => {
  const safeTime = Math.max(0, Math.min(timeRemainingMs, COMP_SCORE_MAX_TIME_MS));
  const timeScore = Math.floor((safeTime / COMP_SCORE_MAX_TIME_MS) * 500);
  const guessScoreArr = [0, 500, 400, 300, 200, 100, 50];
  const guessScore = guessScoreArr[guessesUsed] || 0;
  return 1000 + timeScore + guessScore;
};

// ── Persistence Logic ────────────────────────────────────────────────────────
function getInitialState() {
  try {
    const saved = localStorage.getItem('trainGameState');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.gameStatus === 'playing') return parsed;
    }
  } catch (e) { }
  return null;
}

export default function TrainPage() {
  const init = React.useMemo(() => getInitialState(), []);

  const [selectedLevel, setSelectedLevel] = useState(init?.selectedLevel || 'R');
  const [secretEntry, setSecretEntry] = useState(() => init?.secretEntry || pickWord(init?.selectedLevel || 'R'));
  const secret = secretEntry.word.toLowerCase();

  const [board, setBoard] = useState(() => init?.board || makeEmptyBoard());
  const [currentRow, setCurrentRow] = useState(init?.currentRow || 0);
  const [currentCol, setCurrentCol] = useState(init?.currentCol || 0);
  const [letterStates, setLetterStates] = useState(init?.letterStates || {});
  const [gameStatus, setGameStatus] = useState(init?.gameStatus || 'playing');

  const [shake, setShake] = useState(false);
  const [invalidMsg, setInvalidMsg] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [showHintModal, setShowHintModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [hintsRevealed, setHintsRevealed] = useState(init?.hintsRevealed || { level: false, emoji: false, def: false });

  // Timer states
  const [timerDuration, setTimerDuration] = useState(() => {
    return init?.timerDuration || parseFloat(localStorage.getItem('trainTimerSetting') || '3');
  });
  const [timeLeft, setTimeLeft] = useState(init?.timeLeft || (timerDuration * 60));
  const [timerActive, setTimerActive] = useState(init?.timerActive || false);
  const timerRef = useRef(null);

  // Persistence effect
  useEffect(() => {
    localStorage.setItem('trainGameState', JSON.stringify({
      selectedLevel, secretEntry, board, currentRow, currentCol, letterStates, gameStatus, hintsRevealed, timerDuration, timeLeft, timerActive
    }));
  }, [selectedLevel, secretEntry, board, currentRow, currentCol, letterStates, gameStatus, hintsRevealed, timerDuration, timeLeft, timerActive]);

  const [stats, setStats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('trainStats')) || { played: 0, won: 0, log: [] }; }
    catch (e) { return { played: 0, won: 0, log: [] }; }
  });

  const startNew = useCallback((level = selectedLevel) => {
    const word = pickWord(level);
    setSecretEntry(word);
    setBoard(makeEmptyBoard());
    setCurrentRow(0);
    setCurrentCol(0);
    setLetterStates({});
    setGameStatus('playing');
    setShowModal(false);
    setShowHintModal(false);
    setHintsRevealed({ level: false, emoji: false, def: false });
    setTimerActive(false);
    setTimeLeft(Math.floor(timerDuration * 60));
    setFinalScore(0);
  }, [selectedLevel, timerDuration]);

  // Handle timer
  useEffect(() => {
    if (gameStatus === 'playing' && timerActive && !showModal) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            setGameStatus('lost');
            setTimerActive(false);
            setFinalScore(0);
            const attempt = saveWordAttempt({ word: secret, level: secretEntry.level, won: false, guesses: ROWS, timeMs: 0, durationMs: timerDuration * 60 * 1000, score: 0, game: 'Train' });
            setStats(prev => {
              const ns = { ...prev, played: prev.played + 1, log: [...prev.log, attempt] };
              localStorage.setItem('trainStats', JSON.stringify(ns));
              return ns;
            });
            setShowModal(true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [gameStatus, timerActive, showModal, secret, secretEntry]);

  const handleLevelChange = (lvl) => {
    setSelectedLevel(lvl);
    startNew(lvl);
  };

  const handleTimerSettingChange = (mins) => {
    const m = parseFloat(mins);
    setTimerDuration(m);
    localStorage.setItem('trainTimerSetting', m.toString());
    setTimeLeft(Math.floor(m * 60));
    setShowTimerModal(false);
    startNew(selectedLevel);
  };

  const showInvalid = (msg) => {
    setInvalidMsg(msg);
    setShake(true);
    setTimeout(() => { setShake(false); setInvalidMsg(''); }, 600);
  };

  const submitGuess = useCallback(() => {
    const guess = board[currentRow].map(c => c.letter).join('').toLowerCase();
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
      setGameStatus('won');
      setTimerActive(false);
      const guessesUsed = currentRow + 1;
      const score = calculateScore(guessesUsed, timeLeft * 1000);
      setFinalScore(score);
      const attempt = saveWordAttempt({ word: secret, level: secretEntry.level, won: true, guesses: guessesUsed, timeMs: timeLeft * 1000, durationMs: (timerDuration * 60 * 1000) - (timeLeft * 1000), score, game: 'Train' });
      setStats(prev => {
        const ns = { ...prev, played: prev.played + 1, won: prev.won + 1, log: [...prev.log, attempt] };
        localStorage.setItem('trainStats', JSON.stringify(ns));
        return ns;
      });
      setTimeout(() => setShowModal(true), 1200);
    } else if (currentRow + 1 >= ROWS) {
      setGameStatus('lost');
      setTimerActive(false);
      const attempt = saveWordAttempt({ word: secret, level: secretEntry.level, won: false, guesses: ROWS, timeMs: timeLeft * 1000, durationMs: (timerDuration * 60 * 1000) - (timeLeft * 1000), score: 0, game: 'Train' });
      setStats(prev => {
        const ns = { ...prev, played: prev.played + 1, log: [...prev.log, attempt] };
        localStorage.setItem('trainStats', JSON.stringify(ns));
        return ns;
      });
      setTimeout(() => setShowModal(true), 1200);
    } else {
      setCurrentRow(r => r + 1);
      setCurrentCol(0);
    }
  }, [board, currentRow, secret, secretEntry]);

  const handleKey = useCallback((key) => {
    const k = key.toUpperCase();
    if (showModal) {
      if (k === 'ENTER' || key === ' ') { startNew(); }
      if (k === 'ESCAPE') { setShowModal(false); }
      return;
    }
    if (gameStatus !== 'playing') return;
    if (k === 'ENTER') { submitGuess(); }
    else if (k === '⌫' || k === 'BACKSPACE') {
      if (currentCol === 0) return;
      setBoard(b => { const next = b.map(r => r.map(c => ({ ...c }))); next[currentRow][currentCol - 1] = { letter: '', state: 'empty' }; return next; });
      setCurrentCol(c => c - 1);
    } else if (/^[A-Z]$/.test(k)) {
      if (currentCol >= COLS) return;
      if (!timerActive) setTimerActive(true);
      setBoard(b => { const next = b.map(r => r.map(c => ({ ...c }))); next[currentRow][currentCol] = { letter: k, state: 'tbd' }; return next; });
      setCurrentCol(c => c + 1);
    }
  }, [gameStatus, currentRow, currentCol, submitGuess, showModal, startNew, timerActive]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setShowTimerModal(false);
        setShowHintModal(false);
        setShowHistoryModal(false);
      }
      handleKey(e.key);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const winRate = stats.played === 0 ? 0 : Math.round((stats.won / stats.played) * 100);

  return (
    <div className="wordle-page">
      {/* Stats, Timer, Option - Compact 1-Row Bar */}
      <div className="train-meta-bar">
        {/* PWR Stats */}
        <div className="compact-stats">
          <span title="Played">🎮 <b>P:{stats.played}</b></span>
          <span title="Won">✅ <b>W:{stats.won}</b></span>
          <span title="Win Rate">📈 <b>R:{winRate}%</b></span>
        </div>

        <div className="meta-divider"></div>

        {/* Timer Display */}
        <div
          className={`timer-display ${timerActive ? 'active' : ''}`}
          onClick={() => setShowTimerModal(true)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
          title="Click to change timer"
        >
          <b>{formatTime(timeLeft)}</b> ⏱️
        </div>
      </div>

      {/* Level Selector - Now below Meta Bar */}
      <div className="train-level-bar">
        <span className="train-label">Level:</span>
        {LEVELS.map(lvl => (
          <button
            key={lvl}
            className={`train-level-btn${selectedLevel === lvl ? ' active' : ''}`}
            onClick={() => handleLevelChange(lvl)}
            aria-label={lvl === 'R' ? 'Random' : `Level ${lvl}`}
          >
            {lvl === 'R' ? '🎲' : lvl}
          </button>
        ))}
      </div>

      {/* Timer Modal */}
      {showTimerModal && (
        <div className="modal-overlay" onClick={() => setShowTimerModal(false)} style={{ zIndex: 1000 }}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowTimerModal(false)}>×</button>
            <div className="hint-header">
              <h2>Set Timer ⏱️</h2>
              <p>Choose duration for Train mode:</p>
            </div>
            <div className="hint-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <button className={`hint-box ${timerDuration === 1.5 ? 'active' : ''}`} onClick={() => handleTimerSettingChange('1.5')}>1:30</button>
              <button className={`hint-box ${timerDuration === 2 ? 'active' : ''}`} onClick={() => handleTimerSettingChange('2')}>2:00</button>
              <button className={`hint-box ${timerDuration === 3 ? 'active' : ''}`} onClick={() => handleTimerSettingChange('3')}>3:00</button>
            </div>
          </div>
        </div>
      )}

      {/* Hint Modal moved to end of return, Hint button moved to below keyboard */}

      {showHintModal && (
        <div className="modal-overlay" onClick={() => setShowHintModal(false)}>
          <div className="modal-card hint-card" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowHintModal(false)}>×</button>
            <div className="hint-header">
              <h2>Need a Hint? 🧐</h2>
              <p>Reveal some info about the word:</p>
            </div>
            <div className="hint-grid">
              <button className="hint-box" onClick={() => setHintsRevealed(p => ({ ...p, level: true }))}>
                {hintsRevealed.level ? <span className="hint-revealed level">{secretEntry.level}</span> : 'CEFR Level'}
              </button>
              <button className="hint-box" onClick={() => setHintsRevealed(p => ({ ...p, emoji: true }))}>
                {hintsRevealed.emoji ? <span className="hint-revealed emoji">{secretEntry.emoji || '📘'}</span> : 'Emoji'}
              </button>
              <button className="hint-box full" onClick={() => setHintsRevealed(p => ({ ...p, def: true }))}>
                {hintsRevealed.def ? <span className="hint-revealed def">{secretEntry.definition || 'No definition'}</span> : 'Definition'}
              </button>
            </div>
          </div>
        </div>
      )}

      {invalidMsg && <div className="wordle-toast">{invalidMsg}</div>}

      {/* Board */}
      <div className="wordle-board">
        {board.map((row, ri) => (
          <div key={ri} className={`wordle-row${ri === currentRow && shake ? ' shake' : ''}`}>
            {row.map((cell, ci) => (
              <div
                key={ci}
                className={`wordle-tile state-${cell.state}${gameStatus === 'won' && ri === currentRow ? ' win-flip' : ''}`}
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

      {/* Hints & History Trigger - Now below keyboard */}
      <div className="hints-container" style={{ marginTop: '1.5rem', gap: '0.8rem' }}>
        <button className="hint-btn trigger" onClick={() => setShowHintModal(true)}>
          Give me a hint 💡
        </button>
        <button className="hint-btn trigger history-trigger" onClick={() => setShowHistoryModal(true)}>
          History 📚
        </button>
        {gameStatus !== 'playing' && !showModal && (
          <button className="hint-btn trigger history-trigger" onClick={() => startNew()} style={{ background: 'rgba(59,130,246,0.2)', borderColor: 'rgba(59,130,246,0.4)', color: '#93c5fd' }}>
            Next Word 💪🏻
          </button>
        )}
      </div>

      {/* Post-game Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <button className="close-btn modal-close-x" onClick={() => setShowModal(false)} aria-label="Close">×</button>
            <div className="modal-status">
              {gameStatus === 'won' ? 'You Got It! 🎉' : 'Keep Training! 💪🏻'}
            </div>

            <div className="modal-word-card">
              <div className="modal-emoji">{secretEntry.emoji || '📘'}</div>
              <div className="modal-word-info">
                <div className="modal-word">{secretEntry.word.toUpperCase()}</div>
                <div className="modal-pos-level">
                  <span className="modal-level">{secretEntry.level}</span>
                  <span className="modal-pos">{secretEntry.part}</span>
                </div>
                <div className="modal-definition">{secretEntry.definition || 'No definition yet.'}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', margin: '0.5rem 0' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.2rem' }}>Total Score</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#a8e6cf' }}>+{finalScore} pts</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.2rem' }}>Stats</div>
                <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                  {gameStatus === 'won' ? `${currentRow + 1}/6 Row` : 'Failed'} · {(timerDuration * 60) - timeLeft}s
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>Press Space or Enter for next word</p>
            <div className="modal-actions">
              <button className="modal-btn primary" onClick={() => startNew()}>
                Next Word 💪🏻
              </button>
            </div>
          </div>
        </div>
      )}
      <HistoryModal open={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Train History" />
    </div>
  );
}
