const DECISION_STYLES = {
  APPROVE: { color: 'var(--approve)', bg: 'var(--approve-bg)', border: 'var(--approve-border)', label: 'Approve' },
  VETO: { color: 'var(--veto)', bg: 'var(--veto-bg)', border: 'var(--veto-border)', label: 'Veto' },
  DO_NOT_ACT: { color: 'var(--veto)', bg: 'var(--veto-bg)', border: 'var(--veto-border)', label: 'Do Not Act' },
  ESCALATE: { color: 'var(--escalate)', bg: 'var(--escalate-bg)', border: 'var(--escalate-border)', label: 'Escalate' },
  PENDING: {
    color: 'var(--neutral-status)',
    bg: 'var(--neutral-status-bg)',
    border: 'var(--neutral-status-border)',
    label: 'Pending',
  },
};

export function DecisionBadge({ decision }) {
  const style = DECISION_STYLES[decision] || DECISION_STYLES.PENDING;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 600,
        color: style.color,
        background: style.bg,
        border: `1px solid ${style.border}`,
        lineHeight: 1.6,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: style.color,
          flexShrink: 0,
        }}
      />
      {style.label}
    </span>
  );
}

const CLASSIFICATION_STYLES = {
  RETRIABLE: { color: '#0f766e', bg: '#effaf9', border: '#c8ede9' },
  NON_RETRIABLE: { color: '#7c2d12', bg: '#fdf3ee', border: '#f2d9c9' },
  UNCERTAIN: { color: '#4338ca', bg: '#f2f1fd', border: '#dcd9f7' },
};

export function ClassificationBadge({ classification }) {
  const style = CLASSIFICATION_STYLES[classification] || {
    color: 'var(--neutral-status)',
    bg: 'var(--neutral-status-bg)',
    border: 'var(--neutral-status-border)',
  };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 600,
        color: style.color,
        background: style.bg,
        border: `1px solid ${style.border}`,
        lineHeight: 1.6,
        whiteSpace: 'nowrap',
      }}
    >
      {classification ? classification.replace('_', ' ') : '—'}
    </span>
  );
}
