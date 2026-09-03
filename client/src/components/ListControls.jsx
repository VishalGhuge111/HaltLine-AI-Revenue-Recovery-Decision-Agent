import { searchInputStyle } from '../pageStyle';

const PAGE_SIZES = [10, 25, 50];

const controlStyle = {
  fontSize: 13.5,
  fontWeight: 500,
  color: 'var(--text-primary)',
  padding: '9px 30px 9px 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-strong)',
  background:
    "var(--surface) url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239c9ca5' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\") no-repeat right 11px center",
  appearance: 'none',
  cursor: 'pointer',
  outline: 'none',
};

const fieldLabelStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4v16M8 4l-3 3M8 4l3 3M16 20V4M16 20l-3-3M16 20l3-3" />
    </svg>
  );
}

function RowsIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function SearchField({ value, onChange, placeholder }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <span style={{ position: 'absolute', left: 11, color: 'var(--text-tertiary)', display: 'flex', pointerEvents: 'none' }}>
        <SearchIcon />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...searchInputStyle, paddingRight: 30 }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          style={{
            position: 'absolute',
            right: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            border: 'none',
            background: 'transparent',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            fontSize: 14,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// Row above a table. Left: search + result count. Right: sort + page-size.
// Pass `onSearch` (and `search`) to enable the search field; omit for a
// list with no search.
export function ListToolbar({
  view,
  noun = 'result',
  sortLabel = 'Sort',
  search = '',
  onSearch,
  searchPlaceholder = 'Search…',
}) {
  const { filteredCount, total, searchActive, sortKey, sortOptions, setSortKey, pageSize, setPageSize } = view;
  const plural = filteredCount === 1 ? noun : `${noun}s`;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 18,
        flexWrap: 'wrap',
        marginBottom: 16,
        padding: '14px 18px',
        background: 'var(--surface-sunken)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        {onSearch && <SearchField value={search} onChange={onSearch} placeholder={searchPlaceholder} />}
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
          {searchActive ? (
            <>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{filteredCount}</span> of {total} match
            </>
          ) : (
            <>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{total}</span> {plural}
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {sortOptions.length > 0 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={fieldLabelStyle}>
              <SortIcon />
              {sortLabel}
            </span>
            <select value={sortKey ?? ''} onChange={(e) => setSortKey(e.target.value)} style={controlStyle}>
              {sortOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={fieldLabelStyle}>
            <RowsIcon />
            Per page
          </span>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} style={controlStyle}>
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function PagerButton({ children, disabled, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 12.5,
        fontWeight: 600,
        padding: '6px 12px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-strong)',
        background: 'var(--surface)',
        color: disabled ? 'var(--text-tertiary)' : 'var(--text-primary)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  );
}

// Row below a table: page position + prev/next. Renders nothing for a single page.
export function ListPagination({ view }) {
  const { page, totalPages, rangeStart, rangeEnd, filteredCount, goPage } = view;
  if (totalPages <= 1) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        marginTop: 14,
      }}
    >
      <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
        {rangeStart}–{rangeEnd} of {filteredCount}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <PagerButton onClick={() => goPage(page - 1)} disabled={page <= 1} label="Previous page">
          ‹ Prev
        </PagerButton>
        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500, minWidth: 78, textAlign: 'center' }}>
          Page {page} / {totalPages}
        </span>
        <PagerButton onClick={() => goPage(page + 1)} disabled={page >= totalPages} label="Next page">
          Next ›
        </PagerButton>
      </div>
    </div>
  );
}
