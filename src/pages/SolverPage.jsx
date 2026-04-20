import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import fullDict from '../assets/full_dict.json';

const levelColors = {
  'A1': '#4ade80',
  'A2': '#00a674',
  'B1': '#ef9700',
  'B2': '#a65f00',
  'C1': '#ce1532',
  'C2': '#a60046',
  'UNRATED': '#94a3b8'
};

export default function SolverPage() {
  const [green, setGreen] = useState(Array(5).fill(''));
  const [yellowRows, setYellowRows] = useState([Array(5).fill('')]);
  const [grey, setGrey] = useState(Array(10).fill('')); // Start with 2 rows of 5

  const updateGreen = (idx, val) => {
    const nv = [...green];
    nv[idx] = val.toUpperCase().slice(0, 1);
    setGreen(nv);
  };

  const updateYellow = (rowIdx, colIdx, val) => {
    const nv = [...yellowRows];
    nv[rowIdx][colIdx] = val.toUpperCase().slice(0, 1);

    // Add row if current row gets fully filled
    if (nv[rowIdx].some(v => v !== '')) {
      if (nv[nv.length - 1].some(v => v !== '')) {
        nv.push(Array(5).fill(''));
      }
    }
    setYellowRows(nv);
  };

  const updateGrey = (idx, val) => {
    const nv = [...grey];
    nv[idx] = val.toUpperCase().slice(0, 1);

    // Dynamic rows logic
    const lastRowEmpty = nv.slice(-5).every(x => x === '');
    const secondLastRowEmpty = nv.length >= 10 && nv.slice(-10, -5).every(x => x === '');

    if (!lastRowEmpty) {
      nv.push(...Array(5).fill(''));
    } else if (secondLastRowEmpty && nv.length > 10) {
      // Cleanup extra empty rows if possible
      nv.splice(-5);
    }

    setGrey(nv);
  };

  const filteredWords = useMemo(() => {
    const pool = fullDict.filter(i => i.nWord === 5);
    if (!green.some(x => x) && !yellowRows[0].some(x => x) && !grey.some(x => x)) {
      return pool; // no filter return all
    }

    const requiredCounts = {};
    for (let g of green) if (g) requiredCounts[g] = (requiredCounts[g] || 0) + 1;

    // We roughly track yellow requirements
    const yellowReq = {};
    yellowRows.forEach(r => {
      const rowCounts = {};
      r.forEach(y => { if (y) rowCounts[y] = (rowCounts[y] || 0) + 1; });
      for (const k in rowCounts) {
        yellowReq[k] = Math.max(yellowReq[k] || 0, rowCounts[k]);
      }
    });

    for (const k in yellowReq) {
      requiredCounts[k] = Math.max(requiredCounts[k] || 0, yellowReq[k]);
    }

    return pool.filter(item => {
      const w = item.word.toUpperCase();

      // Green
      for (let i = 0; i < 5; i++) {
        if (green[i] && w[i] !== green[i]) return false;
      }

      // Yellow
      for (const yRow of yellowRows) {
        for (let i = 0; i < 5; i++) {
          const y = yRow[i];
          if (y) {
            if (!w.includes(y)) return false;
            if (w[i] === y) return false; // same pos
          }
        }
      }

      // Grey (with exact count)
      for (const g of grey) {
        if (g) {
          const allowed = requiredCounts[g] || 0;
          const actual = w.split('').filter(c => c === g).length;
          if (actual > allowed) return false;
        }
      }

      return true;
    });

  }, [green, yellowRows, grey]);

  const handleKeyDown = (e) => {
    if (!e.target.classList.contains('s-input')) return;
    const inputs = Array.from(document.querySelectorAll('.s-input'));
    const idx = inputs.indexOf(e.target);
    if (idx === -1) return;

    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      if (idx + 1 < inputs.length) inputs[idx + 1].focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (idx - 1 >= 0) inputs[idx - 1].focus();
    } else if (e.key === 'Backspace' && !e.target.value) {
      e.preventDefault();
      if (idx - 1 >= 0) inputs[idx - 1].focus();
    }
  };

  const wrapChange = (fn) => (e) => {
    fn(e);
    if (e.target.value) {
      setTimeout(() => {
        const inputs = Array.from(document.querySelectorAll('.s-input'));
        const idx = inputs.indexOf(e.target);
        if (idx !== -1 && idx + 1 < inputs.length) inputs[idx + 1].focus();
      }, 10);
    }
  };

  return (
    <div className="solver-container" onKeyDown={handleKeyDown}>
      <div className="solver-left">
        <div className="solver-group">
          <h3><span className="box-icon green"></span> Green Letters:</h3>
          <div className="solver-input-row">
            {green.map((val, i) => (
              <input key={i} className="s-input green" value={val} onChange={wrapChange(e => updateGreen(i, e.target.value))} />
            ))}
          </div>
        </div>

        <div className="solver-group">
          <h3><span className="box-icon yellow"></span> Yellow Letters:</h3>
          <p className="s-hint">Place them exactly where they appeared</p>
          <div className="solver-multi-rows">
            {yellowRows.map((row, ri) => (
              <div key={ri} className="solver-input-row">
                {row.map((val, ci) => (
                  <input key={ci} className="s-input yellow" value={val} onChange={wrapChange(e => updateYellow(ri, ci, e.target.value))} />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="solver-group">
          <h3><span className="box-icon grey"></span> Global excluded:</h3>
          <div className="solver-multi-rows grey-rows">
            {Array.from({ length: grey.length / 5 }).map((_, ri) => (
              <div key={ri} className="solver-input-row">
                {grey.slice(ri * 5, ri * 5 + 5).map((val, ci) => (
                  <input key={ci} className="s-input grey" value={val} onChange={wrapChange(e => updateGrey(ri * 5 + ci, e.target.value))} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="solver-right">
        <div className="s-header">
          <h2>WordleOxford Solver</h2>
          <p>Just type and it'll immediately search it for you</p>
        </div>
        <div className="s-results-container">
          {filteredWords.slice(0, 50).map(w => (
            <div key={w.id} className="s-result-item" style={{ borderLeftColor: levelColors[w.level] || '#94a3b8' }}>
              {w.word.toUpperCase()}
            </div>
          ))}
          {filteredWords.length > 50 && (
            <div className="s-more">
              and {filteredWords.length - 50} more... <Link to="/dictionary">Check Dictionary 📖</Link>
            </div>
          )}
          {filteredWords.length === 0 && <div className="s-more">No words match...</div>}
        </div>
      </div>
    </div>
  );
}
