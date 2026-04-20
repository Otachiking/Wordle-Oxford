import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import DictionaryPage from './pages/DictionaryPage';
import WordlePage from './pages/WordlePage';
import SolverPage from './pages/SolverPage';
import './index.css';

function Nav() {
  return (
    <nav className="main-nav">
      <div className="nav-brand">
        Wordle<span>Oxford</span>
        <img src="https://upload.wikimedia.org/wikipedia/en/a/ae/Flag_of_the_United_Kingdom.svg" alt="GB" className="gb-flag" />
      </div>
      <div className="nav-links">
        <NavLink to="/play" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Casual 🎮
        </NavLink>
        <NavLink to="/solver" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Solver 🔍
        </NavLink>
        <NavLink to="/dictionary" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Dictionary 📖
        </NavLink>
      </div>
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
        <Route path="/solver" element={<SolverPage />} />
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
