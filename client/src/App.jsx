import { Routes, Route } from 'react-router-dom';
import { Sidebar, SIDEBAR_WIDTH } from './components/Sidebar';
import { Overview } from './pages/Overview';
import { CaseList } from './pages/CaseList';
import { CaseDetail } from './pages/CaseDetail';
import { PaymentLinks } from './pages/PaymentLinks';
import { Recoveries } from './pages/Recoveries';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { Simulations } from './pages/Simulations';
import { Policies } from './pages/Policies';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar />
      <main style={{ marginLeft: SIDEBAR_WIDTH, minHeight: '100vh' }}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/cases" element={<CaseList />} />
          <Route path="/case/:caseId" element={<CaseDetail />} />
          <Route path="/payment-links" element={<PaymentLinks />} />
          <Route path="/recoveries" element={<Recoveries />} />
          <Route path="/audit-trail" element={<AuditTrailPage />} />
          <Route path="/simulations" element={<Simulations />} />
          <Route path="/policies" element={<Policies />} />
        </Routes>
      </main>
    </div>
  );
}
