const express = require('express');
const crypto = require('crypto');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const db = require('../config/firebase');
const razorpay = require('../config/razorpay');
const { createRevenueCase } = require('../models/RevenueCase');
const { logAuditEvent } = require('../services/auditLog');
const { proposeRecoveryAction } = require('../ai/proposeRecoveryAction');
const { evaluateProposal } = require('../policy/evaluateProposal');

const router = express.Router();

const { RAZORPAY_WEBHOOK_SECRET } = process.env;

const RECOVERY_LINK_VALIDITY_SECONDS = 48 * 60 * 60;

// Razorpay webhook events have no top-level "id" (verified against real
// payload shape at https://razorpay.com/docs/webhooks/payloads/payments/).
// Fall back to the entity named in "contains", then to event+created_at.
function extractEventId(payload) {
  if (payload.id) {
    return payload.id;
  }

  const containedEntity = Array.isArray(payload.contains) ? payload.contains[0] : null;
  const entity =
    containedEntity && payload.payload[containedEntity] && payload.payload[containedEntity].entity;

  if (entity && entity.id) {
    return `${payload.event}:${entity.id}`;
  }

  return `${payload.event}:${payload.created_at}`;
}

// Atomic check-and-mark so a crash mid-processing can't cause the same
// event to be silently reprocessed on redelivery.
async function checkAndMarkProcessed(eventId, eventType) {
  const docRef = db.collection('processed_webhook_events').doc(eventId);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(docRef);
    if (doc.exists) {
      return true;
    }
    tx.set(docRef, {
      eventId,
      receivedAt: FieldValue.serverTimestamp(),
      eventType,
    });
    return false;
  });
}

// Creates the real Razorpay Payment Link for an APPROVE decision, writes the
// recovery_attempts tracking doc, and logs each step. Never throws - a
// downstream Razorpay failure here is logged as payment_link_creation_failed
// rather than crashing the webhook response.
async function executeApprovedRecovery(revenueCase) {
  const expireBy = Math.floor(Date.now() / 1000) + RECOVERY_LINK_VALIDITY_SECONDS;

  let paymentLink;
  try {
    paymentLink = await razorpay.paymentLink.create({
      amount: revenueCase.amount,
      currency: revenueCase.currency,
      description: `Recover the outstanding revenue for payment ${revenueCase.razorpayPaymentId}`,
      customer: {
        contact: revenueCase.customerContact,
        email: revenueCase.customerEmail,
      },
      notify: { sms: false, email: false },
      expire_by: expireBy,
    });
  } catch (error) {
    const message = error.error?.description || error.message || 'Unknown Razorpay error';
    await logAuditEvent(revenueCase.caseId, 'payment_link_creation_failed', { error: message });
    return;
  }

  await logAuditEvent(revenueCase.caseId, 'payment_link_created', {
    paymentLinkId: paymentLink.id,
    shortUrl: paymentLink.short_url,
  });

  await db
    .collection('recovery_attempts')
    .doc(paymentLink.id)
    .set({
      caseId: revenueCase.caseId,
      customerContact: revenueCase.customerContact,
      razorpayOrderId: revenueCase.razorpayOrderId || null,
      paymentLinkId: paymentLink.id,
      shortUrl: paymentLink.short_url,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(expireBy * 1000),
      status: 'active',
    });
}

// AI propose -> policy decide -> act (or don't). Always resolves - every
// failure branch is logged to audit_trail rather than thrown, since the
// webhook must still respond 200 to Razorpay regardless of how our own
// downstream pipeline fares.
async function runRecoveryPipeline(revenueCase) {
  let aiProposal;
  try {
    aiProposal = await proposeRecoveryAction(revenueCase);
  } catch (error) {
    // proposeRecoveryAction already logs ai_proposal_failed or
    // ai_proposal_wording_violation internally before throwing - stop here.
    return;
  }

  const decision = await evaluateProposal(revenueCase, aiProposal);
  // evaluateProposal already writes policy_decisions and logs
  // policy_decision_made internally.

  if (decision.decision === 'APPROVE') {
    await executeApprovedRecovery(revenueCase);
    return;
  }

  await logAuditEvent(revenueCase.caseId, 'case_finalized_no_action', {
    decision: decision.decision,
    reasonCode: decision.reasonCode,
  });
}

async function handlePaymentLinkPaid(payload, fallbackCaseId) {
  const paymentLinkEntity = payload.payload && payload.payload.payment_link && payload.payload.payment_link.entity;
  const paymentLinkId = paymentLinkEntity && paymentLinkEntity.id;

  if (!paymentLinkId) {
    await logAuditEvent(fallbackCaseId, 'payment_link_paid_no_matching_attempt', {
      reason: 'no payload.payment_link.entity.id in webhook payload',
    });
    return;
  }

  const docRef = db.collection('recovery_attempts').doc(paymentLinkId);
  const doc = await docRef.get();

  if (!doc.exists) {
    await logAuditEvent(fallbackCaseId, 'payment_link_paid_no_matching_attempt', { paymentLinkId });
    return;
  }

  await docRef.update({
    status: 'paid',
    paidAt: FieldValue.serverTimestamp(),
  });

  const { caseId } = doc.data();
  await logAuditEvent(caseId, 'recovery_link_paid', { paymentLinkId, caseId });
}

router.post('/', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.body;

  if (!Buffer.isBuffer(rawBody) || !signature) {
    return res.status(400).json({ status: 'error', message: 'Invalid webhook request' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const receivedBuffer = Buffer.from(signature, 'utf8');

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    return res.status(400).json({ status: 'error', message: 'Invalid signature' });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    return res.status(400).json({ status: 'error', message: 'Invalid JSON body' });
  }

  const eventId = extractEventId(payload);
  const eventType = payload.event;

  const paymentEntity =
    payload.payload && payload.payload.payment && payload.payload.payment.entity;
  const auditCaseId = (paymentEntity && paymentEntity.id) || eventId;

  const isDuplicate = await checkAndMarkProcessed(eventId, eventType);

  if (isDuplicate) {
    return res.status(200).json({ status: 'ok', duplicate: true });
  }

  await logAuditEvent(auditCaseId, 'signature_verified', { eventId, eventType });
  await logAuditEvent(auditCaseId, 'dedupe_check', { eventId, isDuplicate: false });

  if (eventType === 'payment_link.paid') {
    await handlePaymentLinkPaid(payload, auditCaseId);
    return res.status(200).json({ status: 'ok', processed: true });
  }

  if (eventType !== 'payment.failed') {
    await logAuditEvent(auditCaseId, 'event_received_not_processed', { eventType });
    return res.status(200).json({ status: 'ok', processed: false, reason: 'event type not handled yet' });
  }

  const revenueCase = createRevenueCase(payload);

  await logAuditEvent(auditCaseId, 'case_classified', {
    classification: revenueCase.classification,
    errorSource: revenueCase.errorSource,
    errorReason: revenueCase.errorReason,
  });

  await db.collection('revenue_cases').doc(revenueCase.caseId).set(revenueCase);

  await logAuditEvent(revenueCase.caseId, 'case_written', { caseId: revenueCase.caseId });

  await runRecoveryPipeline(revenueCase);

  return res.status(200).json({ status: 'ok', processed: true, caseId: revenueCase.caseId });
});

module.exports = router;
