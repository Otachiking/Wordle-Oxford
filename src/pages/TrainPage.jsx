import React, { useState, useEffect, useCallback, useRef } from 'react';
import dictionaryData from '../DICTIONARY_nWord_5.json';

const ALL_WORDS_5 = dictionaryData.filter(w => w.level !== 'C2');
const VALID_WORDS = new Set(dictionaryData.map(w => w.word.toLowerCase()));

const ROWS = 6;
const COLS = 5;

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
  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

function loadTrainHistory() {
  try {
    const s = localStorage.getItem('trainWordHistory');
    if (s) return JSON.parse(s);
  } catch (e) {}
  return {};
}

function saveWordTick(word, won) {
  const history = loadTrainHistory();
  history[word.toLowerCase()] = won ? 'correct' : 'wrong';
  localStorage.setItem('trainWordHistory', JSON.stringify(history));
}

// ── Persistence Logic ────────────────────────────────────────────────────────
function getInitialState() {
  try {
    const saved = localStorage.getItem('trainGameState');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.gameStatus === 'playing') return parsed;
    }
  } catch (e) {}
  return null;
}

export default function TrainPage() {
  const init = React.useMemo(() => getInitialState(), []);

  const [selectedLevel, setSelectedLevel] = useState(init?.selectedLevel || 'A1');
  const [secretEntry, setSecretEntry] = useState(() => init?.secretEntry || pickWord(init?.selectedLevel || 'A1'));
  const secret = secretEntry.word.toLowerCase();

  const [board, setBoard] = useState(() => init?.board || makeEmptyBoard());
  const [currentRow, setCurrentRow] = useState(init?.currentRow || 0);
  const [currentCol, setCurrentCol] = useState(init?.currentCol || 0);
  const [letterStates, setLetterStates] = useState(init?.letterStates || {});
  const [gameStatus, setGameStatus] = useState(init?.gameStatus || 'playing');

  const [shake, setShake] = useState(false);
  const [invalidMsg, setInvalidMsg] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);
  const [hintsRevealed, setHintsRevealed] = useState(init?.hintsRevealed || { level: false, emoji: false, def: false });

  // Timer states
  const [timerDuration, setTimerDuration] = useState(() => {
    return init?.timerDuration || parseInt(localStorage.getItem('trainTimerSetting') || '3');
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
    setTimeLeft(timerDuration * 60);
  }, [selectedLevel, timerDuration]);

  // Handle timer
  useEffect(() => {
    if (gameStatus === 'playing' && timerActive && !showModal) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            setGameStatus('lost');
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
  }, [gameStatus, timerActive, showModal]);

  const handleLevelChange = (lvl) => {
    setSelectedLevel(lvl);
    startNew(lvl);
  };

  const handleTimerSettingChange = (mins) => {
    const m = parseInt(mins);
    setTimerDuration(m);
    localStorage.setItem('trainTimerSetting', m.toString());
    setTimeLeft(m * 60);
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
      saveWordTick(secret, true);
      setStats(prev => {
        const ns = { ...prev, played: prev.played + 1, won: prev.won + 1, log: [...prev.log, { word: secretEntry.word, level: secretEntry.level, won: true, date: new Date().toISOString() }] };
        localStorage.setItem('trainStats', JSON.stringify(ns));
        return ns;
      });
      setTimeout(() => setShowModal(true), 1200);
    } else if (currentRow + 1 >= ROWS) {
      setGameStatus('lost');
      setTimerActive(false);
      saveWordTick(secret, false);
      setStats(prev => {
        const ns = { ...prev, played: prev.played + 1, log: [...prev.log, { word: secretEntry.word, level: secretEntry.level, won: false, date: new Date().toISOString() }] };
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
    const handler = (e) => handleKey(e.key);
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
        <div className={`timer-display ${timerActive ? 'active' : ''}`}>
          ⏱️ <b>{formatTime(timeLeft)}</b>
        </div>

        <div className="meta-divider"></div>

        {/* Duration Select */}
        <select 
          className="timer-select-compact"
          value={timerDuration}
          onChange={(e) => handleTimerSettingChange(e.target.value)}
        >
          <option value="2">2m</option>
          <option value="3">3m</option>
          <option value="5">5m</option>
        </select>
      </div>

      {/* Level Selector - Now below Meta Bar */}
      <div className="train-level-bar">
        <span className="train-label">Level:</span>
        {LEVELS.map(lvl => (
          <button
            key={lvl}
            className={`train-level-btn${selectedLevel === lvl ? ' active' : ''}`}
            onClick={() => handleLevelChange(lvl)}
          >
            {lvl === 'R' ? '🎲' : lvl}
          </button>
        ))}
      </div>

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
                className={`wordle-tile state-${cell.state}${gameStatus === 'won' && ri === currentRow ? ' win-jump' : ''}`}
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

      {/* Hints Trigger - Now below keyboard */}
      <div className="hints-container" style={{ marginTop: '1.5rem' }}>
        <button className="hint-btn trigger" onClick={() => setShowHintModal(true)}>
          Give me a hint 💡
        </button>
      </div>

      {/* Post-game Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <button className="close-btn modal-close-x" onClick={() => setShowModal(false)} aria-label="Close">×</button>
            <div className="modal-status">
              {gameStatus === 'won' ? 'You Got It! 🎉' : 'Keep Training! 💪🏻'}
            </div>
            <div className="modal-row-count">
              {gameStatus === 'won'
                ? `Solved in ${currentRow + 1} ${currentRow + 1 === 1 ? 'guess' : 'guesses'}!`
                : `The word was: ${secretEntry.word.toUpperCase()}`}
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
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Press Space or Enter for next word</p>
            <div className="modal-actions">
              <button className="modal-btn primary" onClick={() => startNew()}>
                💪🏻 Next Word
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
