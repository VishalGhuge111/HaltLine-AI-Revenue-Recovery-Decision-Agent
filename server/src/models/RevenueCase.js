const { FieldValue } = require('firebase-admin/firestore');
const { classifyFailure } = require('../services/classifyFailure');

function createRevenueCase(rawPayload) {
  const payment = rawPayload.payload.payment.entity;
  const errorSource = payment.error_source || null;
  const errorReason = payment.error_reason || null;

  return {
    caseId: payment.id,
    razorpayPaymentId: payment.id,
    razorpayOrderId: payment.order_id || null,
    amount: payment.amount,
    currency: payment.currency,
    customerContact: payment.contact || null,
    customerEmail: payment.email || null,
    errorCode: payment.error_code || null,
    errorDescription: payment.error_description || null,
    errorSource,
    errorReason,
    errorStep: payment.error_step || null,
    classification: classifyFailure(errorSource, errorReason),
    createdAt: FieldValue.serverTimestamp(),
    rawPayload,
  };
}

module.exports = { createRevenueCase };
