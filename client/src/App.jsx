import { Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { CaseList } from './pages/CaseList';
import { CaseDetail } from './pages/CaseDetail';
import { Simulations } from './pages/Simulations';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header />
      <Routes>
        <Route path="/" element={<CaseList />} />
        <Route path="/case/:caseId" element={<CaseDetail />} />
        <Route path="/simulations" element={<Simulations />} />
      </Routes>
    </div>
  );
}
