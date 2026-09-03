import { formatDateTime } from '../format';

function PersonIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </svg>
  );
}

// The human-in-the-loop step, shown inside the "Policy Decided" panel for
// ESCALATE cases only: either the pending decision point (two buttons) or,
// once a reviewer has acted, the outcome. Styled in the --accent-human color
// so it reads as a third kind of actor, distinct from AI and the policy engine.
export function HumanReview({ awaiting, approved, resolvedAt, resolving, error, onResolve }) {
  const heading = awaiting
    ? 'Awaiting human review'
    : approved
      ? 'Approved by human reviewer'
      : 'Rejected by human reviewer';

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
      <div
        style={{
          border: '1px solid var(--accent-human-border)',
          background: 'var(--accent-human-bg)',
          borderLeft: '3px solid var(--accent-human)',
          borderRadius: 'var(--radius-md)',
          padding: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--accent-human)', marginBottom: awaiting ? 10 : 6 }}>
          <PersonIcon />
          <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {heading}
          </span>
        </div>

        {awaiting ? (
          <>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
              The policy engine escalated this case instead of deciding it automatically. A human reviewer is the final word.
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => onResolve('approve')}
                disabled={Boolean(resolving)}
                style={{
                  padding: '9px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  background: resolving ? 'var(--text-tertiary)' : '#17171a',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: resolving ? 'default' : 'pointer',
                }}
              >
                {resolving === 'approve' ? 'Approving…' : 'Approve & Send Recovery Link'}
              </button>
              <button
                onClick={() => onResolve('reject')}
                disabled={Boolean(resolving)}
                style={{
                  padding: '9px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  cursor: resolving ? 'default' : 'pointer',
                }}
              >
                {resolving === 'reject' ? 'Rejecting…' : 'Reject — No Action'}
              </button>
            </div>
            {error && <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--veto)' }}>{error}</div>}
          </>
        ) : (
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {approved
              ? 'A reviewer approved this escalation — a recovery link was created.'
              : 'A reviewer rejected this escalation — no recovery action was taken.'}
            {resolvedAt ? ` · ${formatDateTime(resolvedAt)}` : ''}
          </div>
        )}
      </div>
    </div>
  );
}
