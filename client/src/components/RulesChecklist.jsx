export const RULE_LABELS = {
  HARD_STOP_REASONS: 'Hard-stop fraud/risk reasons',
  MAX_ATTEMPTS: 'Max recovery attempts reached',
  ACTIVE_LINK_EXISTS: 'Active recovery link already exists',
  CONTACT_FREQUENCY_CAP: 'Contact frequency cap',
  RECOVERY_WINDOW: 'Outside recovery window',
  FINAL_CLASSIFICATION: 'Classification + AI proposal review',
};

export function RulesChecklist({ rules }) {
  if (!rules || rules.length === 0) {
    return <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No rules recorded.</div>;
  }

  const decidingIndex = rules.length - 1;

  return (
    <div>
      {rules.map((rule, i) => {
        const isDeciding = i === decidingIndex;
        const isLast = i === rules.length - 1;
        return (
          <div key={rule.rule} style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                  color: isDeciding ? '#fff' : rule.triggered ? 'var(--veto)' : 'var(--text-tertiary)',
                  background: isDeciding
                    ? 'var(--accent-policy)'
                    : rule.triggered
                      ? 'var(--veto-bg)'
                      : 'var(--surface-sunken)',
                  border: isDeciding
                    ? 'none'
                    : `1px solid ${rule.triggered ? 'var(--veto-border)' : 'var(--border)'}`,
                }}
              >
                {rule.rule}
              </span>
              {!isLast && <span style={{ width: 1, flex: 1, minHeight: 18, background: 'var(--border)' }} />}
            </div>
            <div style={{ paddingBottom: isLast ? 0 : 14, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 1 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {RULE_LABELS[rule.name] || rule.name}
                </span>
                {isDeciding && (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: 'var(--accent-policy)',
                      background: 'var(--accent-policy-bg)',
                      border: '1px solid var(--accent-policy-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '1px 7px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                    }}
                  >
                    Decided here
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 2 }}>
                {rule.triggered ? 'Triggered' : 'Checked — not triggered'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
