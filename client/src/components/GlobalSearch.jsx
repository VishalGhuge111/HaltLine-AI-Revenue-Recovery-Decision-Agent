import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_NAV_ITEMS } from '../nav';
import { searchInputStyle, SEARCH_WIDTH } from '../pageStyle';

// Navigational search - jump to any page by name. Distinct from each list
// page's own data filter. Client-side only; the page list comes straight from
// nav.js so it stays in sync with the sidebar.
function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  const term = q.trim().toLowerCase();
  const results = term ? ALL_NAV_ITEMS.filter((i) => i.label.toLowerCase().includes(term)) : ALL_NAV_ITEMS;

  useEffect(() => {
    if (!open) return undefined;
    const onDocMouseDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  function go(item) {
    if (!item) return;
    navigate(item.to);
    setOpen(false);
    setQ('');
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      setOpen(false);
      e.currentTarget.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[active]);
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span style={{ position: 'absolute', left: 11, color: 'var(--text-tertiary)', display: 'flex', pointerEvents: 'none' }}>
          <SearchIcon />
        </span>
        <input
          type="text"
          value={q}
          placeholder="Search pages…"
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          style={searchInputStyle}
        />
      </div>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: SEARCH_WIDTH,
            maxHeight: 320,
            overflowY: 'auto',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            padding: 5,
            zIndex: 30,
          }}
        >
          {results.length === 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', padding: '8px 10px' }}>No pages match “{q}”.</div>
          )}
          {results.map((item, i) => (
            <button
              key={item.to}
              type="button"
              onClick={() => go(item)}
              onMouseEnter={() => setActive(i)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-primary)',
                padding: '7px 10px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: i === active ? 'var(--surface-sunken)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
