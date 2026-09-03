import { formatDateTime, formatSnakeCase } from '../format';

// Three kinds of actor produce decisions in this system, and the audit trail
// should make it obvious at a glance which is which:
//   - the AI proposes           (ai_proposal_generated)
//   - the policy engine decides  (policy_decision_made)   - deterministic, machine
//   - a human is the final word  (human_decision_made)    - only on ESCALATE cases
const ACTOR_BY_STEP = {
  ai_proposal_generated: 'ai',
  policy_decision_made: 'policy',
  human_decision_made: 'human',
};

const ACTOR_STYLES = {
  ai: {
    label: 'AI',
    color: 'var(--accent-ai)',
    bg: 'var(--accent-ai-bg)',
    border: 'var(--accent-ai-border)',
  },
  policy: {
    label: 'Policy',
    color: 'var(--accent-policy)',
    bg: 'var(--accent-policy-bg)',
    border: 'var(--accent-policy-border)',
  },
  human: {
    label: 'Human',
    color: 'var(--accent-human)',
    bg: 'var(--accent-human-bg)',
    border: 'var(--accent-human-border)',
  },
};

function ActorBadge({ actor }) {
  const style = ACTOR_STYLES[actor];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: style.color,
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: 999,
        padding: '1px 7px',
      }}
    >
      {actor === 'human' && (
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
        </svg>
      )}
      {style.label}
    </span>
  );
}

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
        const actor = ACTOR_BY_STEP[event.step];
        const actorStyle = actor ? ACTOR_STYLES[actor] : null;
        const isHuman = actor === 'human';

        return (
          <div key={i} style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span
                style={{
                  width: actorStyle ? 12 : 10,
                  height: actorStyle ? 12 : 10,
                  borderRadius: '50%',
                  background: actorStyle ? actorStyle.color : isLast ? 'var(--accent-policy)' : 'var(--border-strong)',
                  boxShadow: actorStyle ? `0 0 0 3px ${actorStyle.bg}` : 'none',
                  flexShrink: 0,
                  marginTop: 4,
                }}
              />
              {!isLast && <span style={{ width: 1, flex: 1, minHeight: 24, background: 'var(--border)' }} />}
            </div>
            <div style={{ paddingBottom: isLast ? 2 : 18, flex: 1 }}>
              <div
                style={
                  isHuman
                    ? {
                        borderLeft: '3px solid var(--accent-human)',
                        background: 'var(--accent-human-bg)',
                        borderRadius: '4px',
                        padding: '8px 12px',
                        marginBottom: 2,
                      }
                    : undefined
                }
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{formatSnakeCase(event.step)}</span>
                  {actorStyle && <ActorBadge actor={actor} />}
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{formatDateTime(event.timestamp)}</span>
                </div>
                <DetailRow details={event.details} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
