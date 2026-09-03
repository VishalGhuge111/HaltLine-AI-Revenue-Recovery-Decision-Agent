import { useEffect, useState } from 'react';
import { PAGE } from '../pageStyle';
import { Link, useParams } from 'react-router-dom';
import { fetchCaseDetail, sendCaseEmail, resolveEscalation } from '../api';
import { DecisionBadge, ClassificationBadge, RecoveryStatusBadge } from '../components/StatusBadge';
import { ConfidenceMeter } from '../components/ConfidenceMeter';
import { RulesChecklist, RULE_LABELS } from '../components/RulesChecklist';
import { AuditTimeline } from '../components/AuditTimeline';
import { HumanReview } from '../components/HumanReview';
import { Panel } from '../components/Panel';
import { ExternalLink } from '../components/ExternalLink';
import { SkeletonBlock } from '../components/Skeleton';
import { formatAmount, formatDateTime, formatSnakeCase, AI_ACTION_LABELS } from '../format';

function impliesAgreement(aiAction, decision) {
  if (aiAction === 'SEND_RECOVERY_LINK') return decision === 'APPROVE';
  if (aiAction === 'ESCALATE_TO_HUMAN') return decision === 'ESCALATE';
  if (aiAction === 'NO_ACTION_RECOMMENDED') return decision === 'VETO' || decision === 'DO_NOT_ACT';
  return false;
}

// The deciding rule is always the last entry in rulesApplied (evaluation stops
// at the first triggered rule). Only when that's rule 6 (FINAL_CLASSIFICATION)
// did the policy engine actually consult the AI's proposed_action - rules 1-5
// are hard vetoes that fire without ever looking at what the AI proposed.
function getComparison(aiProposal, policyDecision) {
  if (!aiProposal || !policyDecision) return null;
  // Once a human has resolved an escalation, the decision on the doc no longer
  // reflects a pure AI-vs-policy comparison - the human-review box tells that
  // story instead.
  if (policyDecision.resolvedBy === 'human') return null;
  const rules = policyDecision.rulesApplied || [];
  const decidingRule = rules[rules.length - 1];
  const consultedAi = decidingRule?.name === 'FINAL_CLASSIFICATION';

  if (!consultedAi) {
    return {
      tone: 'independent',
      message: `The policy engine vetoed independently of the AI's proposal — the "${
        RULE_LABELS[decidingRule?.name] || decidingRule?.name
      }" rule fired first and decided the case before the AI's reasoning was ever consulted.`,
    };
  }

  const agrees = impliesAgreement(aiProposal.proposed_action, policyDecision.decision);
  return agrees
    ? { tone: 'agree', message: "The policy engine reached the same outcome as the AI's proposal." }
    : {
        tone: 'override',
        message:
          "The policy engine independently overrode the AI's proposal — this is the policy engine acting as a separate, deterministic check on the AI, not a rubber stamp.",
      };
}

export function CaseDetail() {
  const { caseId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState(null);
  const [resolving, setResolving] = useState(null); // 'approve' | 'reject' | null
  const [resolveError, setResolveError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetchCaseDetail(caseId)
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  async function handleSendEmail() {
    setSendingEmail(true);
    setEmailResult(null);
    try {
      const result = await sendCaseEmail(caseId);
      setEmailResult({
        type: 'success',
        message: `Email sent to ${result.recipient}. Refresh to see the new audit trail entry.`,
      });
    } catch (err) {
      setEmailResult({ type: 'error', message: err.message });
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleResolve(action) {
    setResolving(action);
    setResolveError(null);
    try {
      // Endpoint returns the refreshed case-detail payload - swap it straight in.
      const updated = await resolveEscalation(caseId, action);
      setData(updated);
    } catch (err) {
      setResolveError(err.message);
    } finally {
      setResolving(null);
    }
  }

  if (error) {
    return (
      <div style={PAGE}>
        <BackLink />
        <div
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 'var(--radius-md)',
            background: 'var(--veto-bg)',
            border: '1px solid var(--veto-border)',
            color: 'var(--veto)',
            fontSize: 14,
          }}
        >
          Failed to load case: {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return <CaseDetailSkeleton />;
  }

  const { case: c, aiProposal, policyDecision, recoveryAttempts, auditTrail } = data;
  const comparison = getComparison(aiProposal, policyDecision);

  // Human-in-the-loop resolution state for ESCALATE cases.
  const awaitingHumanReview =
    policyDecision && policyDecision.decision === 'ESCALATE' && !policyDecision.resolvedAt;
  const humanResolved = Boolean(policyDecision && policyDecision.resolvedAt && policyDecision.resolvedBy === 'human');
  const humanApproved = humanResolved && policyDecision.reasonCode === 'HUMAN_APPROVED_ESCALATION';

  return (
    <div style={PAGE}>
      <BackLink />

      {/* Case header */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          padding: 24,
          marginTop: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 6 }}>
              {c.caseId}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.01em' }}>
              {formatAmount(c.amount, c.currency)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <ClassificationBadge classification={c.classification} />
            <DecisionBadge decision={policyDecision ? policyDecision.decision : 'PENDING'} />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 16,
            marginTop: 20,
            paddingTop: 20,
            borderTop: '1px solid var(--border)',
          }}
        >
          <Field label="Error source" value={c.errorSource || '—'} />
          <Field label="Error reason" value={formatSnakeCase(c.errorReason)} />
          <Field label="Error step" value={formatSnakeCase(c.errorStep)} />
          <Field label="Failed at" value={formatDateTime(c.createdAt)} />
        </div>
        {c.errorDescription && (
          <div style={{ marginTop: 16, fontSize: 13.5, color: 'var(--text-secondary)' }}>{c.errorDescription}</div>
        )}
      </div>

      {/* Decision chain: AI proposed -> Policy decided */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: aiProposal && policyDecision ? '1fr auto 1fr' : '1fr',
            gap: 16,
            alignItems: 'stretch',
          }}
        >
          <Panel
            eyebrow="AI Suggested"
            eyebrowColor="var(--accent-ai)"
            title={aiProposal ? AI_ACTION_LABELS[aiProposal.proposed_action] || aiProposal.proposed_action : 'No proposal'}
            style={{ borderTop: '3px solid var(--accent-ai)' }}
          >
            {aiProposal ? (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                    Confidence
                  </div>
                  <ConfidenceMeter confidence={aiProposal.confidence} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                    Reasoning
                  </div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-primary)' }}>
                    {aiProposal.reasoning}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                    Draft customer message
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: 'var(--text-secondary)',
                      background: 'var(--accent-ai-bg)',
                      border: '1px solid var(--accent-ai-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 12,
                      fontStyle: 'italic',
                    }}
                  >
                    "{aiProposal.customer_message}"
                  </div>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                No AI proposal was generated for this case.
              </div>
            )}
          </Panel>

          {aiProposal && policyDecision && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--text-tertiary)' }}>
                <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}

          <Panel
            eyebrow="Policy Decided"
            eyebrowColor="var(--accent-policy)"
            title={policyDecision ? formatSnakeCase(policyDecision.decision) : 'No decision'}
            right={policyDecision ? <DecisionBadge decision={policyDecision.decision} /> : null}
            style={{ borderTop: '3px solid var(--accent-policy)' }}
          >
            {policyDecision ? (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                    Reason code
                  </div>
                  <div style={{ fontSize: 13.5, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                    {policyDecision.reasonCode}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 10 }}>
                    Rules evaluated, in order
                  </div>
                  <RulesChecklist rules={policyDecision.rulesApplied} />
                </div>

                {(awaitingHumanReview || humanResolved) && (
                  <HumanReview
                    awaiting={awaitingHumanReview}
                    approved={humanApproved}
                    resolvedAt={policyDecision.resolvedAt}
                    resolving={resolving}
                    error={resolveError}
                    onResolve={handleResolve}
                  />
                )}
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                The policy engine has not yet evaluated this case.
              </div>
            )}
          </Panel>
        </div>

        {comparison && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              ...(comparison.tone === 'agree'
                ? { background: 'var(--surface-sunken)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                : {
                    background: 'var(--escalate-bg)',
                    color: 'var(--escalate)',
                    border: '1px solid var(--escalate-border)',
                  }),
            }}
          >
            {comparison.message}
          </div>
        )}
      </div>

      {/* Recovery attempt */}
      {recoveryAttempts && recoveryAttempts.length > 0 && (
        <Panel
          title="Recovery attempt"
          eyebrow="Executed action"
          style={{ marginBottom: 20 }}
          right={
            policyDecision?.decision === 'APPROVE' && (
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail}
                style={{
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  background: sendingEmail ? 'var(--text-tertiary)' : '#17171a',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: sendingEmail ? 'default' : 'pointer',
                }}
              >
                {sendingEmail ? 'Sending…' : 'Send Recovery Email'}
              </button>
            )
          }
        >
          {emailResult && (
            <div
              style={{
                marginBottom: 14,
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                fontWeight: 500,
                ...(emailResult.type === 'success'
                  ? { background: 'var(--approve-bg)', color: 'var(--approve)', border: '1px solid var(--approve-border)' }
                  : { background: 'var(--veto-bg)', color: 'var(--veto)', border: '1px solid var(--veto-border)' }),
              }}
            >
              {emailResult.message}
            </div>
          )}
          {recoveryAttempts.map((attempt) => {
            return (
              <div
                key={attempt.paymentLinkId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  padding: '12px 0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <RecoveryStatusBadge status={attempt.status} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {attempt.paymentLinkId}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
                    Created {formatDateTime(attempt.createdAt)}
                    {attempt.paidAt ? ` · Paid ${formatDateTime(attempt.paidAt)}` : ''}
                  </span>
                  {attempt.shortUrl && <ExternalLink href={attempt.shortUrl}>Open payment link</ExternalLink>}
                </div>
              </div>
            );
          })}
        </Panel>
      )}

      {/* Audit trail */}
      <Panel title="Audit trail" eyebrow="Full event log">
        <AuditTimeline events={auditTrail} />
      </Panel>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/cases"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--text-secondary)',
      }}
    >
      ← All cases
    </Link>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

const SKELETON_CARD = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-sm)',
  padding: 24,
};

function CaseDetailSkeleton() {
  return (
    <div style={PAGE}>
      <BackLink />

      <div style={{ ...SKELETON_CARD, marginTop: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SkeletonBlock width={220} height={12} />
            <SkeletonBlock width={140} height={28} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <SkeletonBlock width={92} height={22} />
            <SkeletonBlock width={80} height={22} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 24 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <SkeletonBlock width={70} height={10} />
              <SkeletonBlock width="80%" height={14} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {[0, 1].map((col) => (
          <div key={col} style={{ ...SKELETON_CARD, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SkeletonBlock width={110} height={11} />
            <SkeletonBlock width="60%" height={18} />
            <SkeletonBlock width="100%" height={12} />
            <SkeletonBlock width="100%" height={12} />
            <SkeletonBlock width="75%" height={12} />
          </div>
        ))}
      </div>

      <div style={{ ...SKELETON_CARD, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SkeletonBlock width={120} height={11} />
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBlock key={i} width="100%" height={14} />
        ))}
      </div>
    </div>
  );
}

