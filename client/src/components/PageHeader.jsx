export function PageHeader({ title, description, right }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 28,
      }}
    >
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{title}</h1>
        {description && (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '6px 0 0', maxWidth: 640 }}>
            {description}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}
