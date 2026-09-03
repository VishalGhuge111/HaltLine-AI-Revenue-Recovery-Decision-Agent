import { NavLink } from 'react-router-dom';
import { NAV_SECTIONS } from '../nav';

export const SIDEBAR_WIDTH = 240;
// The gray top strip. The logo block (sidebar width) and the top bar content
// (remaining width) both live in a row of exactly this height, so they read as
// one continuous strip.
export const TOP_STRIP_HEIGHT = 56;

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

// DEV/DEMO-ONLY: the "Live Demo" item (under OPERATE) drives Razorpay Custom
// Checkout via the backend test harness (mounted only when the server has
// ENABLE_TEST_HARNESS=true). Not part of the product's real customer-facing
// surface - consider dropping it (and the /live-demo route) from a real
// deployment build.

// Brand mark + wordmark. Lives in the top strip, sized to the strip height so
// it aligns with the top bar content on the same plane.
export function SidebarLogo() {
  return (
    <div
      style={{
        width: SIDEBAR_WIDTH,
        height: TOP_STRIP_HEIGHT,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 20px',
      }}
    >
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 6,
          background: 'var(--accent-policy)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        H
      </span>
      <span style={{ fontWeight: 700, fontSize: 15.5, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
        Halt Line
      </span>
    </div>
  );
}

function NavItem({ item }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      style={({ isActive }) => ({
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '8px 12px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 13.5,
        fontWeight: isActive ? 650 : 550,
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: isActive ? 'var(--surface)' : 'transparent',
        boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
        textDecoration: 'none',
        transition: 'background 120ms ease, color 120ms ease',
      })}
      onMouseEnter={(e) => {
        if (!e.currentTarget.getAttribute('aria-current')) {
          e.currentTarget.style.background = 'rgba(20,20,26,0.05)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!e.currentTarget.getAttribute('aria-current')) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              style={{
                position: 'absolute',
                left: -12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 3,
                height: 18,
                borderRadius: '0 2px 2px 0',
                background: 'var(--accent-indigo)',
              }}
            />
          )}
          {ICONS[item.icon]}
          {item.label}
        </>
      )}
    </NavLink>
  );
}

// The nav column - sits below the top strip, same gray as the strip / backdrop
// so sidebar + top bar read as one unified chrome zone.
export function Sidebar() {
  return (
    <aside
      style={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Custom scrollbar is deliberately NOT applied here - it is scoped to the
          content frame only. This column overflows only on very short viewports. */}
      <nav style={{ flex: 1, padding: '10px 12px 16px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} style={{ marginBottom: 8 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
                padding: '8px 12px 6px',
              }}
            >
              {section.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {section.items.map((item) => (
                <NavItem key={item.to} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div style={{ padding: '12px 14px 14px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '8px 10px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'var(--surface-sunken)',
              border: '1px solid var(--border)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text-primary)',
              flexShrink: 0,
            }}
          >
            H
          </span>
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1 }}>
              Halt Line
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-indigo)', flexShrink: 0 }} />
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                  color: 'var(--text-tertiary)',
                  lineHeight: 1,
                }}
              >
                Demo Session
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
