import { Link } from 'react-router-dom';
import { GlobalSearch } from './GlobalSearch';

// The right portion of the top strip: global search + mode indicator + settings
// link, all right-aligned. The logo occupies the sidebar-width portion of the
// same strip (see SidebarLogo). No per-page title here - every page renders its
// own <h1> right below.

function GearIcon() {
  // lucide "settings" cog - unambiguous, not a sun/theme toggle
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Static, non-interactive - there is no other mode to toggle to. Styled as a
// mode chip with a mini toggle graphic locked "on".
function TestModeChip() {
  return (
    <span
      title="This product only ever runs in Razorpay Test Mode"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--accent-indigo)',
        background: 'var(--accent-indigo-bg)',
        border: '1px solid var(--accent-indigo-border)',
        borderRadius: 'var(--radius-sm)',
        padding: '4px 11px 4px 7px',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          position: 'relative',
          width: 20,
          height: 12,
          borderRadius: 999,
          background: 'var(--accent-indigo)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#fff',
          }}
        />
      </span>
      Test Mode
    </span>
  );
}

export function TopBar() {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 16,
        padding: '0 24px 0 32px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <GlobalSearch />
        <TestModeChip />

        <Link
          to="/settings"
          aria-label="Settings"
          title="Settings"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            background: 'var(--surface)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-sunken)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <GearIcon />
        </Link>
      </div>
    </div>
  );
}
