const express = require('express');
const db = require('../config/firebase');
const { sendRecoveryEmail } = require('../services/sendRecoveryEmail');

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

router.get('/cases/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;

    const caseDoc = await db.collection('revenue_cases').doc(caseId).get();
    if (!caseDoc.exists) {
      return res.status(404).json({ status: 'error', message: 'Case not found' });
    }

    const [proposalDoc, decisionDoc, recoveryAttemptsSnap, auditSnap] = await Promise.all([
      db.collection('ai_proposals').doc(caseId).get(),
      db.collection('policy_decisions').doc(caseId).get(),
      db.collection('recovery_attempts').where('caseId', '==', caseId).get(),
      db.collection('audit_trail').where('caseId', '==', caseId).get(),
    ]);

    const caseData = caseDoc.data();

    res.status(200).json({
      status: 'ok',
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
    });
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
