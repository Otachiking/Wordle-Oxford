import React, { useEffect, useMemo, useState } from 'react';
import { loadHistoryLog } from '../utils/historyManager';

export default function HistoryModal({ open, onClose, title = 'Game History' }) {
  const [sortField, setSortField] = useState('date');
  const [filterGame, setFilterGame] = useState('All');

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const fullHistoryLog = useMemo(() => {
    if (!open) return [];
    return loadHistoryLog();
  }, [open]);

  const displayLog = useMemo(() => {
    let log = [...fullHistoryLog];
    if (filterGame !== 'All') {
      log = log.filter((item) => item.game === filterGame);
    }

    switch (sortField) {
      case 'score':
        return log.sort((a, b) => (b.score || 0) - (a.score || 0));
      case 'level':
        return log.sort((a, b) => (a.level || '').localeCompare(b.level || ''));
      default:
        return log.sort((a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf());
    }
  }, [fullHistoryLog, sortField, filterGame]);

  const winCount = fullHistoryLog.filter((m) => m.won).length;
  const winRate = fullHistoryLog.length === 0 ? 0 : Math.round((winCount / fullHistoryLog.length) * 100);
  const bestScore = fullHistoryLog.reduce((max, m) => Math.max(max, m.score || 0), 0);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-card" style={{ width: '92%', maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h2 style={{ margin: 0 }}>{title} 📚</h2>
          <button className="modal-btn secondary" style={{ margin: 0, padding: '0.45rem 0.85rem', flex: 'none' }} onClick={onClose}>
            Close✖️
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', gap: '0.5rem' }}>
          <div style={{ textAlign: 'center' }}><h3 style={{ margin: 0 }}>{fullHistoryLog.length}</h3><span style={{ opacity: 0.7, fontSize: '0.78rem' }}>Played</span></div>
          <div style={{ textAlign: 'center' }}><h3 style={{ margin: 0 }}>{winCount}</h3><span style={{ opacity: 0.7, fontSize: '0.78rem' }}>Won</span></div>
          <div style={{ textAlign: 'center' }}><h3 style={{ margin: 0 }}>{winRate}%</h3><span style={{ opacity: 0.7, fontSize: '0.78rem' }}>Win Rate</span></div>
          <div style={{ textAlign: 'center', color: '#ffeb3b' }}><h3 style={{ margin: 0 }}>{bestScore}</h3><span style={{ opacity: 0.7, fontSize: '0.78rem' }}>Best Score</span></div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.9rem', alignItems: 'center' }}>
          <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>Sort:</span>
          {[['date', 'Time 🕐'], ['score', 'Score ⭐'], ['level', 'Level 📚']].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setSortField(v)}
              style={{
                padding: '0.3rem 0.7rem',
                fontSize: '0.8rem',
                borderRadius: '8px',
                border: 'none',
                background: sortField === v ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.07)',
                color: sortField === v ? '#a78bfa' : 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {label}
            </button>
          ))}

          <select
            value={filterGame}
            onChange={(e) => setFilterGame(e.target.value)}
            style={{
              marginLeft: '0.3rem',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '0.3rem 0.5rem',
              fontSize: '0.8rem',
            }}
          >
            <option style={{ color: '#000' }} value="All">All Games</option>
            <option style={{ color: '#000' }} value="Daily">Daily</option>
            <option style={{ color: '#000' }} value="Train">Train</option>
            <option style={{ color: '#000' }} value="Comp">Comp</option>
          </select>
        </div>

        <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.4rem', scrollbarWidth: 'thin' }}>
          {displayLog.map((m, i) => {
            const d = new Date(m.date);
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: m.won ? 'rgba(83,141,78,0.08)' : 'rgba(200,50,50,0.08)',
                  borderRadius: '8px',
                  marginBottom: '0.3rem',
                }}
              >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <strong>{(m.word || '').toUpperCase()}</strong>
                      <span style={{ opacity: 0.7, fontSize: '0.8rem' }}>({m.level || '-'})</span>
                      <span style={{ fontSize: '0.85rem' }}>
                        {m.game === 'Comp' ? '🏆' : m.game === 'Train' ? '💪🏻' : '🎮'}
                      </span>
                    </div>
                    <div style={{ opacity: 0.5, fontSize: '0.72rem', marginTop: '0.15rem' }}>
                      {d.toLocaleDateString()} {d.toLocaleTimeString()} · {m.game || '-'}
                      {m.durationMs > 0 && ` · ⏱️ ${Math.floor(m.durationMs / 60000)}:${((m.durationMs % 60000) / 1000).toFixed(0).padStart(2, '0')}`}
                    </div>
                  </div>
                <div style={{ fontSize: '0.9rem', textAlign: 'right' }}>
                  <div style={{ color: m.won ? '#a8e6cf' : '#ff8b94', fontWeight: 'bold' }}>{m.score || 0} pts ⭐</div>
                  <div style={{ opacity: 0.7, fontSize: '0.8rem' }}>{m.won ? `${m.guesses}/6` : 'Failed'}</div>
                </div>
              </div>
            );
          })}
          {displayLog.length === 0 && <p style={{ opacity: 0.5, textAlign: 'center', padding: '1rem' }}>No history found.</p>}
        </div>
      </div>
    </div>
  );
}
