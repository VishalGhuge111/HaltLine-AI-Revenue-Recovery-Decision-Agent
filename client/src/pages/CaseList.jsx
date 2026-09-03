import { useEffect, useState } from 'react';
import { PAGE } from '../pageStyle';
import { useNavigate } from 'react-router-dom';
import { fetchCases } from '../api';
import { DecisionBadge, ClassificationBadge } from '../components/StatusBadge';
import { ListToolbar, ListPagination } from '../components/ListControls';
import { SkeletonTable } from '../components/Skeleton';
import { useListView } from '../hooks/useListView';
import { formatAmount, formatDateShort } from '../format';

const COLUMNS = '2.1fr 0.8fr 1fr 1fr 1.3fr';

// Search matches on case id. (The /cases list response doesn't carry customer
// contact/email - only the case detail endpoint does.)
const SEARCH_FIELDS = ['caseId'];

const SORT_OPTIONS = [
  { key: 'recent', label: 'Most recent', compare: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') },
  { key: 'amount-desc', label: 'Amount (high → low)', compare: (a, b) => (b.amount || 0) - (a.amount || 0) },
  { key: 'amount-asc', label: 'Amount (low → high)', compare: (a, b) => (a.amount || 0) - (b.amount || 0) },
];

export function CaseList() {
  const [cases, setCases] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    fetchCases()
      .then((data) => {
        if (!cancelled) setCases(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const view = useListView(cases, {
    searchTerm: search,
    searchFields: SEARCH_FIELDS,
    sortOptions: SORT_OPTIONS,
    initialSort: 'recent',
  });

  return (
    <div style={PAGE}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Revenue cases</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '6px 0 0', maxWidth: 640 }}>
          Every failed payment the system has classified, with the AI's proposal and the policy engine's
          independent decision.
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: 16,
            borderRadius: 'var(--radius-md)',
            background: 'var(--veto-bg)',
            border: '1px solid var(--veto-border)',
            color: 'var(--veto)',
            fontSize: 14,
          }}
        >
          Failed to load cases: {error}
        </div>
      )}

      {!error && cases === null && <SkeletonTable rows={8} columns={5} />}

      {cases && cases.length === 0 && (
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '32px 0' }}>No revenue cases yet.</div>
      )}

      {cases && cases.length > 0 && (
        <>
          <ListToolbar
            view={view}
            noun="case"
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search by case ID…"
          />

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: COLUMNS,
                gap: 12,
                padding: '12px 20px',
                fontSize: 11.5,
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span>Case</span>
              <span>Amount</span>
              <span>Classification</span>
              <span>Decision</span>
              <span>Time</span>
            </div>

            {view.visible.length === 0 && (
              <div style={{ fontSize: 13.5, color: 'var(--text-tertiary)', padding: '24px 20px' }}>
                No cases match “{search}”.
              </div>
            )}

            {view.visible.map((c) => (
              <div
                key={c.caseId}
                onClick={() => navigate(`/case/${c.caseId}`)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: COLUMNS,
                  gap: 12,
                  alignItems: 'center',
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'background 120ms ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-sunken)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 500, wordBreak: 'break-all', minWidth: 0 }}>
                  {c.caseId}
                </span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{formatAmount(c.amount, c.currency)}</span>
                <span>
                  <ClassificationBadge classification={c.classification} />
                </span>
                <span>
                  <DecisionBadge decision={c.decision || 'PENDING'} />
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{formatDateShort(c.createdAt)}</span>
              </div>
            ))}
          </div>

          <ListPagination view={view} />
        </>
      )}
    </div>
  );
}
