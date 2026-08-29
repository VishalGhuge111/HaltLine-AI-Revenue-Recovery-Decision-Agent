import { NavLink } from 'react-router-dom';

export const SIDEBAR_WIDTH = 240;

function Icon({ children }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {children}
    </svg>
  );
}

const ICONS = {
  liveDemo: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.3l6 3.7-6 3.7V8.3z" fill="currentColor" stroke="none" />
    </Icon>
  ),
  overview: (
    <Icon>
      <rect x="3" y="3" width="7.5" height="9" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="5" rx="1.5" />
      <rect x="13.5" y="10" width="7.5" height="11" rx="1.5" />
      <rect x="3" y="14" width="7.5" height="7" rx="1.5" />
    </Icon>
  ),
  cases: (
    <Icon>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </Icon>
  ),
  paymentLinks: (
    <Icon>
      <circle cx="8" cy="12" r="3.4" />
      <circle cx="16" cy="12" r="3.4" />
      <path d="M10.5 12h3" />
    </Icon>
  ),
  recoveries: (
    <Icon>
      <path d="M20 6.5L9.5 17 4 11.5" />
    </Icon>
  ),
  auditTrail: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5l3.5 2" />
    </Icon>
  ),
  simulations: (
    <Icon>
      <path d="M9.5 3h5M10.5 3v5.8L6 17a2 2 0 001.8 3h8.4a2 2 0 001.8-3l-4.5-8.2V3" />
    </Icon>
  ),
  policies: (
    <Icon>
      <path d="M12 3l7.5 3v6c0 4.7-3.2 8-7.5 9-4.3-1-7.5-4.3-7.5-9V6l7.5-3z" />
    </Icon>
  ),
  settings: (
    <Icon>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v2.4M12 18.1v2.4M20.5 12h-2.4M5.9 12H3.5M17.7 6.3l-1.7 1.7M8 16l-1.7 1.7M17.7 17.7L16 16M8 8L6.3 6.3" />
    </Icon>
  ),
};

const NAV_ITEMS = [
  { to: '/live-demo', label: 'Live Demo', icon: 'liveDemo' },
  { to: '/', label: 'Overview', icon: 'overview', end: true },
  { to: '/cases', label: 'Revenue Cases', icon: 'cases' },
  { to: '/payment-links', label: 'Payment Links', icon: 'paymentLinks' },
  { to: '/recoveries', label: 'Recoveries', icon: 'recoveries' },
  { to: '/audit-trail', label: 'Audit Trail', icon: 'auditTrail' },
  { to: '/simulations', label: 'Simulations', icon: 'simulations' },
  { to: '/policies', label: 'Policies', icon: 'policies' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export function Sidebar() {
  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: SIDEBAR_WIDTH,
        background: '#0f1115',
        color: '#e6e6ea',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        zIndex: 10,
      }}
    >
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f1115',
              fontWeight: 700,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            H
          </span>
          <span style={{ fontWeight: 700, fontSize: 15.5, letterSpacing: '-0.01em', color: '#fff' }}>Halt Line</span>
        </div>
        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginTop: 6, letterSpacing: '0.02em' }}>
          AI Revenue Recovery
        </div>
      </div>

      <nav style={{ flex: 1, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: '9px 12px',
              borderRadius: 7,
              fontSize: 13.5,
              fontWeight: 600,
              color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
              background: isActive ? 'rgba(255,255,255,0.09)' : 'transparent',
              textDecoration: 'none',
              transition: 'background 120ms ease, color 120ms ease',
            })}
          >
            {ICONS[item.icon]}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            S
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Solo Builder</div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)' }}>Test Mode</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
