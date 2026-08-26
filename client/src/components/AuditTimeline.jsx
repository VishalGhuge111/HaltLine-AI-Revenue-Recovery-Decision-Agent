import { formatDateTime, formatSnakeCase } from '../format';

function DetailRow({ details }) {
  const entries = Object.entries(details || {});
  if (entries.length === 0) return null;
  return (
    <div
      style={{
        marginTop: 6,
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--text-secondary)',
        background: 'var(--surface-sunken)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {entries.map(([key, value]) => (
        <div key={key} style={{ display: 'flex', gap: 6 }}>
          <span style={{ color: 'var(--text-tertiary)' }}>{key}:</span>
          <span style={{ wordBreak: 'break-all' }}>
            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AuditTimeline({ events }) {
  if (!events || events.length === 0) {
    return <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No audit events recorded.</div>;
  }

  return (
    <div>
      {events.map((event, i) => {
        const isLast = i === events.length - 1;
        return (
          <div key={i} style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: isLast ? 'var(--accent-policy)' : 'var(--border-strong)',
                  flexShrink: 0,
                  marginTop: 4,
                }}
              />
              {!isLast && <span style={{ width: 1, flex: 1, minHeight: 24, background: 'var(--border)' }} />}
            </div>
            <div style={{ paddingBottom: isLast ? 2 : 18, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{formatSnakeCase(event.step)}</span>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{formatDateTime(event.timestamp)}</span>
              </div>
              <DetailRow details={event.details} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
