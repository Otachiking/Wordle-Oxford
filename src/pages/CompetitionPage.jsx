import React, { useState, useEffect, useCallback, useRef } from 'react';
import fullDictData from '../assets/full_dict.json';

const WORDS_5 = fullDictData.filter(w => w.word.length === 5);
const VALID_WORDS = new Set(WORDS_5.map(w => w.word.toLowerCase()));

const ROWS = 6;
const COLS = 5;

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
];

function evaluateGuess(guess, secret) {
  const result = Array(COLS).fill('absent');
  const secretArr = secret.split('');
  const guessArr = guess.split('');
  const secretUsed = Array(COLS).fill(false);
  const guessUsed = Array(COLS).fill(false);

  for (let i = 0; i < COLS; i++) {
    if (guessArr[i] === secretArr[i]) {
      result[i] = 'correct';
      secretUsed[i] = true;
      guessUsed[i] = true;
    }
  }

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

function makeEmptyBoard() {
  return Array.from({ length: ROWS }, () =>
    Array(COLS).fill({ letter: '', state: 'empty' })
  );
}

function loadStats() {
  try {
    const s = localStorage.getItem('compStats');
    if (s) return JSON.parse(s);
  } catch (e) {}
  return { played: 0, won: 0, matchLog: [] };
}

function saveStats(st) {
  localStorage.setItem('compStats', JSON.stringify(st));
}

export default function CompetitionPage() {
  const [gameState, setGameState] = useState('setup');
  const [difficulty, setDifficulty] = useState('A1-A2');
  
  const [secretEntry, setSecretEntry] = useState(null);
  const [board, setBoard] = useState(() => makeEmptyBoard());
  const [currentRow, setCurrentRow] = useState(0);
  const [currentCol, setCurrentCol] = useState(0);
  const [letterStates, setLetterStates] = useState({});
  const [timerStatus, setTimerStatus] = useState('stopped');
  const [timeMs, setTimeMs] = useState(0);

  const [shake, setShake] = useState(false);
  const [invalidMsg, setInvalidMsg] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [gameResult, setGameResult] = useState('');

  const [stats, setStats] = useState(loadStats);

  const timerRef = useRef(null);
  useEffect(() => {
    if (timerStatus === 'running') {
      const startTime = Date.now() - timeMs;
      timerRef.current = setInterval(() => {
        setTimeMs(Date.now() - startTime);
      }, 100);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerStatus]);

  const formatTime = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startCompetition = () => {
    let allowed = [];
    if (difficulty === 'A1-A2') allowed = ['A1', 'A2'];
    else if (difficulty === 'B1-B2') allowed = ['B1', 'B2'];
    else if (difficulty === 'C1-C2') allowed = ['C1', 'C2', 'none'];
    else allowed = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'none'];

    const pool = WORDS_5.filter(w => allowed.includes(w.level));
    const targetPool = pool.length > 0 ? pool : WORDS_5;
    
    // Toggle Excluded Words built-in here dynamically based on stats log (only previously WON words)
    const solvedWords = new Set(stats.matchLog.filter(m => m.won).map(m => m.word.toLowerCase()));
    let finalPool = targetPool.filter(w => !solvedWords.has(w.word.toLowerCase()));
    
    // Fallback if everything is solved
    if(finalPool.length === 0) finalPool = targetPool;

    const chosen = finalPool[Math.floor(Math.random() * finalPool.length)];
    
    setSecretEntry(chosen);
    setBoard(makeEmptyBoard());
    setCurrentRow(0);
    setCurrentCol(0);
    setLetterStates({});
    setTimeMs(0);
    
    setGameState('playing');
    setTimerStatus('running');
    setGameResult('');
    setShowModal(false);
  };

  const showInvalid = (msg) => {
    setInvalidMsg(msg);
    setShake(true);
    setTimeout(() => {
      setShake(false);
      setInvalidMsg('');
    }, 600);
  };

  const submitGuess = useCallback(() => {
    if (gameState !== 'playing') return;
    const guess = board[currentRow].map(c => c.letter).join('').toLowerCase();
    const secret = secretEntry.word.toLowerCase();

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

    setBoard(prev => {
      const next = prev.map(r => r.map(c => ({ ...c })));
      for (let i = 0; i < COLS; i++) {
        next[currentRow][i] = { letter: guess[i].toUpperCase(), state: evaluation[i] };
      }
      return next;
    });

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
        setTimerStatus('stopped');
        setGameResult('won');
        recordMatch(true, currentRow + 1);
        setTimeout(() => setShowModal(true), 1800);
    } else if (currentRow + 1 >= ROWS) {
        setTimerStatus('stopped');
        setGameResult('lost');
        recordMatch(false, ROWS);
        setTimeout(() => setShowModal(true), 1800);
    } else {
      setCurrentRow(r => r + 1);
      setCurrentCol(0);
    }
  }, [gameState, board, currentRow, secretEntry, stats]);

  const recordMatch = (won, guesses) => {
    const newStats = { ...stats };
    newStats.played += 1;
    if (won) newStats.won += 1;
    
    newStats.matchLog.push({
      date: new Date().toISOString(),
      word: secretEntry.word,
      level: secretEntry.level,
      difficulty,
      won,
      guesses,
      timeMs
    });
    
    setStats(newStats);
    saveStats(newStats);
  };

  const handleKey = useCallback((key) => {
    const k = key.toUpperCase();
    if (showModal || gameState !== 'playing') return;

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
  }, [gameState, currentRow, currentCol, submitGuess, showModal]);

  useEffect(() => {
    const handler = (e) => handleKey(e.key);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey]);

  if (gameState === 'setup') {
     return (
       <div className="wordle-page setup-page page-transition">
         <div className="setup-card glass-panel" style={{ padding: '2rem', textAlign: 'center', width: '90%', maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '1rem' }}>🏆 Competition Mode</h2>
            <p style={{ opacity: 0.8, marginBottom: '2rem' }}>Play against the clock with curated CEFR level words. Target words already won will be excluded!</p>
            
            <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Select Difficulty:</label>
                <select value={difficulty} onChange={e=>setDifficulty(e.target.value)} className="glass-select" style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.2)', width: '100%', outline: 'none' }}>
                    <option value="A1-A2" style={{ color: 'black' }}>Easy (A1-A2)</option>
                    <option value="B1-B2" style={{ color: 'black' }}>Medium (B1-B2)</option>
                    <option value="C1-C2" style={{ color: 'black' }}>Hard (C1-C2)</option>
                    <option value="Random" style={{ color: 'black' }}>Random</option>
                </select>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="modal-btn primary" onClick={startCompetition}>🚀 Start</button>
                <button className="modal-btn secondary" onClick={()=>setGameState('stats')}>📊 Stats</button>
            </div>
         </div>
       </div>
     );
  }

  if (gameState === 'stats') {
      const winRate = stats.played === 0 ? 0 : Math.round((stats.won / stats.played) * 100);
      return (
          <div className="wordle-page page-transition">
             <div className="glass-panel" style={{ padding: '2rem', width: '90%', maxWidth: '600px', margin: 'auto' }}>
                 <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>📊 Player Rapot</h2>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                     <div style={{ textAlign: 'center' }}><h3>{stats.played}</h3><span style={{opacity: 0.7, fontSize: '0.9rem'}}>Played</span></div>
                     <div style={{ textAlign: 'center' }}><h3>{stats.won}</h3><span style={{opacity: 0.7, fontSize: '0.9rem'}}>Won</span></div>
                     <div style={{ textAlign: 'center' }}><h3>{winRate}%</h3><span style={{opacity: 0.7, fontSize: '0.9rem'}}>Win Rate</span></div>
                 </div>
                 
                 <div>
                    <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Recent Matches</h3>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {stats.matchLog.slice(-10).reverse().map((m, i) => (
                           <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: m.won ? 'rgba(83, 141, 78, 0.1)' : 'rgba(200, 50, 50, 0.1)' }}>
                               <div>
                                   <strong>{m.word.toUpperCase()}</strong> <span style={{ opacity: 0.7, fontSize: '0.8rem' }}>({m.level})</span> - <span style={{fontSize: '0.8rem'}}>{m.difficulty}</span>
                               </div>
                               <div style={{ fontSize: '0.9rem', textAlign: 'right' }}>
                                   <div>{m.won ? `${m.guesses} guesses` : 'Failed'}</div>
                                   <div style={{ opacity: 0.7 }}>⏱ {formatTime(m.timeMs)}</div>
                               </div>
                           </div>
                        ))}
                        {stats.matchLog.length === 0 && <p style={{opacity: 0.5, textAlign: 'center', padding: '1rem'}}>No matches yet.</p>}
                    </div>
                 </div>
                 
                 <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                     <button className="modal-btn secondary" onClick={()=>setGameState('setup')}>Back</button>
                 </div>
             </div>
          </div>
      );
  }

  return (
    <div className="wordle-page page-transition">
      <div className="glass-panel" style={{ padding: '0.8rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '90%', maxWidth: '500px', marginBottom: '1rem', borderRadius: '50px' }}>
         <div style={{ display: 'flex', flexDirection: 'column', fontWeight: 'bold' }}>
             <span>⏱ {formatTime(timeMs)}</span>
         </div>
         <div style={{ opacity: 0.8, fontSize: '0.9rem', background: 'rgba(255,255,255,0.1)', padding: '0.3rem 0.8rem', borderRadius: '15px' }}>{difficulty}</div>
         <button className="modal-btn secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', margin: 0, minWidth: 0 }} onClick={() => { setTimerStatus('stopped'); setGameState('setup'); }}>Quit</button>
      </div>

      {invalidMsg && <div className="wordle-toast">{invalidMsg}</div>}

      <div className="wordle-board">
        {board.map((row, ri) => (
          <div key={ri} className={`wordle-row${ri === currentRow && shake ? ' shake' : ''}`}>
            {row.map((cell, ci) => (
              <div
                key={ci}
                className={`wordle-tile state-${cell.state}${gameResult === 'won' && ri === currentRow ? ' win-flip' : ''}`}
                style={{ animationDelay: `${ci * 100}ms` }}
              >
                {cell.letter}
              </div>
            ))}
          </div>
        ))}
      </div>

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

      {showModal && (
        <div className="modal-overlay" onClick={() => setGameState('setup')}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-status">
              {gameResult === 'won' ? 'You Won! 🎉' : 'Game Over 😔'}
            </div>
            <div className="modal-row-count" style={{ marginBottom: '1rem' }}>
              {gameResult === 'won'
                ? `Solved in ${formatTime(timeMs)} (${currentRow} guesses)`
                : 'Time over / Guesses out!'}
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
            <div className="modal-actions">
              <button className="modal-btn secondary" onClick={() => setGameState('setup')}>
                 To Setup
              </button>
              <button className="modal-btn primary" onClick={() => setGameState('stats')}>
                 View Stats
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
