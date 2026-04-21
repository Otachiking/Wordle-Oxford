import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import DictionaryPage from './pages/DictionaryPage';
import WordlePage from './pages/WordlePage';
import SolverPage from './pages/SolverPage';
import CompetitionPage from './pages/CompetitionPage';
import TrainPage from './pages/TrainPage';
import './index.css';

const NAV_LINKS = [
  { to: '/play', label: 'Daily 🎮' },
  { to: '/train', label: 'Train 💪🏻' },
  { to: '/competition', label: 'Comp 🏆' },
  { to: '/solver', label: 'Solver 🔍' },
  { to: '/dictionary', label: 'Dict 📖' },
];

function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [location]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (!e.target.closest('.main-nav')) setMenuOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuOpen]);

  return (
    <nav className="main-nav">
      <div className="nav-brand">
        Wordle<span>Oxford</span>
        <img src="https://upload.wikimedia.org/wikipedia/en/a/ae/Flag_of_the_United_Kingdom.svg" alt="GB" className="gb-flag" />
      </div>

      {/* Desktop nav */}
      <div className="nav-links nav-links-desktop">
        {NAV_LINKS.map(({ to, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            {label}
          </NavLink>
        ))}
      </div>

      {/* Hamburger button (mobile only) */}
      <button
        className={`hamburger-btn${menuOpen ? ' open' : ''}`}
        onClick={() => setMenuOpen(o => !o)}
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
      >
        <span /><span /><span />
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="nav-mobile-menu">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'nav-mobile-link active' : 'nav-mobile-link'}>
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<WordlePage />} />
        <Route path="/play" element={<WordlePage />} />
        <Route path="/train" element={<TrainPage />} />
        <Route path="/solver" element={<SolverPage />} />
        <Route path="/competition" element={<CompetitionPage />} />
        <Route path="/dictionary" element={<DictionaryPage />} />
      </Routes>
      <footer className="app-footer">
        <div>
          Made by <a href="https://portfolio-otachiking.vercel.app/" target="_blank" rel="noreferrer">Muhammad Iqbal Rasyid</a> 🦊 | Source from <a href="https://www.oxfordlearnersdictionaries.com/wordlists/oxford3000-5000" target="_blank" rel="noreferrer">Oxford Learners Dictionary</a> 💂🏻
        </div>
      </footer>
    </BrowserRouter>
  );
}
