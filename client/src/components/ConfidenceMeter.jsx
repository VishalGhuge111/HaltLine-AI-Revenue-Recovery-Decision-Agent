export function ConfidenceMeter({ confidence }) {
  const pct = Math.round((confidence ?? 0) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          flex: 1,
          height: 6,
          borderRadius: 999,
          background: 'var(--accent-ai-border)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'var(--accent-ai)',
            borderRadius: 999,
          }}
        />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-ai)', minWidth: 36, textAlign: 'right' }}>
        {pct}%
      </span>
    </div>
  );
}
