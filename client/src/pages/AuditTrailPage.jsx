import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAuditTrail } from '../api';
import { PageHeader } from '../components/PageHeader';
import { formatDateTime, formatSnakeCase, shortenId } from '../format';

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

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 32px 80px' }}>
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

      {!error && events === null && (
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '32px 0' }}>Loading…</div>
      )}

      {events && events.length === 0 && (
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '32px 0' }}>
          No audit events recorded yet.
        </div>
      )}

      {events && events.length > 0 && (
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
              gridTemplateColumns: '1.1fr 1fr 1.3fr 2.4fr',
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

          {events.map((event) => (
            <div
              key={event.eventId}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.1fr 1fr 1.3fr 2.4fr',
                alignItems: 'start',
                padding: '12px 20px',
                borderBottom: '1px solid var(--border)',
                fontSize: 13,
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>{formatDateTime(event.timestamp)}</span>
              <Link
                to={`/case/${event.caseId}`}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--accent-policy)' }}
              >
                {shortenId(event.caseId)}
              </Link>
              <span style={{ fontWeight: 600 }}>{formatSnakeCase(event.step)}</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--text-tertiary)',
                  wordBreak: 'break-word',
                }}
              >
                {compactDetails(event.details)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
