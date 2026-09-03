// Compact pill-styled external link with a real external-link glyph. Used
// wherever the app links out to a hosted Razorpay payment link.
function ExternalIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

export function ExternalLink({ href, children = 'Open link', style }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 12.5,
        fontWeight: 600,
        color: 'var(--accent-policy)',
        background: 'var(--surface-sunken)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-sm)',
        padding: '4px 9px',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--surface)';
        e.currentTarget.style.borderColor = 'var(--accent-policy-border)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--surface-sunken)';
        e.currentTarget.style.borderColor = 'var(--border-strong)';
      }}
    >
      {children}
      <ExternalIcon />
    </a>
  );
}
