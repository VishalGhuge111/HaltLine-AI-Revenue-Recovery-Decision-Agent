export function Panel({ title, eyebrow, eyebrowColor, right, children, style }) {
  return (
    <section
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding: 24,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          {eyebrow && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: eyebrowColor || 'var(--text-tertiary)',
                marginBottom: 4,
              }}
            >
              {eyebrow}
            </div>
          )}
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</h2>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}
