const db = require('../config/firebase');
const { logAuditEvent } = require('../services/auditLog');

// Pure rules only - this engine makes zero LLM calls. It independently
// evaluates the AI's proposal and can veto it; see rule 6 below for the
// default-deny branch that makes that concrete.
const HARD_STOP_REASONS = ['payment_risk_check_failed'];
const MAX_ATTEMPTS_LIMIT = 3;
const RECOVERY_WINDOW_DAYS = 7;
const CONTACT_FREQUENCY_CAP_HOURS = 24;

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value);
}

async function getMatchingRevenueCaseIds(revenueCase) {
  const query = revenueCase.razorpayOrderId
    ? db.collection('revenue_cases').where('razorpayOrderId', '==', revenueCase.razorpayOrderId)
    : db.collection('revenue_cases').where('customerContact', '==', revenueCase.customerContact);
  const snap = await query.get();
  return snap.docs.map((doc) => doc.id);
}

async function countRecoveryAttemptsForCaseIds(caseIds) {
  if (caseIds.length === 0) return 0;
  // Firestore 'in' caps at 30 values - well beyond this project's scope.
  const snap = await db.collection('recovery_attempts').where('caseId', 'in', caseIds.slice(0, 30)).get();
  return snap.size;
}

async function findActiveUnexpiredLink(revenueCase, now) {
  const query = revenueCase.razorpayOrderId
    ? db
        .collection('recovery_attempts')
        .where('razorpayOrderId', '==', revenueCase.razorpayOrderId)
        .where('status', '==', 'active')
    : db
        .collection('recovery_attempts')
        .where('customerContact', '==', revenueCase.customerContact)
        .where('status', '==', 'active');
  const snap = await query.get();
  // expiresAt-in-the-future is filtered here in JS rather than as a query
  // range clause, so this doesn't depend on a composite Firestore index existing.
  return snap.docs.some((doc) => {
    const expiresAt = toDate(doc.data().expiresAt);
    return expiresAt && expiresAt > now;
  });
}

async function findRecentContactAttempt(revenueCase, now) {
  const snap = await db
    .collection('recovery_attempts')
    .where('customerContact', '==', revenueCase.customerContact)
    .get();
  const cutoff = new Date(now.getTime() - CONTACT_FREQUENCY_CAP_HOURS * 60 * 60 * 1000);
  return snap.docs.some((doc) => {
    const createdAt = toDate(doc.data().createdAt);
    return createdAt && createdAt > cutoff;
  });
}

async function evaluateProposal(revenueCase, aiProposal) {
  const now = new Date();
  const rulesApplied = [];
  let decision;
  let reasonCode;

  const hardStop = HARD_STOP_REASONS.includes(revenueCase.errorReason);
  rulesApplied.push({ rule: 1, name: 'HARD_STOP_REASONS', triggered: hardStop });
  if (hardStop) {
    decision = 'DO_NOT_ACT';
    reasonCode = 'HARD_STOP_FRAUD_FLAG';
  }

  if (!decision) {
    const caseIds = await getMatchingRevenueCaseIds(revenueCase);
    const attemptCount = await countRecoveryAttemptsForCaseIds(caseIds);
    const maxAttemptsExceeded = attemptCount >= MAX_ATTEMPTS_LIMIT;
    rulesApplied.push({ rule: 2, name: 'MAX_ATTEMPTS', triggered: maxAttemptsExceeded });
    if (maxAttemptsExceeded) {
      decision = 'VETO';
      reasonCode = 'MAX_ATTEMPTS_EXCEEDED';
    }
  }

  if (!decision) {
    const activeLinkExists = await findActiveUnexpiredLink(revenueCase, now);
    rulesApplied.push({ rule: 3, name: 'ACTIVE_LINK_EXISTS', triggered: activeLinkExists });
    if (activeLinkExists) {
      decision = 'VETO';
      reasonCode = 'ACTIVE_LINK_ALREADY_EXISTS';
    }
  }

  if (!decision) {
    const frequencyCapExceeded = await findRecentContactAttempt(revenueCase, now);
    rulesApplied.push({ rule: 4, name: 'CONTACT_FREQUENCY_CAP', triggered: frequencyCapExceeded });
    if (frequencyCapExceeded) {
      decision = 'VETO';
      reasonCode = 'CONTACT_FREQUENCY_CAP_EXCEEDED';
    }
  }

  if (!decision) {
    const failureDate = toDate(revenueCase.createdAt);
    const windowCutoff = new Date(now.getTime() - RECOVERY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const outsideWindow = Boolean(failureDate) && failureDate < windowCutoff;
    rulesApplied.push({ rule: 5, name: 'RECOVERY_WINDOW', triggered: outsideWindow });
    if (outsideWindow) {
      decision = 'DO_NOT_ACT';
      reasonCode = 'OUTSIDE_RECOVERY_WINDOW';
    }
  }

  if (!decision) {
    // None of the hard-stop/veto/window rules fired. Decide from the upstream
    // classification plus the AI's proposed action - and default to VETO for
    // any combination not explicitly approved below. That default-deny branch
    // is the point: a NON_RETRIABLE case where the AI still proposed
    // SEND_RECOVERY_LINK (AI being wrong or inconsistent) falls straight into
    // DEFAULT_SAFE_VETO here rather than being approved. This deterministic
    // engine overriding the AI's own proposal - with zero LLM calls involved
    // in making that override - is the product's core differentiator.
    if (revenueCase.classification === 'UNCERTAIN' || aiProposal.proposed_action === 'ESCALATE_TO_HUMAN') {
      decision = 'ESCALATE';
      reasonCode = 'UNCERTAIN_OR_AI_ESCALATED';
    } else if (revenueCase.classification === 'RETRIABLE' && aiProposal.proposed_action === 'SEND_RECOVERY_LINK') {
      decision = 'APPROVE';
      reasonCode = 'RETRIABLE_APPROVED';
    } else {
      decision = 'VETO';
      reasonCode = 'DEFAULT_SAFE_VETO';
    }
    rulesApplied.push({ rule: 6, name: 'FINAL_CLASSIFICATION', triggered: true });
  }

  const result = {
    decision,
    reasonCode,
    evaluatedAt: now.toISOString(),
    rulesApplied,
  };

  await db.collection('policy_decisions').doc(revenueCase.caseId).set(result);
  await logAuditEvent(revenueCase.caseId, 'policy_decision_made', { decision, reasonCode });

  return result;
}

module.exports = { evaluateProposal };
