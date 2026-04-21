import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import dictionaryData from '../DICTIONARY_nWord_5.json';

// ── Word Tick: read from trainWordHistory (only Train & Daily track ticks) ──
function loadWordTicks() {
  try {
    const s = localStorage.getItem('trainWordHistory');
    if (s) return JSON.parse(s);
  } catch (e) {}
  return {};
}

const levelColors = {
  'A1': '#4ade80',
  'A2': '#00a674',
  'B1': '#ef9700',
  'B2': '#a65f00',
  'C1': '#ce1532',
  'UNRATED': '#94a3b8'
};

const levelOrder = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, UNRATED: 6 };

export default function DictionaryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('alphabet'); // 'alphabet' | 'level'

  const wordTicks = useMemo(() => loadWordTicks(), []);

  // Use the new dictionary data and exclude C2
  const fullDictData = useMemo(() => dictionaryData.filter(w => w.level !== 'C2'), []);

  const filteredWords = useMemo(() => {
    let result = fullDictData.filter(word => {
      const matchesSearch = word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          word.definition.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = activeFilter === 'ALL' || word.level === activeFilter;
      return matchesSearch && matchesFilter;
    });

    if (sortBy === 'alphabet') {
      result.sort((a, b) => a.word.localeCompare(b.word));
    } else {
      result.sort((a, b) => (levelOrder[a.level] || 9) - (levelOrder[b.level] || 9) || a.word.localeCompare(b.word));
    }
    return result;
  }, [searchTerm, activeFilter, sortBy, fullDictData]);

  const getTickColor = (word) => {
    const status = wordTicks[word.toLowerCase()];
    if (status === 'correct') return '#4ade80';
    if (status === 'wrong') return '#f87171';
    return 'rgba(255,255,255,0.1)';
  };

  const getTickTitle = (word) => {
    const status = wordTicks[word.toLowerCase()];
    if (status === 'correct') return 'Guessed correctly';
    if (status === 'wrong') return 'Failed to guess';
    return 'Not played yet';
  };

  return (
    <div className="dictionary-page">
      <div className="dict-header">
        <h1>Oxford Wordlist</h1>
        <p>A curated dictionary of high-frequency words (A1–C1)</p>
      </div>

      <div className="dict-controls glass-panel">
        <div className="search-bar">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Search words or definitions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <div className="filter-levels">
            {['ALL', 'A1', 'A2', 'B1', 'B2', 'C1'].map(lvl => (
              <button
                key={lvl}
                className={`filter-btn${activeFilter === lvl ? ' active' : ''}`}
                onClick={() => setActiveFilter(lvl)}
              >
                {lvl}
              </button>
            ))}
          </div>
          <div className="sort-group">
             <span className="sort-label">Sort:</span>
             <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
                <option value="alphabet">Alphabet (A-Z)</option>
                <option value="level">Level (A1-C1)</option>
             </select>
          </div>
        </div>
      </div>

      <div className="dict-results-info">
        Showing {filteredWords.length} words
      </div>

      <div className="dict-list glass-panel">
        {filteredWords.length > 0 ? (
          filteredWords.map((word, index) => (
            <div key={index} className="word-row">
              <div
                className="word-tick"
                style={{ color: getTickColor(word.word) }}
                title={getTickTitle(word.word)}
              >
                •
              </div>
              <div className="word-row-main">
                <span className="word-text">{word.word.toUpperCase()}</span>
                <span className="word-emoji">{word.emoji || '📗'}</span>
              </div>
              <div className="word-row-pos">{word.part}</div>
              <div className="word-row-definition">{word.definition}</div>
              <div className="word-row-level" style={{ color: levelColors[word.level] || '#fff' }}>
                {word.level}
              </div>
            </div>
          ))
        ) : (
          <div className="no-results">No words match your search criteria.</div>
        )}
      </div>

      <div className="dict-footer">
        <p>Based on Oxford Learner's Dictionary wordlists.</p>
      </div>
    </div>
  );
}
