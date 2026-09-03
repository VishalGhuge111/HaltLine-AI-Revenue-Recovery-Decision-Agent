import { useEffect, useState } from 'react';
import { PAGE } from '../pageStyle';
import { Link, useNavigate } from 'react-router-dom';
import { fetchCases, fetchPaymentLinks } from '../api';
import { PageHeader } from '../components/PageHeader';
import { DecisionBadge, ClassificationBadge } from '../components/StatusBadge';
import { DonutChart } from '../components/DonutChart';
import { SkeletonBlock, SkeletonCard } from '../components/Skeleton';
import { formatAmount, formatDateShort } from '../format';

const DECISION_BUCKETS = [
  { key: 'APPROVE', label: 'Approved', color: 'var(--approve)' },
  { key: 'VETO', label: 'Vetoed', color: 'var(--veto)' },
  { key: 'DO_NOT_ACT', label: 'Do not act', color: '#7c2d12' },
  { key: 'ESCALATE', label: 'Escalated', color: 'var(--escalate)' },
  { key: 'PENDING', label: 'Pending', color: 'var(--neutral-status)' },
];

const CARD = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-sm)',
};

const ROW_COLUMNS = '2.1fr 0.8fr 1fr 1fr 1.3fr';

function KpiCard({ label, value, sublabel }) {
  return (
    <div style={{ ...CARD, padding: 20 }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 8, letterSpacing: '-0.01em' }}>{value}</div>
      {sublabel && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{sublabel}</div>}
    </div>
  );
}

// Outcome visualization: a single donut (the redundant bar list is gone). The
// legend spreads across the card width and carries count + share per outcome.
function OutcomeCard({ counts, total }) {
  const segments = DECISION_BUCKETS.map((b) => ({
    key: b.key,
    label: b.label,
    value: counts[b.key] || 0,
    color: b.color,
  }));

  return (
    <div style={{ ...CARD, padding: 24, marginBottom: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Decisions by outcome</h2>
      <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', margin: '0 0 18px' }}>
        Where every classified case ended up. The policy engine — not the AI — makes the call.
      </p>
      <DonutChart
        segments={segments}
        total={total}
        size={184}
        thickness={28}
        centerLabel="cases"
        legendColumns={2}
        showLegendPct
      />
    </div>
  );
}

// Recovery funnel - four live counts derived from the already-fetched cases +
// paymentLinks. No new API calls, nothing fabricated. Each stage's bar width is
// proportional to its count, so the funnel visibly narrows toward "recovered".
export function RecoveryFunnel({ cases, paymentLinks, approvedCount }) {
  const total = cases.length;
  const retriable = cases.filter((c) => c.classification === 'RETRIABLE').length;
  const recovered = paymentLinks.filter((p) => p.status === 'paid').length;

  const stages = [
    { label: 'Total failed', value: total, color: 'var(--neutral-status)' },
    { label: 'Classified retriable', value: retriable, color: 'var(--accent-policy)' },
    { label: 'Approved', value: approvedCount, color: 'var(--accent-indigo)' },
    { label: 'Recovered', value: recovered, color: 'var(--approve)' },
  ];
  const max = Math.max(total, 1);
  const recoveredPct = total > 0 ? Math.round((recovered / total) * 100) : 0;

  return (
    <div style={{ ...CARD, padding: 24, marginBottom: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Recovery funnel</h2>
      <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', margin: '0 0 22px' }}>
        How much of what failed actually got recovered — every number is a live count.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, alignItems: 'end' }}>
        {stages.map((s) => {
          const widthPct = Math.max((s.value / max) * 100, s.value > 0 ? 16 : 7);
          return (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div
                title={`${s.label}: ${s.value}`}
                style={{
                  width: `${widthPct}%`,
                  minWidth: 10,
                  height: 46,
                  background: s.color,
                  borderRadius: 6,
                }}
              />
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>{s.value}</div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  textAlign: 'center',
                }}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: '1px solid var(--border)',
          fontSize: 12.5,
          color: 'var(--text-secondary)',
        }}
      >
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{recovered}</span> of{' '}
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{total}</span> failed payment
        {total === 1 ? '' : 's'} recovered
        {total > 0 && <span style={{ color: 'var(--text-tertiary)' }}> · {recoveredPct}%</span>}
      </div>
    </div>
  );
}

// Cases per day, derived from the already-fetched case list - no backend work.
// Fills the gap days between first and last case so it reads as a timeline.
function casesPerDay(cases) {
  if (cases.length === 0) return [];
  const byDay = new Map();
  for (const c of cases) {
    if (!c.createdAt) continue;
    const day = c.createdAt.slice(0, 10);
    byDay.set(day, (byDay.get(day) || 0) + 1);
  }
  const days = [...byDay.keys()].sort();
  if (days.length === 0) return [];
  const out = [];
  const cursor = new Date(`${days[0]}T00:00:00Z`);
  const end = new Date(`${days[days.length - 1]}T00:00:00Z`);
  let guard = 0;
  while (cursor <= end && guard < 60) {
    const key = cursor.toISOString().slice(0, 10);
    out.push({ day: key, count: byDay.get(key) || 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    guard += 1;
  }
  return out.slice(-30);
}

function CasesPerDayChart({ cases }) {
  const data = casesPerDay(cases);
  if (data.length < 2) return null;
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div style={{ ...CARD, padding: 24, marginBottom: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Cases per day</h2>
      <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', margin: '0 0 18px' }}>
        Failed-payment cases classified each day (from live Test Mode activity).
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
        {data.map((d) => (
          <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)', fontWeight: 600 }}>{d.count || ''}</span>
            <div
              title={`${d.day}: ${d.count}`}
              style={{
                width: '100%',
                maxWidth: 34,
                height: `${Math.max((d.count / max) * 96, d.count > 0 ? 4 : 2)}px`,
                background: d.count > 0 ? 'var(--accent-policy)' : 'var(--border)',
                borderRadius: '3px 3px 0 0',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>
        <span>{data[0].day.slice(5)}</span>
        <span>{data[data.length - 1].day.slice(5)}</span>
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div style={PAGE}>
      <PageHeader title="Overview" description="Real Test Mode activity across the recovery pipeline." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div style={{ ...CARD, padding: 24, marginBottom: 24 }}>
        <SkeletonBlock width={170} height={16} style={{ marginBottom: 18 }} />
        <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
          <SkeletonBlock width={184} height={184} radius="50%" />
          <div style={{ flex: 1, minWidth: 240, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 28px' }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <SkeletonBlock key={i} width="100%" height={14} />
            ))}
          </div>
        </div>
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
      <div style={PAGE}>
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
    return <OverviewSkeleton />;
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
    <div style={PAGE}>
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
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-policy)' }}>AI proposes. Policy decides.</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Every action is independently evaluated by a deterministic policy engine before execution.
          </div>
        </div>
      </div>

      <OutcomeCard counts={counts} total={cases.length} />

      <RecoveryFunnel cases={cases} paymentLinks={paymentLinks} approvedCount={counts.APPROVE || 0} />

      <CasesPerDayChart cases={cases} />

      <div style={{ ...CARD, overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Recent cases</h2>
          <Link
            to="/cases"
            style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-policy)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            View all cases →
          </Link>
        </div>

        {recentCases.length === 0 && (
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '24px 20px' }}>No revenue cases yet.</div>
        )}

        {recentCases.map((c) => (
          <div
            key={c.caseId}
            onClick={() => navigate(`/case/${c.caseId}`)}
            style={{
              display: 'grid',
              gridTemplateColumns: ROW_COLUMNS,
              gap: 12,
              alignItems: 'center',
              padding: '14px 20px',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-sunken)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 500, wordBreak: 'break-all', minWidth: 0 }}>
              {c.caseId}
            </span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{formatAmount(c.amount, c.currency)}</span>
            <span>
              <ClassificationBadge classification={c.classification} />
            </span>
            <span>
              <DecisionBadge decision={c.decision || 'PENDING'} />
            </span>
            <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{formatDateShort(c.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
