// Shimmer placeholders shown while a page is fetching, so the screen fills in
// smoothly instead of flashing blank -> full. `.hl-skeleton` (index.css) does
// the animation; these just set shape.

export function SkeletonBlock({ width = '100%', height = 14, radius, style }) {
  return (
    <span
      className="hl-skeleton"
      style={{
        display: 'block',
        width,
        height,
        borderRadius: radius ?? 'var(--radius-sm)',
        ...style,
      }}
    />
  );
}

// A surface card with N shimmer rows, matching the app's table cards.
export function SkeletonTable({ rows = 6, columns = 5 }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <SkeletonBlock width={90} height={12} />
        <SkeletonBlock width={200} height={28} />
      </div>
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: 16,
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: r === rows - 1 ? 'none' : '1px solid var(--border)',
            }}
          >
            {Array.from({ length: columns }).map((__, c) => (
              <SkeletonBlock key={c} width={c === 0 ? '70%' : '48%'} height={13} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCard({ height = 96 }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: height,
      }}
    >
      <SkeletonBlock width={80} height={11} />
      <SkeletonBlock width={54} height={24} />
    </div>
  );
}
