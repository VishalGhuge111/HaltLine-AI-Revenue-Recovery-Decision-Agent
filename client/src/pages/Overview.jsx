import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCases, fetchPaymentLinks } from '../api';
import { PageHeader } from '../components/PageHeader';
import { DecisionBadge, ClassificationBadge } from '../components/StatusBadge';
import { formatAmount, formatDateTime, shortenId } from '../format';

const DECISION_BUCKETS = [
  { key: 'APPROVE', label: 'Approved', color: 'var(--approve)' },
  { key: 'VETO', label: 'Vetoed', color: 'var(--veto)' },
  { key: 'DO_NOT_ACT', label: 'Do not act', color: 'var(--veto)' },
  { key: 'ESCALATE', label: 'Escalated', color: 'var(--escalate)' },
  { key: 'PENDING', label: 'Pending', color: 'var(--neutral-status)' },
];

function KpiCard({ label, value, sublabel }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding: 20,
      }}
    >
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 8, letterSpacing: '-0.01em' }}>{value}</div>
      {sublabel && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{sublabel}</div>}
    </div>
  );
}

function DecisionBreakdown({ counts, total }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding: 24,
      }}
    >
      <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Decisions by outcome</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {DECISION_BUCKETS.map((bucket) => {
          const count = counts[bucket.key] || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={bucket.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{bucket.label}</span>
                <span style={{ color: 'var(--text-tertiary)' }}>{count}</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: 'var(--surface-sunken)', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: bucket.color, borderRadius: 999 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Overview() {
  const [cases, setCases] = useState(null);
  const [paymentLinks, setPaymentLinks] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCases(), fetchPaymentLinks()])
      .then(([casesData, paymentLinksData]) => {
        if (cancelled) return;
        setCases(casesData);
        setPaymentLinks(paymentLinksData);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 32px 80px' }}>
        <PageHeader title="Overview" description="Real Test Mode activity across the recovery pipeline." />
        <div
          style={{
            padding: 16,
            borderRadius: 'var(--radius-md)',
            background: 'var(--veto-bg)',
            border: '1px solid var(--veto-border)',
            color: 'var(--veto)',
            fontSize: 14,
          }}
        >
          Failed to load overview: {error}
        </div>
      </div>
    );
  }

  if (cases === null || paymentLinks === null) {
    return (
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 32px 80px' }}>
        <PageHeader title="Overview" description="Real Test Mode activity across the recovery pipeline." />
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '32px 0' }}>Loading…</div>
      </div>
    );
  }

  const counts = { PENDING: 0 };
  for (const c of cases) {
    const key = c.decision || 'PENDING';
    counts[key] = (counts[key] || 0) + 1;
  }

  const realRecoveredAmount = paymentLinks
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const recentCases = cases.slice(0, 8);

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 32px 80px' }}>
      <PageHeader title="Overview" description="Real Test Mode activity across the recovery pipeline." />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Total cases" value={cases.length} />
        <KpiCard label="Approved" value={counts.APPROVE || 0} />
        <KpiCard label="Vetoed" value={counts.VETO || 0} />
        <KpiCard label="Real recovered amount" value={formatAmount(realRecoveredAmount, 'INR')} sublabel="Test Mode" />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '18px 22px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--accent-policy-bg)',
          border: '1px solid var(--accent-policy-border)',
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-policy)' }}>
            AI proposes. Policy decides.
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Every action is independently evaluated by a deterministic policy engine before execution.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 24 }}>
        <DecisionBreakdown counts={counts} total={cases.length} />
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
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Recent cases</h2>
        </div>

        {recentCases.length === 0 && (
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '24px 20px' }}>
            No revenue cases yet.
          </div>
        )}

        {recentCases.map((c) => (
          <div
            key={c.caseId}
            onClick={() => navigate(`/case/${c.caseId}`)}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.3fr 1fr 1fr 1fr 1.1fr',
              alignItems: 'center',
              padding: '14px 20px',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-sunken)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500 }}>
              {shortenId(c.caseId)}
            </span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{formatAmount(c.amount, c.currency)}</span>
            <span>
              <ClassificationBadge classification={c.classification} />
            </span>
            <span>
              <DecisionBadge decision={c.decision || 'PENDING'} />
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{formatDateTime(c.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
