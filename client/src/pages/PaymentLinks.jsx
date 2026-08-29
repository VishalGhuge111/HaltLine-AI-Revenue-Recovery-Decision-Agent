import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPaymentLinks } from '../api';
import { PageHeader } from '../components/PageHeader';
import { RecoveryStatusBadge } from '../components/StatusBadge';
import { formatAmount, formatDateTime, shortenId } from '../format';

export function PaymentLinks() {
  const [links, setLinks] = useState(null);
  const [error, setError] = useState(null);

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

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 32px 80px' }}>
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

      {!error && links === null && (
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '32px 0' }}>Loading…</div>
      )}

      {links && links.length === 0 && (
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '32px 0' }}>
          No payment links have been created yet.
        </div>
      )}

      {links && links.length > 0 && (
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
              gridTemplateColumns: '1.2fr 1fr 0.9fr 1fr 1fr 1fr',
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

          {links.map((link) => (
            <div
              key={link.paymentLinkId}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr 0.9fr 1fr 1fr 1fr',
                alignItems: 'center',
                padding: '14px 20px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <Link
                to={`/case/${link.caseId}`}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--accent-policy)' }}
              >
                {shortenId(link.caseId)}
              </Link>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{formatAmount(link.amount, link.currency)}</span>
              <span>
                <RecoveryStatusBadge status={link.status} />
              </span>
              <span>
                {link.shortUrl ? (
                  <a
                    href={link.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-policy)' }}
                  >
                    Open link ↗
                  </a>
                ) : (
                  '—'
                )}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{formatDateTime(link.createdAt)}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {link.paidAt ? formatDateTime(link.paidAt) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
