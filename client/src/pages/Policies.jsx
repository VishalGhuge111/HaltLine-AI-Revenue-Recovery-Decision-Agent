import { PageHeader } from '../components/PageHeader';
import { PAGE } from '../pageStyle';
import { DecisionBadge } from '../components/StatusBadge';
import { RULE_LABELS } from '../components/RulesChecklist';

const RULES = [
  {
    rule: 1,
    name: 'HARD_STOP_REASONS',
    description:
      'If the payment’s error reason is a hard-stop fraud/risk flag (currently: payment_risk_check_failed), the case is stopped immediately — before the AI’s proposal is even generated or consulted.',
    outcomes: [{ decision: 'DO_NOT_ACT', reasonCode: 'HARD_STOP_FRAUD_FLAG' }],
  },
  {
    rule: 2,
    name: 'MAX_ATTEMPTS',
    description:
      'Counts prior recovery attempts across every revenue case matching this order (or customer contact, if there’s no order id). If 3 or more attempts have already been made, the case is vetoed — the system stops re-contacting a customer who hasn’t converted.',
    outcomes: [{ decision: 'VETO', reasonCode: 'MAX_ATTEMPTS_EXCEEDED' }],
  },
  {
    rule: 3,
    name: 'ACTIVE_LINK_EXISTS',
    description:
      'Checks whether a recovery link for the same order or contact is still active and unexpired. If one exists, this case is vetoed rather than sending a second, competing link.',
    outcomes: [{ decision: 'VETO', reasonCode: 'ACTIVE_LINK_ALREADY_EXISTS' }],
  },
  {
    rule: 4,
    name: 'CONTACT_FREQUENCY_CAP',
    description:
      'If any recovery attempt was created for this customer’s contact within the last 24 hours, this case is vetoed — the same customer is never contacted more than once a day.',
    outcomes: [{ decision: 'VETO', reasonCode: 'CONTACT_FREQUENCY_CAP_EXCEEDED' }],
  },
  {
    rule: 5,
    name: 'RECOVERY_WINDOW',
    description:
      'If the payment failure happened more than 7 days ago, the case is marked do-not-act — recovery outreach that late is no longer worth pursuing.',
    outcomes: [{ decision: 'DO_NOT_ACT', reasonCode: 'OUTSIDE_RECOVERY_WINDOW' }],
  },
  {
    rule: 6,
    name: 'FINAL_CLASSIFICATION',
    description:
      'If none of rules 1–5 triggered, the policy engine makes its final call from the case’s classification and the AI’s proposed action. The AI’s proposal is only ever a suggestion at this point — the engine decides independently, and defaults to a safe veto for anything it doesn’t explicitly recognize as approvable.',
    branches: [
      {
        condition: 'Classification is UNCERTAIN, or the AI proposed ESCALATE_TO_HUMAN',
        decision: 'ESCALATE',
        reasonCode: 'UNCERTAIN_OR_AI_ESCALATED',
      },
      {
        condition: 'Classification is RETRIABLE and the AI proposed SEND_RECOVERY_LINK',
        decision: 'APPROVE',
        reasonCode: 'RETRIABLE_APPROVED',
      },
      {
        condition: 'Anything else — including a NON_RETRIABLE case where the AI proposed sending a link anyway',
        decision: 'VETO',
        reasonCode: 'DEFAULT_SAFE_VETO',
      },
    ],
  },
];

function RuleCard({ rule }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding: 22,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'var(--accent-policy-bg)',
            color: 'var(--accent-policy)',
            border: '1px solid var(--accent-policy-border)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12.5,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {rule.rule}
        </span>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{RULE_LABELS[rule.name]}</h2>
      </div>

      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)', margin: '0 0 14px' }}>
        {rule.description}
      </p>

      {rule.outcomes && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {rule.outcomes.map((o) => (
            <div
              key={o.reasonCode}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-sunken)',
                border: '1px solid var(--border)',
              }}
            >
              <DecisionBadge decision={o.decision} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>
                {o.reasonCode}
              </span>
            </div>
          ))}
        </div>
      )}

      {rule.branches && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rule.branches.map((b) => (
            <div
              key={b.reasonCode}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-sunken)',
                border: '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', flex: 1 }}>{b.condition}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <DecisionBadge decision={b.decision} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                  {b.reasonCode}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Policies() {
  return (
    <div style={PAGE}>
      <PageHeader
        title="Policies"
        description="The deterministic rules that make the final call on every case."
      />

      <div
        style={{
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--accent-policy-bg)',
          border: '1px solid var(--accent-policy-border)',
          color: 'var(--accent-policy)',
          fontSize: 14,
          fontWeight: 500,
          lineHeight: 1.6,
          marginBottom: 28,
        }}
      >
        These rules run in this exact order, every time, for every case. The AI's proposal is only ever a
        suggestion — these rules make the final call.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {RULES.map((rule) => (
          <RuleCard key={rule.rule} rule={rule} />
        ))}
      </div>
    </div>
  );
}
