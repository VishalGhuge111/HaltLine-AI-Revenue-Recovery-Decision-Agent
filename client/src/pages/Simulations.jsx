import { useEffect, useState } from 'react';
import { runSimulation, fetchSimulations } from '../api';
import { Panel } from '../components/Panel';
import { formatAmount, formatDateTime } from '../format';

const METHODOLOGY_LINE =
  'Synthetic control/treatment experiment using declared recovery-probability assumptions. Not a live customer A/B test.';

function formatPct(rate) {
  if (rate === null || rate === undefined) return '—';
  return `${(rate * 100).toFixed(1)}%`;
}

function AssumptionsTable({ assumptions }) {
  const classifications = Object.keys(assumptions.distributionByClassification);
  return (
    <div style={{ overflow: 'hidden', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr 1fr 1fr',
          padding: '10px 16px',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          background: 'var(--surface-sunken)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span>Classification</span>
        <span>Declared share</span>
        <span>Control recovery rate</span>
        <span>Treatment recovery rate</span>
      </div>
      {classifications.map((c) => (
        <div
          key={c}
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr 1fr 1fr',
            padding: '10px 16px',
            fontSize: 13,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span style={{ fontWeight: 600 }}>{c.replace('_', ' ')}</span>
          <span>{formatPct(assumptions.distributionByClassification[c])}</span>
          <span>{formatPct(assumptions.controlRecoveryRates[c])}</span>
          <span>{formatPct(assumptions.treatmentRecoveryRates[c])}</span>
        </div>
      ))}
    </div>
  );
}

function SimulationResult({ simulation }) {
  const { summary, assumptions, n, generatedAt } = simulation;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div
        style={{
          padding: 24,
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed var(--escalate-border)',
          background: 'var(--escalate-bg)',
        }}
      >
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--escalate)', marginBottom: 10 }}>
          Simulated Incremental Recovery
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          {formatAmount(summary.simulatedIncrementalRecoveryAmount, 'INR')}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 10, maxWidth: 640 }}>
          {METHODOLOGY_LINE}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
          Batch of {n} synthetic cases · generated {formatDateTime(generatedAt)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ padding: 18, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
            Control group
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>
            {formatAmount(summary.controlRecoveredAmount, 'INR')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {summary.controlRecoveredCount} / {summary.controlGroupSize} recovered ·{' '}
            {formatPct(summary.controlRecoveryRateActual)} actual
          </div>
        </div>
        <div style={{ padding: 18, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
            Treatment group
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>
            {formatAmount(summary.treatmentRecoveredAmount, 'INR')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {summary.treatmentRecoveredCount} / {summary.treatmentGroupSize} recovered ·{' '}
            {formatPct(summary.treatmentRecoveryRateActual)} actual
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Declared assumptions used</div>
        <AssumptionsTable assumptions={assumptions} />
      </div>
    </div>
  );
}

export function Simulations() {
  const [current, setCurrent] = useState(null);
  const [past, setPast] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  function loadPast() {
    fetchSimulations()
      .then(setPast)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadPast();
  }, []);

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      const simulation = await runSimulation();
      setCurrent(simulation);
      loadPast();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 32px 80px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Simulations</h1>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--escalate)',
                background: 'var(--escalate-bg)',
                border: '1px solid var(--escalate-border)',
                borderRadius: 999,
                padding: '2px 10px',
              }}
            >
              Synthetic — not real data
            </span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '6px 0 0', maxWidth: 640 }}>
            A synthetic batch experiment used to illustrate what recovery-link intervention could be worth, under
            declared assumptions. Fully separate from real revenue cases — nothing on this page is summed with or
            shown alongside real case data.
          </p>
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          style={{
            flexShrink: 0,
            padding: '12px 20px',
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            background: running ? 'var(--text-tertiary)' : '#17171a',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: running ? 'default' : 'pointer',
          }}
        >
          {running ? 'Running…' : 'Run New Simulation'}
        </button>
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
            marginBottom: 24,
          }}
        >
          {error}
        </div>
      )}

      {current && (
        <div style={{ marginBottom: 32 }}>
          <SimulationResult simulation={current} />
        </div>
      )}

      <Panel title="Past simulation runs" eyebrow="History">
        {past === null && (
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Loading…</div>
        )}
        {past && past.length === 0 && (
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>No simulations run yet.</div>
        )}
        {past && past.length > 0 && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 0.6fr 1fr 1fr 1.2fr',
                padding: '10px 4px',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span>Batch</span>
              <span>N</span>
              <span>Control recovered</span>
              <span>Treatment recovered</span>
              <span>Incremental recovery</span>
            </div>
            {past.map((sim) => (
              <div
                key={sim.batchId}
                onClick={() => setCurrent(sim.summary ? { ...sim } : sim)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 0.6fr 1fr 1fr 1.2fr',
                  alignItems: 'center',
                  padding: '12px 4px',
                  fontSize: 13,
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>
                  {sim.batchId} <span style={{ color: 'var(--text-tertiary)' }}>· {formatDateTime(sim.generatedAt)}</span>
                </span>
                <span>{sim.n}</span>
                <span>{formatAmount(sim.summary.controlRecoveredAmount, 'INR')}</span>
                <span>{formatAmount(sim.summary.treatmentRecoveredAmount, 'INR')}</span>
                <span style={{ fontWeight: 700 }}>
                  {formatAmount(sim.summary.simulatedIncrementalRecoveryAmount, 'INR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
