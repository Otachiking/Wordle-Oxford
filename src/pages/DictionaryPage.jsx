import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import dictData from '../DICTIONARY_nWord_5.json';
import { loadWordTicks } from '../utils/historyManager';

// ── Helper: divider key ────────────────────────────────────────────────────
function getDividerKey(item, sortBy) {
  switch (sortBy) {
    case 'a-z':
    case 'z-a':
      return item.word[0].toUpperCase();
    case 'level-asc':
    case 'level-desc':
      return item.level;
    case 'length-asc':
    case 'length-desc':
      return `${item.nWord} Letters`;
    default:
      return item.word[0].toUpperCase();
  }
}

// Level color map — C2 removed
const levelColors = {
  A1: '#4ade80', A2: '#86efac',
  B1: '#facc15', B2: '#fbbf24',
  C1: '#f87171',
  UNRATED: '#94a3b8',
};

const DictionaryPage = () => {
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('dictSearch') || '');
  const [filterLevel, setFilterLevel] = useState(() => localStorage.getItem('dictLevel') || 'ALL');
  const [filterLength, setFilterLength] = useState(() => localStorage.getItem('dictLength') || '5');
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('dictSort') || 'a-z');
  const [colCount, setColCount] = useState(() => parseInt(localStorage.getItem('dictCol')) || 2);
  const [isPhoneViewport, setIsPhoneViewport] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 900;
  });

  React.useEffect(() => {
    const onResize = () => setIsPhoneViewport(window.innerWidth <= 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  React.useEffect(() => {
    localStorage.setItem('dictSearch', searchTerm);
    localStorage.setItem('dictLevel', filterLevel);
    localStorage.setItem('dictLength', filterLength);
    localStorage.setItem('dictSort', sortBy);
    localStorage.setItem('dictCol', colCount.toString());
  }, [searchTerm, filterLevel, filterLength, sortBy, colCount]);

  const wordTicks = useMemo(() => loadWordTicks(), []);
  const displayColCount = isPhoneViewport ? 1 : colCount;

  const processedData = useMemo(() => {
    let result = dictData.filter(item => item.level !== 'C2'); // Remove C2
    if (searchTerm) {
      result = result.filter(item =>
        item.word.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterLevel !== 'ALL') {
      result = result.filter(item => item.level === filterLevel);
    }
    if (filterLength !== 'ALL') {
      result = result.filter(item => item.nWord === parseInt(filterLength));
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'a-z': return a.word.localeCompare(b.word);
        case 'z-a': return b.word.localeCompare(a.word);
        case 'level-asc': return a.level.localeCompare(b.level);
        case 'level-desc': return b.level.localeCompare(a.level);
        case 'length-asc': return a.nWord - b.nWord;
        case 'length-desc': return b.nWord - a.nWord;
        default: return 0;
      }
    });

    return result;
  }, [searchTerm, filterLevel, filterLength, sortBy]);

  // Group into sections with divider keys
  const sections = useMemo(() => {
    const groups = [];
    let lastKey = null;

    for (const item of processedData) {
      const key = getDividerKey(item, sortBy);
      if (key !== lastKey) {
        groups.push({ type: 'divider', key });
        lastKey = key;
      }
      groups.push({ type: 'word', item });
    }
    return groups;
  }, [processedData, sortBy]);

  const wordCount = processedData.length;
  const colSize = Math.ceil(wordCount / displayColCount);

  const columns = useMemo(() => {
    const cols = Array.from({ length: displayColCount }, () => []);
    let colIdx = 0;
    let wordInColCount = 0;

    for (const row of sections) {
      if (colIdx >= displayColCount) break;
      cols[colIdx].push(row);
      if (row.type === 'word') {
        wordInColCount++;
        if (wordInColCount >= colSize && colIdx < (displayColCount - 1)) {
          colIdx++;
          wordInColCount = 0;
        }
      }
    }
    return cols;
  }, [sections, colSize, displayColCount]);

  // Tick indicator colors
  const getTickColor = (word) => {
    const tick = wordTicks[word.toLowerCase()];
    if (tick === 'correct') return '#22c55e'; // green
    if (tick === 'wrong') return '#ef4444';   // red
    return '#4a5068';                          // grey = unplayed
  };

  const playedCount = useMemo(() => Object.keys(wordTicks).length, [wordTicks]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="title-glow">Oxford Learner's Dictionary</h1>
        <p className="dict-subtitle">
          Showing {processedData.length.toLocaleString()} words &nbsp;|&nbsp;
          Found: <strong style={{ color: '#a78bfa' }}>{playedCount.toLocaleString()}</strong> &nbsp;|&nbsp;
          Common Wordlist A1–C1
        </p>
      </header>

      <section className="controls-glass">
        <div className="search-bar">
          <Search size={18} color="#8b92a5" className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search words..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <select className="dropdown-select" value={filterLength} onChange={e => setFilterLength(e.target.value)}>
          <option value="ALL">All Lengths</option>
          {[4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} Letters</option>)}
        </select>

        <select className="dropdown-select" value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
          <option value="ALL">All Levels</option>
          {['A1', 'A2', 'B1', 'B2', 'C1'].map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        <select className="dropdown-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="a-z">A → Z</option>
          <option value="z-a">Z → A</option>
          <option value="level-asc">A1 → C1</option>
          <option value="level-desc">C1 → A1</option>
          <option value="length-asc">Shortest</option>
          <option value="length-desc">Longest</option>
        </select>

        <select className="dropdown-select" value={colCount} onChange={e => setColCount(parseInt(e.target.value))}>
          <option value={1}>1 Column</option>
          <option value={2}>2 Column</option>
          <option value={3}>3 Column</option>
        </select>
      </section>

      <div className="dict-grid" style={{ gridTemplateColumns: `repeat(${displayColCount}, 1fr)` }}>
        {columns.map((col, ci) => (
          <div key={ci} className="dict-col">
            {col.map((row, ri) =>
              row.type === 'divider' ? (
                <div key={`d-${row.key}-${ri}`} className="dict-divider">
                  <span className="dict-divider-label">{row.key}</span>
                </div>
              ) : (
                <div key={row.item.id} className="word-row">
                  {/* Word Tick Indicator */}
                  <span
                    className="word-tick"
                    style={{ color: getTickColor(row.item.word) }}
                    title={wordTicks[row.item.word.toLowerCase()] === 'correct' ? 'Played & Correct' : wordTicks[row.item.word.toLowerCase()] === 'wrong' ? 'Played & Wrong' : 'Not played yet'}
                  >
                    •
                  </span>
                  <span className="word-row-word">{row.item.word}</span>
                  <span className="word-row-emoji">{row.item.emoji || '📘'}</span>
                  <span className="word-row-definition">{row.item.definition || 'No definition yet...'}</span>
                  <span className="word-row-meta">
                    {(row.item.part || row.item.partOfSpeech || '-')} &bull; {(row.item.nWord || 5)}L
                  </span>
                  <span className="word-row-level" style={{ color: levelColors[row.item.level] || '#94a3b8' }}>
                    {row.item.level}
                  </span>
                </div>
              )
            )}
          </div>
        ))}

        {processedData.length === 0 && (
          <div className="empty-state">
            <h3>No words found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DictionaryPage;
