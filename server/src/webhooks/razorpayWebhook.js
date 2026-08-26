const express = require('express');
const crypto = require('crypto');
const { FieldValue } = require('firebase-admin/firestore');
const db = require('../config/firebase');
const { createRevenueCase } = require('../models/RevenueCase');
const { logAuditEvent } = require('../services/auditLog');

const router = express.Router();

const { RAZORPAY_WEBHOOK_SECRET } = process.env;

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

  if (eventType !== 'payment.failed') {
    await logAuditEvent(auditCaseId, 'event_received_not_processed', { eventType });
    return res.status(200).json({ status: 'ok', processed: false, reason: 'event type not handled yet' });
  }

  const revenueCase = createRevenueCase(payload);

  await logAuditEvent(revenueCase.caseId, 'case_classified', {
    classification: revenueCase.classification,
    errorSource: revenueCase.errorSource,
    errorReason: revenueCase.errorReason,
  });

  await db.collection('revenue_cases').doc(revenueCase.caseId).set(revenueCase);

  await logAuditEvent(revenueCase.caseId, 'case_written', { caseId: revenueCase.caseId });

  return res.status(200).json({ status: 'ok', processed: true, caseId: revenueCase.caseId });
});

module.exports = router;
