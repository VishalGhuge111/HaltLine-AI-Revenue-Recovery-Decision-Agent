import { useEffect, useState } from 'react';
import { PAGE } from '../pageStyle';
import { Link } from 'react-router-dom';
import { fetchPaymentLinks } from '../api';
import { PageHeader } from '../components/PageHeader';
import { ListToolbar, ListPagination } from '../components/ListControls';
import { ExternalLink } from '../components/ExternalLink';
import { SkeletonTable } from '../components/Skeleton';
import { useListView } from '../hooks/useListView';
import { formatAmount, formatDateShort } from '../format';

const COLUMNS = '2.2fr 0.9fr 1.1fr 0.8fr';

const SEARCH_FIELDS = ['paymentLinkId', 'caseId'];

const SORT_OPTIONS = [
  { key: 'recent', label: 'Most recently paid', compare: (a, b) => (b.paidAt || '').localeCompare(a.paidAt || '') },
  { key: 'amount-desc', label: 'Amount (high → low)', compare: (a, b) => (b.amount || 0) - (a.amount || 0) },
  { key: 'amount-asc', label: 'Amount (low → high)', compare: (a, b) => (a.amount || 0) - (b.amount || 0) },
];

export function Recoveries() {
  const [links, setLinks] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchPaymentLinks()
      .then((data) => {
        if (!cancelled) setLinks(data.filter((link) => link.status === 'paid'));
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const view = useListView(links, {
    searchTerm: search,
    searchFields: SEARCH_FIELDS,
    sortOptions: SORT_OPTIONS,
    initialSort: 'recent',
  });

  const totalRecovered = links ? links.reduce((sum, l) => sum + (l.amount || 0), 0) : 0;

  return (
    <div style={PAGE}>
      <PageHeader
        title="Recoveries"
        description="Payments that were successfully recovered through a sent link. Real Test Mode data only — nothing here is padded."
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
          Failed to load recoveries: {error}
        </div>
      )}

      {!error && links === null && <SkeletonTable rows={5} columns={4} />}

      {links && (
        <>
          <div
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              padding: '14px 20px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--approve-bg)',
              border: '1px solid var(--approve-border)',
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--approve)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total recovered
            </span>
            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
              {formatAmount(totalRecovered, 'INR')}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
              {links.length} paid recover{links.length === 1 ? 'y' : 'ies'}
            </span>
          </div>

          {links.length === 0 && (
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '32px 0' }}>
              No successful recoveries yet.
            </div>
          )}

          {links.length > 0 && (
            <>
              <ListToolbar
                view={view}
                noun="recovery"
                search={search}
                onSearch={setSearch}
                searchPlaceholder="Search by link or case ID…"
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
                  <span>Paid at</span>
                  <span>Link</span>
                </div>

                {view.visible.length === 0 && (
                  <div style={{ fontSize: 13.5, color: 'var(--text-tertiary)', padding: '24px 20px' }}>
                    No recoveries match “{search}”.
                  </div>
                )}

                {view.visible.map((link) => (
                  <div
                    key={link.paymentLinkId}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: COLUMNS,
                      gap: 12,
                      alignItems: 'center',
                      padding: '14px 20px',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <Link
                      to={`/case/${link.caseId}`}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12.5,
                        fontWeight: 500,
                        color: 'var(--accent-policy)',
                        wordBreak: 'break-all',
                        minWidth: 0,
                      }}
                    >
                      {link.caseId}
                    </Link>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--approve)' }}>
                      {formatAmount(link.amount, link.currency)}
                    </span>
                    <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{formatDateShort(link.paidAt)}</span>
                    <span>{link.shortUrl ? <ExternalLink href={link.shortUrl}>Open</ExternalLink> : '—'}</span>
                  </div>
                ))}
              </div>

              <ListPagination view={view} />
            </>
          )}
        </>
      )}
    </div>
  );
}
