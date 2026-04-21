import os

CSS_PATH = r'c:\CODE\PROJECTS\Wordle-Oxford\src\index.css'

with open(CSS_PATH, 'rb') as f:
    content = f.read()

# Look for the start of the corrupted block
# It starts after .solver-clear-btn:hover { background: rgba(239,68,68,0.2); }
# and ends before COMPETITION PAGE

start_marker = b'.solver-clear-btn:hover { background: rgba(239,68,68,0.2); }'
end_marker = b'/* \xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90' # Start of COMPETITION PAGE or similar boxed labels

start_idx = content.find(start_marker)
if start_idx == -1:
    print("Start marker not found")
    exit(1)

# Find where the corruption ends. We know the COMPETITION PAGE part follows.
# Looking for "COMPETITION PAGE" string
comp_idx = content.find(b'COMPETITION PAGE')
if comp_idx == -1:
    print("Competition marker not found")
    exit(1)

# The end of the section we want to replace is the start of the box label for COMPETITION PAGE
# Let's find the nearest /* marker before "COMPETITION PAGE"
end_idx = content.rfind(b'/*', 0, comp_idx)
if end_idx == -1:
    end_idx = comp_idx

new_section = b"""
.solver-clear-btn:hover { background: rgba(239,68,68,0.2); }

/* \xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90
   TRAIN PAGE
\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90\xe2\x95\x90 */
.train-level-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  justify-content: center;
}
.train-label {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 500;
}
.train-level-btn {
  padding: 0.4rem 0.9rem;
  border-radius: 20px;
  border: 1px solid var(--border-subtle);
  background: rgba(255,255,255,0.06);
  color: var(--text-muted);
  font-size: 0.85rem;
  font-family: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.train-level-btn:hover { background: rgba(255,255,255,0.12); color: var(--text-main); }
.train-level-btn.active {
  background: linear-gradient(135deg, rgba(124,58,237,0.4), rgba(59,130,246,0.4));
  color: #fff;
  border-color: rgba(124,58,237,0.6);
}

.train-meta-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 550px;
  background: var(--glass-bg);
  backdrop-filter: blur(8px);
  padding: 0.8rem 1.4rem;
  border-radius: 16px;
  border: 1px solid var(--border-subtle);
  margin-top: 0.5rem;
  gap: 1rem;
}

.meta-left { flex: 1; display: flex; justify-content: flex-start; }
.meta-center { flex: 1; display: flex; justify-content: center; }
.meta-right { flex: 1; display: flex; justify-content: flex-end; }

/* Dropdown */
.timer-select {
  background: rgba(255,255,255,0.08);
  border: 1px solid var(--border-subtle);
  color: var(--text-main);
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
}
.timer-select:focus { border-color: var(--primary-light); }

/* Timer */
.timer-display {
  font-size: 1.25rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.timer-display.active {
  color: #a78bfa;
  transform: scale(1.05);
}

/* Compact Stats */
.compact-stats {
  display: flex;
  gap: 1.2rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}
.compact-stats span {
  display: flex;
  align-items: center;
  gap: 5px;
}
.compact-stats b { color: var(--text-main); }

@media (max-width: 480px) {
  .train-meta-bar {
    padding: 0.6rem 1rem;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.8rem;
  }
  .meta-left, .meta-center, .meta-right {
    flex: none;
  }
  .compact-stats { gap: 0.8rem; font-size: 0.8rem; }
}

"""

fixed_content = content[:start_idx] + new_section.strip() + b"\n\n" + content[end_idx:]

with open(CSS_PATH, 'wb') as f:
    f.write(fixed_content)

print("Fixed index.css successfully")
