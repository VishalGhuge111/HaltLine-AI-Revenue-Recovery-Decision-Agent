const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const db = require('../config/firebase');
const razorpay = require('../config/razorpay');
const { logAuditEvent } = require('./auditLog');
const { getSettings } = require('../config/settings');
const { sendRecoveryEmail } = require('./sendRecoveryEmail');

const RECOVERY_LINK_VALIDITY_SECONDS = 48 * 60 * 60;

// Creates the real Razorpay Payment Link for an APPROVE decision, writes the
// recovery_attempts tracking doc, sends the recovery email if auto-send is on,
// and logs each step. Never throws - a downstream Razorpay failure is logged as
// payment_link_creation_failed rather than crashing the caller.
//
// Shared by two callers so the "act on an APPROVE" logic exists exactly once:
//   1. the webhook pipeline, when the policy engine returns APPROVE automatically
//   2. the manual resolve-escalation endpoint, when a human approves an ESCALATE
//
// Returns { paymentLinkId, shortUrl } on success, or null if link creation failed.
async function executeApprovedRecovery(revenueCase, aiProposal) {
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
    return null;
  }

  await logAuditEvent(revenueCase.caseId, 'payment_link_created', {
    paymentLinkId: paymentLink.id,
    shortUrl: paymentLink.short_url,
  });

  const settings = await getSettings();
  if (settings.autoSendEmail) {
    try {
      await sendRecoveryEmail(revenueCase, aiProposal, paymentLink.short_url);
    } catch (error) {
      // sendRecoveryEmail already logs recovery_email_failed to audit_trail;
      // an email failure must never break the caller.
    }
  }

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

  return { paymentLinkId: paymentLink.id, shortUrl: paymentLink.short_url };
}

module.exports = { executeApprovedRecovery, RECOVERY_LINK_VALIDITY_SECONDS };
