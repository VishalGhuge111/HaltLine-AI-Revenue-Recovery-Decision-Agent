import { useEffect, useState } from 'react';
import { PAGE } from '../pageStyle';
import { Link } from 'react-router-dom';
import { fetchPaymentLinks } from '../api';
import { PageHeader } from '../components/PageHeader';
import { RecoveryStatusBadge } from '../components/StatusBadge';
import { ListToolbar, ListPagination } from '../components/ListControls';
import { ExternalLink } from '../components/ExternalLink';
import { SkeletonTable } from '../components/Skeleton';
import { useListView } from '../hooks/useListView';
import { formatAmount, formatDateShort } from '../format';

const COLUMNS = '2fr 0.8fr 0.75fr 0.9fr 1fr 1fr';

const SEARCH_FIELDS = ['paymentLinkId', 'caseId'];

const SORT_OPTIONS = [
  { key: 'recent', label: 'Most recent', compare: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') },
  { key: 'amount-desc', label: 'Amount (high → low)', compare: (a, b) => (b.amount || 0) - (a.amount || 0) },
  { key: 'amount-asc', label: 'Amount (low → high)', compare: (a, b) => (a.amount || 0) - (b.amount || 0) },
];

export function PaymentLinks() {
  const [links, setLinks] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchPaymentLinks()
      .then((data) => {
        if (!cancelled) setLinks(data);
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

  return (
    <div style={PAGE}>
      <PageHeader
        title="Payment Links"
        description="Every recovery payment link the system has created, across every case."
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
          Failed to load payment links: {error}
        </div>
      )}

      {!error && links === null && <SkeletonTable rows={6} columns={6} />}

      {links && links.length === 0 && (
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '32px 0' }}>
          No payment links have been created yet.
        </div>
      )}

      {links && links.length > 0 && (
        <>
          <ListToolbar
            view={view}
            noun="link"
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
              <span>Status</span>
              <span>Link</span>
              <span>Created</span>
              <span>Paid</span>
            </div>

            {view.visible.length === 0 && (
              <div style={{ fontSize: 13.5, color: 'var(--text-tertiary)', padding: '24px 20px' }}>
                No payment links match “{search}”.
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
                <span style={{ fontSize: 14, fontWeight: 500 }}>{formatAmount(link.amount, link.currency)}</span>
                <span>
                  <RecoveryStatusBadge status={link.status} />
                </span>
                <span>{link.shortUrl ? <ExternalLink href={link.shortUrl}>Open</ExternalLink> : '—'}</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{formatDateShort(link.createdAt)}</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  {link.paidAt ? formatDateShort(link.paidAt) : '—'}
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
