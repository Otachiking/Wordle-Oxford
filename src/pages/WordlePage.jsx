import React, { useState, useEffect, useCallback } from 'react';
import fullDictData from '../assets/full_dict.json';

const wordsData = fullDictData.filter(w => w.word.length === 5 && w.level !== 'C2');

function saveWordTick(word, won) {
  try {
    const existing = JSON.parse(localStorage.getItem('trainWordHistory') || '{}');
    existing[word.toLowerCase()] = won ? 'correct' : 'wrong';
    localStorage.setItem('trainWordHistory', JSON.stringify(existing));
  } catch (e) {}
}

// ── Constants ──────────────────────────────────────────────────────────────
const ROWS = 6;
const COLS = 5;

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['⌫', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'ENTER'],
];

// Build word set for valid-guess validation (all words lowercase)
const VALID_WORDS = new Set(wordsData.map(w => w.word.toLowerCase()));

function pickRandomWord() {
  const pool = wordsData.filter(w => w.word.length === 5);
  return pool[Math.floor(Math.random() * pool.length)];
}

function evaluateGuess(guess, secret) {
  const result = Array(COLS).fill('absent');
  const secretArr = secret.split('');
  const guessArr = guess.split('');
  const secretUsed = Array(COLS).fill(false);
  const guessUsed = Array(COLS).fill(false);

  // Pass 1: correct position
  for (let i = 0; i < COLS; i++) {
    if (guessArr[i] === secretArr[i]) {
      result[i] = 'correct';
      secretUsed[i] = true;
      guessUsed[i] = true;
    }
  }

  // Pass 2: present but wrong position
  for (let i = 0; i < COLS; i++) {
    if (guessUsed[i]) continue;
    for (let j = 0; j < COLS; j++) {
      if (secretUsed[j]) continue;
      if (guessArr[i] === secretArr[j]) {
        result[i] = 'present';
        secretUsed[j] = true;
        break;
      }
    }
  }

  return result;
}

// ── Empty board ─────────────────────────────────────────────────────────────
function makeEmptyBoard() {
  return Array.from({ length: ROWS }, () =>
    Array(COLS).fill({ letter: '', state: 'empty' })
  );
}

// ── State Initialization ───────────────────────────────────────────────────
function getInitialState() {
  try {
    const saved = localStorage.getItem('wordleState');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.gameStatus === 'playing') {
        return parsed;
      }
    }
  } catch (e) { }
  return null;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function WordlePage() {
  const init = React.useMemo(() => getInitialState(), []);

  const [secretEntry, setSecretEntry] = useState(() => init?.secretEntry || pickRandomWord());
  const secret = secretEntry.word.toLowerCase();

  const [board, setBoard] = useState(() => init?.board || makeEmptyBoard());
  const [currentRow, setCurrentRow] = useState(init ? init.currentRow : 0);
  const [currentCol, setCurrentCol] = useState(init ? init.currentCol : 0);
  const [letterStates, setLetterStates] = useState(init ? init.letterStates : {});
  const [gameStatus, setGameStatus] = useState(init ? init.gameStatus : 'playing');
  const [hints, setHints] = useState(init ? init.hints : { level: false, emoji: false, def: false });

  const [shake, setShake] = useState(false);
  const [invalidMsg, setInvalidMsg] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalDelay, setModalDelay] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('wordleState', JSON.stringify({
      secretEntry, board, currentRow, currentCol, letterStates, hints, gameStatus
    }));
  }, [secretEntry, board, currentRow, currentCol, letterStates, hints, gameStatus]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const getCurrentGuess = useCallback(() => {
    return board[currentRow].map(c => c.letter).join('').toLowerCase();
  }, [board, currentRow]);

  const showInvalid = (msg) => {
    setInvalidMsg(msg);
    setShake(true);
    setTimeout(() => {
      setShake(false);
      setInvalidMsg('');
    }, 600);
  };

  const submitGuess = useCallback(() => {
    const guess = getCurrentGuess();
    if (guess.length < COLS) {
      showInvalid('Not enough letters');
      return;
    }
    if (!VALID_WORDS.has(guess)) {
      showInvalid('Not in word list');
      return;
    }

    const previousGuesses = board.slice(0, currentRow).map(row => row.map(c => c.letter).join('').toLowerCase());
    if (previousGuesses.includes(guess)) {
      showInvalid('Already guessed');
      return;
    }

    const evaluation = evaluateGuess(guess, secret);

    // Update board with states
    setBoard(prev => {
      const next = prev.map(r => r.map(c => ({ ...c })));
      for (let i = 0; i < COLS; i++) {
        next[currentRow][i] = { letter: guess[i].toUpperCase(), state: evaluation[i] };
      }
      return next;
    });

    // Update keyboard letter states (correct > present > absent)
    setLetterStates(prev => {
      const next = { ...prev };
      const priority = { correct: 3, present: 2, absent: 1 };
      for (let i = 0; i < COLS; i++) {
        const l = guess[i];
        const s = evaluation[i];
        if ((priority[s] || 0) > (priority[next[l]] || 0)) {
          next[l] = s;
        }
      }
      return next;
    });

    const won = evaluation.every(s => s === 'correct');
    if (won) {
      setGameStatus('won');
      saveWordTick(secret, true);
      setTimeout(() => { setShowModal(true); }, 1800);
    } else if (currentRow + 1 >= ROWS) {
      setGameStatus('lost');
      saveWordTick(secret, false);
      setTimeout(() => { setShowModal(true); }, 1800);
    } else {
      setCurrentRow(r => r + 1);
      setCurrentCol(0);
    }
  }, [getCurrentGuess, currentRow, secret, board]);

  const handleKey = useCallback((key) => {
    const k = key.toUpperCase();
    if (showModal) {
      if (k === 'ENTER' || key === ' ') {
        handleNewGame();
      }
      if (k === 'ESCAPE') {
        setShowModal(false);
      }
      return;
    }
    if (gameStatus !== 'playing') return;

    if (k === 'ENTER') {
      submitGuess();
    } else if (k === '⌫' || k === 'BACKSPACE') {
      if (currentCol === 0) return;
      setBoard(prev => {
        const next = prev.map(r => r.map(c => ({ ...c })));
        next[currentRow][currentCol - 1] = { letter: '', state: 'empty' };
        return next;
      });
      setCurrentCol(c => c - 1);
    } else if (/^[A-Z]$/.test(k) && k !== 'ENTER') {
      if (currentCol >= COLS) return;
      setBoard(prev => {
        const next = prev.map(r => r.map(c => ({ ...c })));
        next[currentRow][currentCol] = { letter: k, state: 'tbd' };
        return next;
      });
      setCurrentCol(c => c + 1);
    }
  }, [gameStatus, currentRow, currentCol, submitGuess, showModal]);

  // Physical keyboard listener
  useEffect(() => {
    const handler = (e) => handleKey(e.key);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey]);

  const handleNewGame = () => {
    setSecretEntry(pickRandomWord());
    setBoard(makeEmptyBoard());
    setCurrentRow(0);
    setCurrentCol(0);
    setLetterStates({});
    setHints({ level: false, emoji: false, def: false });
    setGameStatus('playing');
    setShowModal(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="wordle-page">
      {/* Toast / invalid message */}
      {invalidMsg && <div className="wordle-toast">{invalidMsg}</div>}

      {/* Board */}
      <div className="wordle-board">
        {board.map((row, ri) => (
          <div
            key={ri}
            className={`wordle-row${ri === currentRow && shake ? ' shake' : ''}`}
          >
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
              const lowerKey = key.toLowerCase();
              const ks = letterStates[lowerKey] || '';
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

      {/* Hint Trigger */}
      <div className="hints-container">
        <button className="hint-btn trigger" onClick={() => setShowHintModal(true)}>Give me a hint 💡</button>
      </div>

      {/* Post-game Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <button className="close-btn modal-close-x" onClick={() => setShowModal(false)} aria-label="Close">×</button>
            <div className="modal-status">
              {gameStatus === 'won' ? 'You Won! 🎉' : 'Game Over 😔'}
            </div>
            <div className="modal-row-count">
              {gameStatus === 'won'
                ? `Solved in ${currentRow} ${currentRow === 1 ? 'guess' : 'guesses'}!`
                : `The answer was: ${secretEntry.word.toUpperCase()}`}
            </div>
            <div className="modal-word-card">
              <div className="modal-emoji">{secretEntry.emoji || '📘'}</div>
              <div className="modal-word-info">
                <div className="modal-word">{secretEntry.word.toUpperCase()}</div>
                <div className="modal-pos-level">
                  <span className="modal-level">{secretEntry.level}</span>
                  <span className="modal-pos">{secretEntry.partOfSpeech}</span>
                </div>
                <div className="modal-definition">
                  {secretEntry.definition || 'No definition yet.'}
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Press Space or Enter for new game</p>
            <div className="modal-actions">
              <button className="modal-btn primary" onClick={handleNewGame}>
                🔄 New Game
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Hint Modal */}
      {showHintModal && (
        <div className="modal-overlay" onClick={() => setShowHintModal(false)}>
          <div className="modal-card hint-card" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowHintModal(false)}>×</button>
            <div className="hint-header">
              <h2>Need a Hint? 🧐</h2>
              <p>Select what to reveal:</p>
            </div>

            <div className="hint-grid">
              <button className="hint-box" onClick={() => setHints(p => ({ ...p, level: true }))}>
                {hints.level ? <span className="hint-revealed level">{secretEntry.level}</span> : 'CEFR Level'}
              </button>
              <button className="hint-box" onClick={() => setHints(p => ({ ...p, emoji: true }))}>
                {hints.emoji ? <span className="hint-revealed emoji">{secretEntry.emoji || '📘'}</span> : 'Emoji'}
              </button>
              <button className="hint-box full" onClick={() => setHints(p => ({ ...p, def: true }))}>
                {hints.def ? <span className="hint-revealed def">{secretEntry.definition || 'No definition'}</span> : 'Definition'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
