import React, { useState, useEffect, useCallback } from 'react';
import fullDictData from '../assets/full_dict.json';

// C2 dihilangkan, max C1.
const WORDS_5 = fullDictData.filter(w => w.word.length === 5 && w.level !== 'C2');
const VALID_WORDS = new Set(fullDictData.filter(w => w.word.length === 5).map(w => w.word.toLowerCase()));

const ROWS = 6;
const COLS = 5;
const MAX_TIME_MS = 180000; // 3 minutes

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
  return { played: 0, won: 0, highestScore: 0, matchLog: [] };
}

function saveStats(st) {
  localStorage.setItem('compStats', JSON.stringify(st));
}

export default function CompetitionPage() {
  const [gameState, setGameState] = useState('playing'); // playing, stats
  const [difficulty, setDifficulty] = useState('Random');
  
  const [secretEntry, setSecretEntry] = useState(null);
  const [board, setBoard] = useState(() => makeEmptyBoard());
  const [currentRow, setCurrentRow] = useState(0);
  const [currentCol, setCurrentCol] = useState(0);
  const [letterStates, setLetterStates] = useState({});
  const [timerStatus, setTimerStatus] = useState('idle'); // idle, running, stopped
  const [timeMs, setTimeMs] = useState(MAX_TIME_MS);

  const [shake, setShake] = useState(false);
  const [invalidMsg, setInvalidMsg] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [gameResult, setGameResult] = useState('');
  const [finalScore, setFinalScore] = useState(0);

  const [stats, setStats] = useState(loadStats);

  const startNewGame = useCallback((diff) => {
    let allowed = [];
    if (diff === 'Hardmode') allowed = ['B2', 'C1'];
    else allowed = ['A1', 'A2', 'B1', 'B2', 'C1', 'none'];

    const pool = WORDS_5.filter(w => allowed.includes(w.level));
    const targetPool = pool.length > 0 ? pool : WORDS_5;
    
    const solvedWords = new Set(stats.matchLog.filter(m => m.won).map(m => m.word.toLowerCase()));
    let finalPool = targetPool.filter(w => !solvedWords.has(w.word.toLowerCase()));
    if(finalPool.length === 0) finalPool = targetPool;

    const chosen = finalPool[Math.floor(Math.random() * finalPool.length)];
    
    setSecretEntry(chosen);
    setBoard(makeEmptyBoard());
    setCurrentRow(0);
    setCurrentCol(0);
    setLetterStates({});
    setTimeMs(MAX_TIME_MS);
    
    setTimerStatus('idle');
    setGameResult('');
    setShowModal(false);
    setFinalScore(0);
  }, [stats]);

  useEffect(() => {
    if (!secretEntry) {
      startNewGame(difficulty);
    }
  }, [secretEntry, startNewGame, difficulty]);

  useEffect(() => {
    let interval = null;
    if (timerStatus === 'running') {
      interval = setInterval(() => {
        setTimeMs((prev) => {
          if (prev <= 100) {
            clearInterval(interval);
            handleTimeOut();
            return 0;
          }
          return prev - 100;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [timerStatus]);

  // If time runs out
  const handleTimeOut = useCallback(() => {
    setTimerStatus('stopped');
    setGameResult('lost');
    setFinalScore(0);
    recordMatch(false, ROWS, 0);
    setShowModal(true);
  }, [stats]); // Re-bind safely although it triggers recordMatch. To avoid stale stats, recordMatch accesses current state safely.

  const calculateScore = (guessesUsed, timeRemainingMs) => {
    const timeScore = Math.floor((timeRemainingMs / MAX_TIME_MS) * 500);
    const guessScoreArr = [0, 500, 400, 300, 200, 100, 50]; 
    const guessScore = guessScoreArr[guessesUsed] || 0;
    return 1000 + timeScore + guessScore;
  };

  const recordMatch = (won, guesses, score) => {
    setStats(prev => {
        const newStats = { ...prev };
        newStats.played += 1;
        if (won) newStats.won += 1;
        if (score > (newStats.highestScore || 0)) {
            newStats.highestScore = score;
        }
        
        newStats.matchLog.push({
          date: new Date().toISOString(), // Timestamp
          word: secretEntry.word,
          level: secretEntry.level,
          difficulty,
          won,
          guesses,
          timeLeftMs: timeMs,
          score
        });
        saveStats(newStats);
        return newStats;
    });
  };

  const formatTime = (ms) => {
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
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
    if (gameState !== 'playing' || timerStatus === 'stopped') return;
    const guess = board[currentRow].map(c => c.letter).join('').toLowerCase();
    
    if (!secretEntry) return; // safeguard
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
        const sc = calculateScore(currentRow + 1, timeMs);
        setFinalScore(sc);
        recordMatch(true, currentRow + 1, sc);
        setTimeout(() => setShowModal(true), 1800);
    } else if (currentRow + 1 >= ROWS) {
        setTimerStatus('stopped');
        setGameResult('lost');
        setFinalScore(0);
        recordMatch(false, ROWS, 0);
        setTimeout(() => setShowModal(true), 1800);
    } else {
      setCurrentRow(r => r + 1);
      setCurrentCol(0);
    }
  }, [gameState, board, currentRow, secretEntry, timerStatus, timeMs]);

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
      
      // Start timer on first letter type
      if (timerStatus === 'idle') {
          setTimerStatus('running');
      }

      setBoard(prev => {
        const next = prev.map(r => r.map(c => ({ ...c })));
        next[currentRow][currentCol] = { letter: k, state: 'tbd' };
        return next;
      });
      setCurrentCol(c => c + 1);
    }
  }, [gameState, currentRow, currentCol, submitGuess, showModal, timerStatus]);

  useEffect(() => {
    const handler = (e) => handleKey(e.key);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey]);

  if (gameState === 'stats') {
      const winRate = stats.played === 0 ? 0 : Math.round((stats.won / stats.played) * 100);
      return (
          <div className="wordle-page page-transition">
             <div className="glass-panel" style={{ padding: '2rem', width: '90%', maxWidth: '600px', margin: 'auto' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <h2>📊 Player Rapot</h2>
                     <button className="modal-btn secondary" style={{margin:0, padding: '0.4rem 1rem'}} onClick={()=>setGameState('playing')}>Close</button>
                 </div>
                 
                 <div style={{ display: 'flex', justifyContent: 'space-between', margin: '1rem 0', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                     <div style={{ textAlign: 'center' }}><h3>{stats.played}</h3><span style={{opacity: 0.7, fontSize: '0.9rem'}}>Played</span></div>
                     <div style={{ textAlign: 'center' }}><h3>{stats.won}</h3><span style={{opacity: 0.7, fontSize: '0.9rem'}}>Won</span></div>
                     <div style={{ textAlign: 'center' }}><h3>{winRate}%</h3><span style={{opacity: 0.7, fontSize: '0.9rem'}}>Win Rate</span></div>
                     <div style={{ textAlign: 'center', color: '#ffeb3b' }}><h3>{stats.highestScore || 0}</h3><span style={{opacity: 0.7, fontSize: '0.9rem'}}>Best Score</span></div>
                 </div>
                 
                 <div>
                    <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Match History (With Scores!)</h3>
                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                        {stats.matchLog.slice(-15).reverse().map((m, i) => {
                           const d = new Date(m.date);
                           return (
                               <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: m.won ? 'rgba(83, 141, 78, 0.1)' : 'rgba(200, 50, 50, 0.1)' }}>
                                   <div>
                                       <strong>{m.word.toUpperCase()}</strong> <span style={{ opacity: 0.7, fontSize: '0.8rem' }}>({m.level})</span>
                                       <div style={{ opacity: 0.5, fontSize: '0.7rem', marginTop: '0.2rem' }}>
                                           {d.toLocaleDateString()} {d.toLocaleTimeString()} - {m.difficulty}
                                       </div>
                                   </div>
                                   <div style={{ fontSize: '0.9rem', textAlign: 'right' }}>
                                       <div style={{ color: m.won ? '#a8e6cf' : '#ff8b94', fontWeight: 'bold' }}>⭐ {m.score} pts</div>
                                       <div style={{ opacity: 0.7, fontSize: '0.8rem' }}>{m.won ? `${m.guesses}/6 guesses` : 'Failed'}</div>
                                   </div>
                               </div>
                           );
                        })}
                        {stats.matchLog.length === 0 && <p style={{opacity: 0.5, textAlign: 'center', padding: '1rem'}}>No matches yet.</p>}
                    </div>
                 </div>
             </div>
          </div>
      );
  }

  return (
    <div className="wordle-page page-transition">
      
      {/* TOP CONTROLS (Difficulty & Stats) */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem', width: '100%' }}>
          <select 
             value={difficulty} 
             onChange={(e) => {
                 setDifficulty(e.target.value);
                 startNewGame(e.target.value);
             }} 
             className="glass-select" 
             style={{ padding: '0.4rem 1rem', borderRadius: '20px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.2)', outline: 'none', cursor: 'pointer' }}
          >
              <option value="Random" style={{ color: 'black' }}>Random (All)</option>
              <option value="Hardmode" style={{ color: 'black' }}>Hardmode (B2-C1)</option>
          </select>
          <button 
             className="modal-btn secondary" 
             style={{ padding: '0.4rem 1rem', borderRadius: '20px', margin: 0, minWidth: 0, fontSize: '0.9rem' }} 
             onClick={() => setGameState('stats')}
          >
             📊 Stats
          </button>
      </div>

      {/* TIMER DISPLAY */}
      <div className="glass-panel" style={{ padding: '0.5rem 1.5rem', marginBottom: '1.5rem', borderRadius: '50px', background: timeMs <= 30000 ? 'rgba(255, 50, 50, 0.2)' : '' }}>
         <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: timeMs <= 30000 ? '#ff8b94' : 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             ⏱ {formatTime(timeMs)}
             {timerStatus === 'idle' && <span style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 'normal' }}>(Starts on type)</span>}
         </div>
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
        <div className="modal-overlay" onClick={() => startNewGame(difficulty)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-status">
              {gameResult === 'won' ? 'You Won! 🎉' : 'Time/Guesses Over! 😔'}
            </div>
            
            <div style={{ margin: '1rem 0', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                <h3 style={{ margin: 0, color: gameResult === 'won' ? '#a8e6cf' : '#ff8b94' }}>Total Score: {finalScore}</h3>
                {gameResult === 'won' && <p style={{ opacity: 0.7, fontSize: '0.8rem', marginTop: '0.5rem' }}>Earned by guesses ({currentRow}) & time left ({formatTime(timeMs)})</p>}
            </div>

            <div className="modal-word-card">
              <div className="modal-emoji">{secretEntry?.emoji || '📘'}</div>
              <div className="modal-word-info">
                <div className="modal-word">{secretEntry?.word.toUpperCase()}</div>
                <div className="modal-pos-level">
                  <span className="modal-level">{secretEntry?.level}</span>
                  <span className="modal-pos">{secretEntry?.partOfSpeech}</span>
                </div>
                <div className="modal-definition">
                  {secretEntry?.definition || 'No definition yet.'}
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="modal-btn secondary" onClick={() => setGameState('stats')}>
                 View Stats
              </button>
              <button className="modal-btn primary" onClick={() => startNewGame(difficulty)}>
                 Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
