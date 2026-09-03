import { Routes, Route, Outlet } from 'react-router-dom';
import { Sidebar, SidebarLogo, TOP_STRIP_HEIGHT } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { LiveDemo } from './pages/LiveDemo';
import { Overview } from './pages/Overview';
import { CaseList } from './pages/CaseList';
import { CaseDetail } from './pages/CaseDetail';
import { PaymentLinks } from './pages/PaymentLinks';
import { Recoveries } from './pages/Recoveries';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { Simulations } from './pages/Simulations';
import { Policies } from './pages/Policies';
import { Settings } from './pages/Settings';

// Two visual zones, nothing more:
//   1. gray chrome  = the top strip (logo + top bar) + the sidebar nav, one
//      continuous L of var(--bg).
//   2. white content = a FIXED-SIZE frame that never moves. Its border, shadow
//      and rounded corners stay put; only the inner .hl-scroll div scrolls.
function Layout() {
  return (
    <div
      style={{
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* One continuous gray strip across the very top. */}
      <div
        style={{
          position: 'relative',
          zIndex: 20,
          height: TOP_STRIP_HEIGHT,
          flexShrink: 0,
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'stretch',
        }}
      >
        <SidebarLogo />
        <TopBar />
      </div>

      {/* Below the strip: gray nav column on the left, white content frame on the right. */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <Sidebar />
        <div style={{ flex: 1, minWidth: 0, paddingRight: 14, paddingBottom: 14 }}>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--panel-radius)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div className="hl-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/live-demo" element={<LiveDemo />} />
        <Route path="/" element={<Overview />} />
        <Route path="/cases" element={<CaseList />} />
        <Route path="/case/:caseId" element={<CaseDetail />} />
        <Route path="/payment-links" element={<PaymentLinks />} />
        <Route path="/recoveries" element={<Recoveries />} />
        <Route path="/audit-trail" element={<AuditTrailPage />} />
        <Route path="/simulations" element={<Simulations />} />
        <Route path="/policies" element={<Policies />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
