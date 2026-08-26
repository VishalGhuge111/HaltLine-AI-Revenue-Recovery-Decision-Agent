import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header
      style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          padding: '18px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: '#17171a',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            H
          </span>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>Halt Line</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 999,
              padding: '2px 8px',
              marginLeft: 2,
            }}
          >
            OPS
          </span>
        </Link>
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Revenue recovery — case review</span>
      </div>
    </header>
  );
}
