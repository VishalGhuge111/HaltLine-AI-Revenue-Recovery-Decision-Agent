import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCases } from '../api';
import { DecisionBadge, ClassificationBadge } from '../components/StatusBadge';
import { formatAmount, formatDateTime, shortenId } from '../format';

export function CaseList() {
  const [cases, setCases] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    fetchCases()
      .then((data) => {
        if (!cancelled) setCases(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 32px 80px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Revenue cases</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '6px 0 0' }}>
          Every failed payment the system has classified, with the AI's proposal and the policy engine's
          independent decision.
        </p>
      </div>

      {error && (
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
          Failed to load cases: {error}
        </div>
      )}

      {!error && cases === null && (
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '32px 0' }}>Loading cases…</div>
      )}

      {cases && cases.length === 0 && (
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '32px 0' }}>
          No revenue cases yet.
        </div>
      )}

      {cases && cases.length > 0 && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.3fr 1fr 1fr 1fr 1.1fr',
              padding: '12px 20px',
              fontSize: 11.5,
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span>Case</span>
            <span>Amount</span>
            <span>Classification</span>
            <span>Decision</span>
            <span>Time</span>
          </div>

          {cases.map((c) => (
            <div
              key={c.caseId}
              onClick={() => navigate(`/case/${c.caseId}`)}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.3fr 1fr 1fr 1fr 1.1fr',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'background 120ms ease',
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
      )}
    </div>
  );
}
