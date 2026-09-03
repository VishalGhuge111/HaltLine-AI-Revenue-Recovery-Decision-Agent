import { useEffect, useState } from 'react';
import { PAGE } from '../pageStyle';
import { Link } from 'react-router-dom';
import { fetchAuditTrail } from '../api';
import { PageHeader } from '../components/PageHeader';
import { ListToolbar, ListPagination } from '../components/ListControls';
import { SkeletonTable } from '../components/Skeleton';
import { useListView } from '../hooks/useListView';
import { formatDateShort, formatSnakeCase } from '../format';

const COLUMNS = '0.95fr 1.7fr 1.25fr 2.1fr';

const SEARCH_FIELDS = ['caseId', 'step'];

const SORT_OPTIONS = [
  { key: 'recent', label: 'Newest first', compare: (a, b) => (b.timestamp || '').localeCompare(a.timestamp || '') },
  { key: 'oldest', label: 'Oldest first', compare: (a, b) => (a.timestamp || '').localeCompare(b.timestamp || '') },
];

// The raw event detail JSON is shown verbatim - it represents what we actually
// received / recorded, including Razorpay's raw paise amounts. Not reformatted.
function compactDetails(details) {
  const entries = Object.entries(details || {});
  if (entries.length === 0) return '—';
  const str = entries
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
    .join(' · ');
  return str.length > 110 ? `${str.slice(0, 110)}…` : str;
}

export function AuditTrailPage() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchAuditTrail()
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const view = useListView(events, {
    searchTerm: search,
    searchFields: SEARCH_FIELDS,
    sortOptions: SORT_OPTIONS,
    initialSort: 'recent',
  });

  return (
    <div style={PAGE}>
      <PageHeader
        title="Audit Trail"
        description="Every action taken by the system, across every case, in order — the complete record."
      />

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
          Failed to load audit trail: {error}
        </div>
      )}

      {!error && events === null && <SkeletonTable rows={10} columns={4} />}

      {events && events.length === 0 && (
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '32px 0' }}>
          No audit events recorded yet.
        </div>
      )}

      {events && events.length > 0 && (
        <>
          <ListToolbar
            view={view}
            noun="event"
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search by case ID or step…"
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
              <span>Timestamp</span>
              <span>Case</span>
              <span>Step</span>
              <span>Details</span>
            </div>

            {view.visible.length === 0 && (
              <div style={{ fontSize: 13.5, color: 'var(--text-tertiary)', padding: '24px 20px' }}>
                No events match “{search}”.
              </div>
            )}

            {view.visible.map((event) => (
              <div
                key={event.eventId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: COLUMNS,
                  gap: 12,
                  alignItems: 'start',
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 13,
                }}
              >
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{formatDateShort(event.timestamp)}</span>
                <Link
                  to={`/case/${event.caseId}`}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--accent-policy)',
                    wordBreak: 'break-all',
                    minWidth: 0,
                  }}
                >
                  {event.caseId}
                </Link>
                <span style={{ fontWeight: 600, fontSize: 12.5 }}>{formatSnakeCase(event.step)}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--text-tertiary)',
                    wordBreak: 'break-word',
                    minWidth: 0,
                  }}
                >
                  {compactDetails(event.details)}
                </span>
              </div>
            ))}
          </div>

          <ListPagination view={view} />
        </>
      )}
    </div>
  );
}
