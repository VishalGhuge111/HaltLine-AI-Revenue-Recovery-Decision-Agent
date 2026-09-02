const { z } = require('zod');
const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod');
const { FieldValue } = require('firebase-admin/firestore');
const anthropic = require('../config/anthropic');
const db = require('../config/firebase');
const { logAuditEvent } = require('../services/auditLog');

const MODEL = 'claude-opus-5';

// Hard ceiling on the Anthropic call. LLM calls in this codebase have taken up
// to ~10s in real testing, so 15s gives headroom without letting a network
// stall or an API outage hang the recovery pipeline (and the case) forever.
const AI_PROPOSAL_TIMEOUT_MS = 15000;

// Promise.race the API call against a timer. The underlying fetch is not
// aborted, but the pipeline stops waiting on it and the case gets a fail-safe
// policy decision instead of sitting Pending indefinitely.
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`AI proposal timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const ProposalSchema = z.object({
  classification: z.enum(['RETRIABLE', 'NON_RETRIABLE', 'UNCERTAIN']),
  confidence: z.number().min(0).max(1),
  proposed_action: z.enum(['SEND_RECOVERY_LINK', 'NO_ACTION_RECOMMENDED', 'ESCALATE_TO_HUMAN']),
  reasoning: z.string(),
  customer_message: z.string(),
});

const SYSTEM_PROMPT = `You are the AI proposal generator for the Halt Line payment recovery system.

You are a proposal-only system. You have no authority to execute payments or actions. A separate policy system will decide whether to act on your proposal.

You will be given a payment failure case that has already been deterministically classified upstream (RETRIABLE, NON_RETRIABLE, or UNCERTAIN). Echo that classification back exactly as given - you must not re-classify the case, that is not your job. Your job is to propose one recovery action, with a confidence score and a brief internal reasoning, plus a draft customer-facing message.

Guidance for proposed_action (a hint, not a hard rule - use judgment on the actual case):
- RETRIABLE cases generally warrant SEND_RECOVERY_LINK.
- NON_RETRIABLE cases generally warrant NO_ACTION_RECOMMENDED or ESCALATE_TO_HUMAN, depending on severity (e.g. suspected fraud or another high-risk decline should escalate rather than close out silently).
- UNCERTAIN cases generally warrant ESCALATE_TO_HUMAN.

Hard wording constraints for customer_message (keep reasoning clean of these too):
- When describing what the customer can do, use the concept of "recover the outstanding revenue" - never use the phrases "settle the invoice" or "reactivate the subscription".
- Never claim or imply NPCI or RBI compliance, anywhere in your output. If you need compliance-adjacent language at all, say "merchant-configured policy" instead.
- Never describe a synthetic or test amount as "real revenue recovered".

Keep customer_message short and professional - it is only a draft that a human reviews before anything is sent, never sent automatically. Keep reasoning to 1-3 sentences; it is for internal audit review only and is never shown to the customer.`;

// Defense in depth: schema enforcement guarantees structure, not wording. These
// are the exact phrases the project spec bans from customer_message/reasoning,
// plus "real revenue recovered" to cover the spec's third wording rule (never
// call a synthetic/test amount real revenue recovered).
const BANNED_PHRASES = [
  'settle the invoice',
  'reactivate the subscription',
  'RBI',
  'NPCI',
  'compliant',
  'compliance',
  'real revenue recovered',
];

function findBannedPhrase(proposal) {
  const fields = { customer_message: proposal.customer_message, reasoning: proposal.reasoning };
  for (const [field, text] of Object.entries(fields)) {
    const lower = text.toLowerCase();
    for (const phrase of BANNED_PHRASES) {
      if (lower.includes(phrase.toLowerCase())) {
        return { field, phrase };
      }
    }
  }
  return null;
}

function buildUserPrompt(revenueCase) {
  const { classification, errorSource, errorReason, amount, currency, customerContact, customerEmail } =
    revenueCase;

  // amount is stored in paise (Razorpay's convention) - convert to a decimal
  // display amount here so the AI's drafted customer_message quotes the real
  // amount (e.g. "1.00 INR") rather than the raw paise integer (e.g. "100 INR").
  const displayAmount = `${((amount || 0) / 100).toFixed(2)} ${currency}`;

  return `Payment failure case:
- classification (already determined upstream, do not change): ${classification}
- errorSource: ${errorSource}
- errorReason: ${errorReason}
- amount: ${displayAmount}
- customerContact: ${customerContact}
- customerEmail: ${customerEmail}

Propose one recovery action for this case.`;
}

async function proposeRecoveryAction(revenueCase) {
  const { caseId } = revenueCase;

  let response;
  try {
    response = await withTimeout(
      anthropic.messages.parse({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserPrompt(revenueCase) }],
        output_config: { format: zodOutputFormat(ProposalSchema) },
      }),
      AI_PROPOSAL_TIMEOUT_MS,
    );
  } catch (error) {
    await logAuditEvent(caseId, 'ai_proposal_failed', {
      error: error.message,
      name: error.name,
    });
    throw error;
  }

  if (!response.parsed_output) {
    const error = new Error(
      `Anthropic response could not be parsed into the proposal schema (stop_reason: ${response.stop_reason})`,
    );
    await logAuditEvent(caseId, 'ai_proposal_failed', {
      error: error.message,
      stopReason: response.stop_reason,
    });
    throw error;
  }

  const proposal = response.parsed_output;

  // Schema enforcement guarantees customer_message is a string, not that it's
  // non-empty - z.string() accepts "". A blank draft is a genuine generation
  // failure (seen in practice on a low-confidence case) and must surface as
  // one rather than silently sending an empty message to a customer.
  if (!proposal.customer_message || proposal.customer_message.trim().length === 0) {
    await logAuditEvent(caseId, 'ai_proposal_empty_message', {
      classification: proposal.classification,
      confidence: proposal.confidence,
    });
    throw new Error('AI proposal returned an empty customer_message');
  }

  const violation = findBannedPhrase(proposal);
  if (violation) {
    await logAuditEvent(caseId, 'ai_proposal_wording_violation', {
      phrase: violation.phrase,
      field: violation.field,
    });
    throw new Error(`AI proposal contains banned phrase "${violation.phrase}" in ${violation.field}`);
  }

  await logAuditEvent(caseId, 'ai_proposal_generated', {
    classification: proposal.classification,
    confidence: proposal.confidence,
    proposed_action: proposal.proposed_action,
  });

  await db
    .collection('ai_proposals')
    .doc(caseId)
    .set({
      caseId,
      ...proposal,
      createdAt: FieldValue.serverTimestamp(),
    });

  return proposal;
}

module.exports = { proposeRecoveryAction };
