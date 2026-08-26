// Reason strings sourced from Razorpay's documented card error reasons:
// https://razorpay.com/docs/errors/payments/cards/
// Implemented 2026-08-26. Every string below appears on that page - none of
// these are guessed or extrapolated. Any errorReason not in one of the two
// sets below falls through to UNCERTAIN rather than assuming a classification.

const RETRIABLE_REASONS = new Set([
  'payment_timed_out', // Time Limit Exceeded - transient
  'gateway_technical_error', // Partner Bank Downtime - transient
  'bank_technical_error', // Bank Downtime - transient
  'payment_cancelled', // Customer Cancelled Transaction - can simply retry
  'insufficient_funds', // Low Balance - customer may have funds later
  'transaction_limit_exceeded', // Daily Limit Reached - resets daily, retriable on a different day/card
  'authentication_failed', // Customer OTP mistake - can retry cleanly
]);

const NON_RETRIABLE_REASONS = new Set([
  'card_not_enrolled', // Card Not Activated for online transactions
  'card_disabled_for_online_payments', // Online Payments Disabled
  'debit_instrument_blocked', // Card Blocked
  'card_expired', // Expired Card
  // Retriable in theory (a customer could simply re-enter the CVV correctly),
  // but per this project's business policy we treat it as NON_RETRIABLE: a
  // wrong CVV signals a fundamentally wrong card entry, not a timing/transient
  // issue, so an automated retry of "the same payment" isn't the right recovery.
  'incorrect_cvv',
  // Bank flagged as fraud. Compliance-sensitive - never auto-retry a
  // risk/fraud decline.
  'payment_risk_check_failed',
  'debit_instrument_inactive', // Card Inactive
  // Razorpay's own docs describe this as typically a permanent per-transaction
  // decline; the real underlying reason is usually undisclosed by the bank.
  // We default to NON_RETRIABLE rather than assume it's transient.
  'card_declined',
  // This is a business/merchant-configuration issue (the merchant account
  // doesn't accept international cards), not a real payment failure the
  // customer can fix by simply retrying the same way - it needs a different
  // payment method. errorSource for this reason is expected to be "business"
  // (see classifyFailure below), which corroborates that this isn't a bank
  // decline.
  'international_transaction_not_allowed',
]);

// 'payment_failed' is NOT in either set above - it's a generic reason with no
// further detail, so on its own it's too vague to classify with confidence
// and falls through to UNCERTAIN like any other undocumented or ambiguous
// reason. The one exception is errorSource "gateway" specifically, handled
// below: an unspecified gateway failure with no more specific decline reason
// is treated as a soft decline eligible for retry, consistent with standard
// dunning/recovery practice - a payment gateway returning a generic failure
// without flagging fraud, an expired card, or another structural issue gives
// no reason to believe a retry won't succeed. Specific hard-decline reasons
// (card_expired, payment_risk_check_failed, international_transaction_not_allowed,
// etc.) remain correctly classified as NON_RETRIABLE regardless of this change -
// this only affects the source+reason combination of gateway + payment_failed.

// errorSource is accepted as a secondary, corroborating signal only (e.g.
// "business" alongside international_transaction_not_allowed confirms a
// merchant-config issue rather than a bank decline). It never overrides or
// extends the reason-based outcome above, and is never used to guess a
// classification for a reason outside the documented sets - except the single
// gateway+payment_failed case documented above.
function classifyFailure(errorSource, errorReason) {
  const source = (errorSource || '').toLowerCase();
  const reason = (errorReason || '').toLowerCase();

  if (reason === 'payment_failed' && source === 'gateway') {
    return 'RETRIABLE';
  }

  if (RETRIABLE_REASONS.has(reason)) {
    return 'RETRIABLE';
  }

  if (NON_RETRIABLE_REASONS.has(reason)) {
    return 'NON_RETRIABLE';
  }

  return 'UNCERTAIN';
}

module.exports = { classifyFailure };
