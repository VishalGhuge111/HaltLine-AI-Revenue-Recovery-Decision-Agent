const express = require('express');
const db = require('../config/firebase');
const { sendRecoveryEmail } = require('../services/sendRecoveryEmail');
const { executeApprovedRecovery } = require('../services/executeApprovedRecovery');
const { logAuditEvent } = require('../services/auditLog');

const router = express.Router();

// Mostly read-only: this route group exists to surface existing Firestore
// state (revenue_cases, ai_proposals, policy_decisions, recovery_attempts,
// audit_trail) for the dashboard. The one exception is POST
// /cases/:caseId/send-email below, which triggers a real side effect
// (sending an email) on demand.

function toIso(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

router.get('/cases', async (req, res) => {
  try {
    const casesSnap = await db.collection('revenue_cases').orderBy('createdAt', 'desc').get();

    const cases = await Promise.all(
      casesSnap.docs.map(async (doc) => {
        const data = doc.data();
        const decisionDoc = await db.collection('policy_decisions').doc(doc.id).get();
        const decision = decisionDoc.exists ? decisionDoc.data() : null;

        return {
          caseId: doc.id,
          amount: data.amount,
          currency: data.currency,
          classification: data.classification,
          createdAt: toIso(data.createdAt),
          decision: decision ? decision.decision : null,
          reasonCode: decision ? decision.reasonCode : null,
        };
      }),
    );

    res.status(200).json({ status: 'ok', cases });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Assembles the full case-detail payload (case + proposal + decision + attempts
// + audit trail). Shared by GET /cases/:caseId and the resolve-escalation
// endpoint, which returns the refreshed state after a human resolution.
// Returns null if the case doesn't exist.
async function assembleCaseDetail(caseId) {
  const caseDoc = await db.collection('revenue_cases').doc(caseId).get();
  if (!caseDoc.exists) {
    return null;
  }

  const [proposalDoc, decisionDoc, recoveryAttemptsSnap, auditSnap] = await Promise.all([
    db.collection('ai_proposals').doc(caseId).get(),
    db.collection('policy_decisions').doc(caseId).get(),
    db.collection('recovery_attempts').where('caseId', '==', caseId).get(),
    db.collection('audit_trail').where('caseId', '==', caseId).get(),
  ]);

  const caseData = caseDoc.data();

  return {
    case: {
      caseId: caseDoc.id,
      razorpayPaymentId: caseData.razorpayPaymentId,
      razorpayOrderId: caseData.razorpayOrderId,
      amount: caseData.amount,
      currency: caseData.currency,
      customerContact: caseData.customerContact,
      customerEmail: caseData.customerEmail,
      errorCode: caseData.errorCode,
      errorDescription: caseData.errorDescription,
      errorSource: caseData.errorSource,
      errorReason: caseData.errorReason,
      errorStep: caseData.errorStep,
      classification: caseData.classification,
      createdAt: toIso(caseData.createdAt),
    },
    aiProposal: proposalDoc.exists
      ? { ...proposalDoc.data(), createdAt: toIso(proposalDoc.data().createdAt) }
      : null,
    policyDecision: decisionDoc.exists ? decisionDoc.data() : null,
    recoveryAttempts: recoveryAttemptsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        paymentLinkId: doc.id,
        createdAt: toIso(data.createdAt),
        expiresAt: toIso(data.expiresAt),
        paidAt: toIso(data.paidAt),
      };
    }),
    auditTrail: auditSnap.docs
      .map((doc) => {
        const data = doc.data();
        return { ...data, timestamp: toIso(data.timestamp) };
      })
      .sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || '')),
  };
}

router.get('/cases/:caseId', async (req, res) => {
  try {
    const detail = await assembleCaseDetail(req.params.caseId);
    if (!detail) {
      return res.status(404).json({ status: 'error', message: 'Case not found' });
    }
    res.status(200).json({ status: 'ok', ...detail });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Manual human resolution of an ESCALATED case. AI proposes, the policy engine
// decides automatically, and for ESCALATE cases specifically a human is the
// final word - this endpoint is that step. It only ever runs AFTER the pipeline
// has already produced an ESCALATE decision; it does not re-run classification,
// the AI proposal, or the policy engine.
//   body: { action: "approve" | "reject" }
router.post('/cases/:caseId/resolve-escalation', async (req, res) => {
  try {
    const { caseId } = req.params;
    const action = req.body?.action;

    if (action !== 'approve' && action !== 'reject') {
      return res
        .status(400)
        .json({ status: 'error', message: 'Body must include action: "approve" or "reject"' });
    }

    const [caseDoc, proposalDoc, decisionDoc] = await Promise.all([
      db.collection('revenue_cases').doc(caseId).get(),
      db.collection('ai_proposals').doc(caseId).get(),
      db.collection('policy_decisions').doc(caseId).get(),
    ]);

    if (!caseDoc.exists) {
      return res.status(404).json({ status: 'error', message: 'Case not found' });
    }

    const existingDecision = decisionDoc.exists ? decisionDoc.data() : null;

    // Guard: only escalated, not-yet-resolved cases can be resolved here.
    if (!existingDecision || existingDecision.decision !== 'ESCALATE') {
      return res.status(400).json({
        status: 'error',
        message: 'This case is not currently ESCALATE - the resolve-escalation action does not apply to it',
      });
    }
    if (existingDecision.resolvedAt) {
      return res.status(400).json({
        status: 'error',
        message: 'This escalation has already been resolved',
      });
    }

    const revenueCase = caseDoc.data();
    const aiProposal = proposalDoc.exists ? proposalDoc.data() : null;
    const resolvedAt = new Date().toISOString();

    if (action === 'approve') {
      // Identical "act on APPROVE" path as the webhook's automatic APPROVE
      // decision: create the Razorpay Payment Link, write recovery_attempts,
      // and (if the auto-send setting is on) send the recovery email. That
      // email step is handled inside executeApprovedRecovery, not duplicated
      // here.
      await executeApprovedRecovery(revenueCase, aiProposal);

      await db
        .collection('policy_decisions')
        .doc(caseId)
        .set({
          ...existingDecision, // keep original evaluatedAt + rulesApplied
          decision: 'APPROVE',
          reasonCode: 'HUMAN_APPROVED_ESCALATION',
          resolvedAt,
          resolvedBy: 'human',
        });

      // Distinct step name from the machine-made "policy_decision_made" so the
      // audit trail UI can render human decisions differently.
      await logAuditEvent(caseId, 'human_decision_made', {
        decision: 'APPROVE',
        reasonCode: 'HUMAN_APPROVED_ESCALATION',
        actor: 'human',
      });
    } else {
      // reject: decision stays ESCALATE, but it's now a finalized, no-action case.
      await db
        .collection('policy_decisions')
        .doc(caseId)
        .set({
          ...existingDecision,
          resolvedAt,
          resolvedBy: 'human',
          resolutionAction: 'REJECTED',
        });

      await logAuditEvent(caseId, 'human_decision_made', {
        decision: 'REJECTED',
        reasonCode: 'HUMAN_REJECTED',
        actor: 'human',
      });
      // Same terminal marker the webhook uses for VETO / DO_NOT_ACT / ESCALATE.
      await logAuditEvent(caseId, 'case_finalized_no_action', {
        decision: 'REJECTED',
        reasonCode: 'HUMAN_REJECTED',
      });
    }

    const detail = await assembleCaseDetail(caseId);
    res.status(200).json({ status: 'ok', ...detail });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.post('/cases/:caseId/send-email', async (req, res) => {
  try {
    const { caseId } = req.params;

    const [caseDoc, proposalDoc, recoveryAttemptsSnap] = await Promise.all([
      db.collection('revenue_cases').doc(caseId).get(),
      db.collection('ai_proposals').doc(caseId).get(),
      db.collection('recovery_attempts').where('caseId', '==', caseId).get(),
    ]);

    if (!caseDoc.exists) {
      return res.status(404).json({ status: 'error', message: 'Case not found' });
    }
    if (!proposalDoc.exists) {
      return res.status(400).json({ status: 'error', message: 'No AI proposal exists for this case' });
    }

    // Most recently created recovery attempt is the live link for this case.
    const [latestAttempt] = recoveryAttemptsSnap.docs
      .map((doc) => doc.data())
      .sort((a, b) => (toIso(b.createdAt) || '').localeCompare(toIso(a.createdAt) || ''));

    const result = await sendRecoveryEmail(caseDoc.data(), proposalDoc.data(), latestAttempt?.shortUrl || null);
    res.status(200).json({ status: 'ok', ...result });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/payment-links', async (req, res) => {
  try {
    const snap = await db.collection('recovery_attempts').orderBy('createdAt', 'desc').get();

    const paymentLinks = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data();
        const caseDoc = await db.collection('revenue_cases').doc(data.caseId).get();
        const caseData = caseDoc.exists ? caseDoc.data() : null;

        return {
          paymentLinkId: doc.id,
          caseId: data.caseId,
          shortUrl: data.shortUrl,
          status: data.status,
          amount: caseData ? caseData.amount : null,
          currency: caseData ? caseData.currency : null,
          createdAt: toIso(data.createdAt),
          expiresAt: toIso(data.expiresAt),
          paidAt: toIso(data.paidAt),
        };
      }),
    );

    res.status(200).json({ status: 'ok', paymentLinks });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/audit-trail', async (req, res) => {
  try {
    // A flat limit is sufficient for this demo; pagination would be needed at
    // real scale.
    const snap = await db.collection('audit_trail').orderBy('timestamp', 'desc').limit(200).get();

    const events = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        eventId: doc.id,
        caseId: data.caseId,
        step: data.step,
        details: data.details,
        timestamp: toIso(data.timestamp),
      };
    });

    res.status(200).json({ status: 'ok', events });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
