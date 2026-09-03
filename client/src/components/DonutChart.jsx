// Lightweight SVG donut - no charting dependency. `segments` is
// [{ key, label, value, color }]; zero-value segments are skipped from the ring.
export function DonutChart({
  segments,
  total,
  size = 168,
  thickness = 26,
  centerLabel = 'total',
  legendColumns = 1,
  showLegendPct = false,
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const sum = total ?? segments.reduce((acc, s) => acc + s.value, 0);

  let offset = 0;
  const arcs =
    sum > 0
      ? segments
          .filter((s) => s.value > 0)
          .map((s) => {
            const fraction = s.value / sum;
            const arc = (
              <circle
                key={s.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${fraction * circumference} ${circumference}`}
                strokeDashoffset={-offset * circumference}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
            offset += fraction;
            return arc;
          })
      : [];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} role="img" aria-label={`${centerLabel}: ${sum}`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-sunken)" strokeWidth={thickness} />
          {arcs}
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em' }}>{sum}</span>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {centerLabel}
          </span>
        </div>
      </div>

      <div
        style={{
          flex: legendColumns > 1 ? 1 : undefined,
          minWidth: legendColumns > 1 ? 240 : 130,
          display: 'grid',
          gridTemplateColumns: `repeat(${legendColumns}, minmax(0, 1fr))`,
          gap: legendColumns > 1 ? '10px 28px' : '7px 0',
        }}
      >
        {segments.map((s) => {
          const pct = sum > 0 ? Math.round((s.value / sum) * 100) : 0;
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: s.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)', flex: 1, minWidth: 0 }}>{s.label}</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.value}</span>
              {showLegendPct && (
                <span style={{ color: 'var(--text-tertiary)', fontSize: 11.5, minWidth: 30, textAlign: 'right' }}>{pct}%</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
