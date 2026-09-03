import { useEffect, useState } from 'react';
import { PAGE } from '../pageStyle';
import { fetchSettings, saveSettings } from '../api';
import { PageHeader } from '../components/PageHeader';

const CARD = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-sm)',
};

function SectionLabel({ children, style }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: 'var(--text-tertiary)',
        margin: '0 0 12px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Static, informational - real facts already known to the frontend. No controls.
function EnvironmentCard() {
  const facts = [
    { label: 'Product', value: 'Halt Line' },
    { label: 'Mode', value: 'Razorpay Test Mode', accent: true },
    { label: 'Recovery channel', value: 'Payment Links only' },
    { label: 'Decision engine', value: 'Deterministic policy · 6 rules' },
  ];
  return (
    <div style={{ ...CARD, padding: 24, marginBottom: 32 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px 32px' }}>
        {facts.map((f) => (
          <div key={f.label}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {f.label}
            </div>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                marginTop: 4,
                color: f.accent ? 'var(--accent-indigo)' : 'var(--text-primary)',
              }}
            >
              {f.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      style={{
        width: 44,
        height: 26,
        borderRadius: 999,
        border: 'none',
        background: checked ? 'var(--approve)' : 'var(--border-strong)',
        position: 'relative',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 150ms ease',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 150ms ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
        }}
      />
    </button>
  );
}

export function Settings() {
  const [demoEmailOverride, setDemoEmailOverride] = useState('');
  const [autoSendEmail, setAutoSendEmail] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedMessage, setSavedMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchSettings()
      .then((settings) => {
        if (cancelled) return;
        setDemoEmailOverride(settings.demoEmailOverride || '');
        setAutoSendEmail(Boolean(settings.autoSendEmail));
        setLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      const settings = await saveSettings({
        demoEmailOverride: demoEmailOverride.trim() || null,
        autoSendEmail,
      });
      setDemoEmailOverride(settings.demoEmailOverride || '');
      setAutoSendEmail(Boolean(settings.autoSendEmail));
      setSavedMessage('Settings saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={PAGE}>
      <PageHeader title="Settings" description="Demo and testing configuration for outgoing recovery emails." />

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

      <SectionLabel>Environment</SectionLabel>
      <EnvironmentCard />

      <SectionLabel>Email notifications</SectionLabel>

      <div style={{ ...CARD, padding: 24, marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
          Demo notification email
        </label>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 14px', lineHeight: 1.55, maxWidth: 560 }}>
          When set, all outgoing recovery emails are sent here instead of the customer's real email — useful for
          demos and testing. Leave blank to send to each case's actual customer email.
        </p>
        <input
          type="email"
          placeholder="you@example.com"
          value={demoEmailOverride}
          onChange={(e) => setDemoEmailOverride(e.target.value)}
          style={{
            fontSize: 14,
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-strong)',
            width: '100%',
            maxWidth: 360,
          }}
        />
      </div>

      <div style={{ ...CARD, padding: 24, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>Auto-send email on APPROVE</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55, maxWidth: 460 }}>
              When on, the AI's drafted message is automatically emailed the moment a case is approved. When off,
              emails must be sent manually from the case detail page.
            </p>
          </div>
          <Toggle checked={autoSendEmail} onChange={setAutoSendEmail} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={handleSave}
          disabled={saving || !loaded}
          style={{
            padding: '11px 22px',
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            background: saving || !loaded ? 'var(--text-tertiary)' : '#17171a',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: saving || !loaded ? 'default' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {savedMessage && (
          <span style={{ fontSize: 13, color: 'var(--approve)', fontWeight: 600 }}>{savedMessage}</span>
        )}
      </div>
    </div>
  );
}
