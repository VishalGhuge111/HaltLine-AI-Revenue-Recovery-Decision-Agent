// DEV/DEMO-ONLY TOOLING - not part of the product's real customer-facing
// surface. This page (and its "Live Demo" entry in the Sidebar nav) drives
// Razorpay's Custom Checkout purely to reliably trigger a Test Mode payment
// failure for demos. The actual product only ever creates Payment Links, never
// embeds checkout.
//
// It depends on the backend test harness, which is mounted only when the server
// has ENABLE_TEST_HARNESS=true set. With that flag unset (the real-deployment
// default), POST /test-harness/create-order returns 404 and "Create Order &
// Trigger Checkout" below will just surface an error - expected, since this
// page is not meant to ship enabled. The note at the bottom of the page states
// the same thing for anyone viewing it in the UI.
import { useEffect, useRef, useState } from 'react';
import { PAGE } from '../pageStyle';
import { Link } from 'react-router-dom';
import { fetchCases, fetchCaseDetail } from '../api';
import { PageHeader } from '../components/PageHeader';
import { ClassificationBadge, DecisionBadge } from '../components/StatusBadge';
import { formatAmount, formatDateTime, AI_ACTION_LABELS } from '../format';

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_CHECKS = 10; // 10 * 3s = 30s

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load the Razorpay checkout script'));
    document.body.appendChild(script);
  });
}

export function LiveDemo() {
  // Rupee-denominated for humans. The test-harness endpoint still expects paise
  // (Razorpay's convention) - we convert on the way out, in handleCreateOrder.
  const [amount, setAmount] = useState('1.00');
  const [creating, setCreating] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [latestCase, setLatestCase] = useState(null);
  const [checking, setChecking] = useState(false);
  const [polling, setPolling] = useState(false);

  const pollIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  async function checkLatestCase() {
    setChecking(true);
    try {
      const cases = await fetchCases();
      if (cases.length === 0) {
        setChecking(false);
        return;
      }
      const detail = await fetchCaseDetail(cases[0].caseId);
      setLatestCase({
        caseId: detail.case.caseId,
        amount: detail.case.amount,
        currency: detail.case.currency,
        classification: detail.case.classification,
        createdAt: detail.case.createdAt,
        aiProposal: detail.aiProposal,
        policyDecision: detail.policyDecision,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  function startPolling() {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setPolling(true);
    checkLatestCase();
    let checks = 0;
    pollIntervalRef.current = setInterval(() => {
      checks += 1;
      checkLatestCase();
      if (checks >= POLL_MAX_CHECKS) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        setPolling(false);
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleCreateOrder() {
    setError(null);
    setCreating(true);
    setOrder(null);
    try {
      // Convert rupees -> paise right before the call; backend contract is unchanged.
      const paise = Math.max(1, Math.round((Number(amount) || 1) * 100));
      const res = await fetch('/test-harness/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: paise, currency: 'INR' }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Order creation failed (${res.status})`);
      }

      const createdOrder = await res.json();
      setOrder(createdOrder);

      await loadRazorpayScript();

      const rzp = new window.Razorpay({
        key: createdOrder.keyId,
        order_id: createdOrder.orderId,
        amount: createdOrder.amount,
        currency: createdOrder.currency,
        name: 'Halt Line',
        description: 'Live demo order - Test Mode, not a real charge',
        prefill: createdOrder.contact ? { contact: createdOrder.contact } : undefined,
        handler: function () {
          startPolling();
        },
        modal: {
          ondismiss: function () {
            startPolling();
          },
        },
      });

      rzp.on('payment.failed', function () {
        startPolling();
      });

      rzp.open();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={PAGE}>
      <PageHeader
        title="Live Demo"
        description="Trigger a real Razorpay Test Mode payment failure and watch it flow through the full pipeline live: classify → AI propose → policy decide → execute (if approved)."
      />

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          padding: 24,
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Amount (₹)
            </span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                fontSize: 14,
                fontWeight: 500,
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-strong)',
                width: 140,
              }}
            />
          </label>

          <button
            onClick={handleCreateOrder}
            disabled={creating}
            style={{
              padding: '11px 20px',
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
              background: creating ? 'var(--text-tertiary)' : '#17171a',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: creating ? 'default' : 'pointer',
            }}
          >
            {creating ? 'Creating order…' : 'Create Order & Trigger Checkout'}
          </button>
        </div>

        {error && (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 'var(--radius-md)',
              background: 'var(--veto-bg)',
              border: '1px solid var(--veto-border)',
              color: 'var(--veto)',
              fontSize: 13.5,
            }}
          >
            {error}
          </div>
        )}

        {order && (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-policy-bg)',
              border: '1px solid var(--accent-policy-border)',
              color: 'var(--accent-policy)',
              fontSize: 13.5,
              lineHeight: 1.6,
            }}
          >
            Order created: <strong style={{ fontFamily: 'var(--font-mono)' }}>{order.orderId}</strong>. Complete the
            checkout in the popup, then click "Check Latest Case" below once done.
            {order.contact && (
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                Prefilled test contact: <span style={{ fontFamily: 'var(--font-mono)' }}>{order.contact}</span>{' '}
                (fresh per order, so the frequency-cap rule won't fire artificially)
              </div>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          padding: 18,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface-sunken)',
          border: '1px solid var(--border)',
          marginBottom: 20,
          fontSize: 13.5,
        }}
      >
        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
          Test card
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13.5, color: 'var(--text-primary)' }}>
          Card: 4100 2800 0009 0000 · Any CVV · Any future expiry · On the mock bank page, click Failure
        </div>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          padding: 24,
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Latest case</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {polling && (
              <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>Watching for updates…</span>
            )}
            <button
              onClick={checkLatestCase}
              disabled={checking}
              style={{
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                background: 'var(--surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                cursor: checking ? 'default' : 'pointer',
              }}
            >
              {checking ? 'Checking…' : 'Check Latest Case'}
            </button>
          </div>
        </div>

        {!latestCase && (
          <div style={{ fontSize: 13.5, color: 'var(--text-tertiary)' }}>
            No case checked yet. Trigger a failure above, or click "Check Latest Case".
          </div>
        )}

        {latestCase && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-tertiary)', wordBreak: 'break-all' }}>
                  {latestCase.caseId}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>
                  {formatAmount(latestCase.amount, latestCase.currency)}
                </div>
              </div>
              <Link
                to={`/case/${latestCase.caseId}`}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--accent-policy)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '7px 14px',
                  background: 'var(--surface-sunken)',
                }}
              >
                View Full Case →
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                  Classification
                </div>
                <ClassificationBadge classification={latestCase.classification} />
              </div>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                  AI proposal
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                  {latestCase.aiProposal
                    ? AI_ACTION_LABELS[latestCase.aiProposal.proposed_action] || latestCase.aiProposal.proposed_action
                    : 'Not yet proposed'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                  Policy decision
                </div>
                <DecisionBadge decision={latestCase.policyDecision ? latestCase.policyDecision.decision : 'PENDING'} />
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              Failed at {formatDateTime(latestCase.createdAt)}
            </div>
          </div>
        )}
      </div>

      <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
        This page uses Razorpay's Custom Checkout purely to reliably trigger a test failure for this demo. The
        actual product only ever creates Payment Links (see Payment Links page) - it never embeds checkout.
      </div>
    </div>
  );
}
