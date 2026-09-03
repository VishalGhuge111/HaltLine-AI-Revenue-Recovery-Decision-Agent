// Shared layout constants / styles that aren't components.

// One shared outer-container style so every page aligns to the same width and
// gutter inside the routed content frame. Narrower reading widths (forms, prose)
// are applied to inner elements, not here.
export const PAGE = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '32px 40px 80px',
};

// The search box width, shared by the TopBar's global "Search pages…" field and
// each list page's own toolbar search field so the two read as one pattern.
export const SEARCH_WIDTH = 230;

export const searchInputStyle = {
  width: SEARCH_WIDTH,
  fontSize: 13.5,
  padding: '9px 12px 9px 32px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-strong)',
  background: 'var(--surface)',
  outline: 'none',
};
