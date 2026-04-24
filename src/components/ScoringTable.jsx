import React from 'react';

const ScoringTable = () => {
  return (
    <div className="scoring-rules-container">
      <h4 className="scoring-rules-title">Scoring Logic (WordleCup.io)</h4>
      <div className="scoring-grid">
        <div className="scoring-section">
          <h5>Solving Time (Speed)</h5>
          <table className="scoring-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>0 - 30s (Q1)</td><td className="pts">+40</td></tr>
              <tr><td>30s - 1m (Q2)</td><td className="pts">+30</td></tr>
              <tr><td>1m - 1.5m (Q3)</td><td className="pts">+20</td></tr>
              <tr><td>1.5m - 2m (Q4)</td><td className="pts">+10</td></tr>
            </tbody>
          </table>
        </div>
        <div className="scoring-section">
          <h5>Tries Taken (Skill)</h5>
          <table className="scoring-table">
            <thead>
              <tr>
                <th>Tries</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>1 Try</td><td className="pts">+60</td></tr>
              <tr><td>2 Tries</td><td className="pts">+50</td></tr>
              <tr><td>3 Tries</td><td className="pts">+40</td></tr>
              <tr><td>4 Tries</td><td className="pts">+30</td></tr>
              <tr><td>5 Tries</td><td className="pts">+20</td></tr>
              <tr><td>6 Tries</td><td className="pts">+10</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="scoring-footer">
        <p>⚠️ <span>-5 points</span> deducted for each hint used.</p>
      </div>
    </div>
  );
};

export default ScoringTable;
