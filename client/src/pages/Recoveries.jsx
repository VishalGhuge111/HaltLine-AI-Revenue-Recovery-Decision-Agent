import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPaymentLinks } from '../api';
import { PageHeader } from '../components/PageHeader';
import { formatAmount, formatDateTime, shortenId } from '../format';

export function Recoveries() {
  const [links, setLinks] = useState(null);
  const [error, setError] = useState(null);

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

  const totalRecovered = links ? links.reduce((sum, l) => sum + (l.amount || 0), 0) : 0;

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 32px 80px' }}>
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

      {!error && links === null && (
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '32px 0' }}>Loading…</div>
      )}

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
              marginBottom: 24,
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
                  gridTemplateColumns: '1.2fr 1fr 1fr 1fr',
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

              {links.map((link) => (
                <div
                  key={link.paymentLinkId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr 1fr 1fr',
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
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--approve)' }}>
                    {formatAmount(link.amount, link.currency)}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{formatDateTime(link.paidAt)}</span>
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
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
