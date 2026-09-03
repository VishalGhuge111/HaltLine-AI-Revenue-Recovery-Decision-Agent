import { useMemo, useState } from 'react';

// Shared client-side list mechanics: search filter + sort + pagination over an
// already-fetched array. Search term comes from the TopBar (via outlet
// context); everything else is local UI state. Pure - no data fetching.
//
//   sortOptions: [{ key, label, compare(a, b) }]
//   searchFields: array of key strings or (item) => string
export function useListView(
  items,
  { searchTerm = '', searchFields = [], sortOptions = [], initialSort, initialPageSize = 25 } = {},
) {
  const list = items || [];
  const [sortKey, setSortKey] = useState(initialSort ?? sortOptions[0]?.key ?? null);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [page, setPage] = useState(1);

  const term = searchTerm.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!term) return list;
    return list.filter((item) =>
      searchFields.some((field) => {
        const raw = typeof field === 'function' ? field(item) : item[field];
        return raw != null && String(raw).toLowerCase().includes(term);
      }),
    );
    // searchFields is expected to be a module-scope constant per page
    // eslint-disable-next-line
  }, [list, term]);

  const sorted = useMemo(() => {
    const option = sortOptions.find((o) => o.key === sortKey);
    if (!option?.compare) return filtered;
    return [...filtered].sort(option.compare);
  }, [filtered, sortOptions, sortKey]);

  const filteredCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const visible = sorted.slice(start, start + pageSize);

  return {
    visible,
    total: list.length,
    filteredCount,
    searchActive: Boolean(term),
    page: safePage,
    totalPages,
    rangeStart: filteredCount === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + pageSize, filteredCount),
    pageSize,
    sortKey,
    sortOptions,
    setSortKey: (key) => {
      setSortKey(key);
      setPage(1);
    },
    setPageSize: (n) => {
      setPageSizeState(n);
      setPage(1);
    },
    goPage: (p) => setPage(Math.min(Math.max(1, p), totalPages)),
  };
}
