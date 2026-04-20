import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import dictData from '../assets/full_dict.json';

// --- Helper: get divider key based on sortBy ---
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

// Level color map
const levelColors = {
  A1: '#4ade80', A2: '#86efac',
  B1: '#facc15', B2: '#fbbf24',
  C1: '#f87171', C2: '#ef4444',
  UNRATED: '#94a3b8',
};

const DictionaryPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [filterLength, setFilterLength] = useState('5');
  const [sortBy, setSortBy] = useState('a-z');
  const [colCount, setColCount] = useState(2);

  const processedData = useMemo(() => {
    let result = dictData;
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

  // Split sections into 3 balanced columns
  const wordCount = processedData.length;
  const colSize = Math.ceil(wordCount / colCount);

  const columns = useMemo(() => {
    const cols = Array.from({ length: colCount }, () => []);
    let colIdx = 0;
    let wordInColCount = 0;

    for (const row of sections) {
      if (colIdx >= colCount) break;
      cols[colIdx].push(row);
      if (row.type === 'word') {
        wordInColCount++;
        if (wordInColCount >= colSize && colIdx < (colCount - 1)) {
          colIdx++;
          wordInColCount = 0;
        }
      }
    }
    return cols;
  }, [sections, colSize, colCount]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="title-glow">Oxford Learner’s Dictionary</h1>
        <p className="dict-subtitle">
          Showing {processedData.length.toLocaleString()} out of 4,654 words &nbsp;|&nbsp; Common Wordlist A1-C1
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
          {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        <select className="dropdown-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="a-z">A → Z</option>
          <option value="z-a">Z → A</option>
          <option value="level-asc">A1 → C2</option>
          <option value="level-desc">C2 → A1</option>
          <option value="length-asc">Shortest</option>
          <option value="length-desc">Longest</option>
        </select>

        <select className="dropdown-select" value={colCount} onChange={e => setColCount(parseInt(e.target.value))}>
          <option value={1}>1 Column</option>
          <option value={2}>2 Column</option>
          <option value={3}>3 Column</option>
        </select>
      </section>

      <div className="dict-grid" style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}>
        {columns.map((col, ci) => (
          <div key={ci} className="dict-col">
            {col.map((row, ri) =>
              row.type === 'divider' ? (
                <div key={`d-${row.key}-${ri}`} className="dict-divider">
                  <span className="dict-divider-label">{row.key}</span>
                </div>
              ) : (
                <div key={row.item.id} className="word-row">
                  <span className="word-row-word">{row.item.word}</span>
                  <span className="word-row-emoji">{row.item.emoji || '📘'}</span>
                  <span className="word-row-definition">{row.item.definition || 'No definition yet...'}</span>
                  <span className="word-row-meta">
                    {row.item.partOfSpeech} &bull; {(row.item.nWord || 5)}L
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
