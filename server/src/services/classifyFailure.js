// Reasons sourced from Razorpay's documented card error reasons:
// https://razorpay.com/docs/errors/payments/cards/
const RETRIABLE_REASONS = new Set([
  'insufficient_funds', // Low Balance
  'payment_timed_out', // Time Limit Exceeded
  'gateway_technical_error', // Partner Bank Downtime
  'bank_technical_error', // Bank Downtime
  'payment_cancelled', // Customer Cancelled Transaction
  'incorrect_cvv', // Invalid CVV entered
]);

const NON_RETRIABLE_REASONS = new Set([
  'card_expired', // Expired Card
  'debit_instrument_blocked', // Card Blocked
  'debit_instrument_inactive', // Card Inactive
  'card_not_enrolled', // Card Not Activated for online transactions
  'card_disabled_for_online_payments', // Online Payments Disabled
  'payment_risk_check_failed', // Fraud Suspected
  'transaction_limit_exceeded', // Daily Limit Reached
]);

// errorSource is accepted for future rule expansion (e.g. distinguishing
// generic "bank declined" by source) but isn't used yet - anything not in
// the reason sets below falls through to UNCERTAIN rather than guessing.
function classifyFailure(errorSource, errorReason) {
  const reason = (errorReason || '').toLowerCase();

  if (RETRIABLE_REASONS.has(reason)) {
    return 'RETRIABLE';
  }

  if (NON_RETRIABLE_REASONS.has(reason)) {
    return 'NON_RETRIABLE';
  }

  return 'UNCERTAIN';
}

module.exports = { classifyFailure };
