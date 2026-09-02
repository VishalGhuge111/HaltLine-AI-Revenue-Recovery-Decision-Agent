import { describe, it, expect, vi } from 'vitest';
import { evaluateProposal } from './evaluateProposal.js';

// -----------------------------------------------------------------------------
// Test doubles
//
// evaluateProposal reads recovery_attempts / revenue_cases from Firestore for
// rules 2-4 and writes the final decision to policy_decisions. Rather than mock
// the firebase-admin module, we pass a fake `db` (and a spy `logAuditEvent`)
// via the injectable third argument. The fake implements just the query surface
// the engine actually uses: collection().where().where().get() returning
// { docs, size }, and collection().doc().set().
//
// `where(field, op, value)` is honoured for '==' and 'in' so tests that rely on
// a query filter (e.g. status == 'active') behave like the real thing.
// -----------------------------------------------------------------------------

function createFakeDb(collections = {}) {
  const writes = [];

  const wrapDocs = (rawDocs) => rawDocs.map((raw) => ({ id: raw.id, data: () => raw }));

  const makeQuery = (docs) => ({
    where(field, op, value) {
      const filtered = docs.filter((doc) => {
        const fieldValue = doc.data()[field];
        if (op === 'in') return Array.isArray(value) && value.includes(fieldValue);
        return fieldValue === value; // '=='
      });
      return makeQuery(filtered);
    },
    async get() {
      return { docs, size: docs.length };
    },
  });

  const db = {
    collection(name) {
      const docs = wrapDocs(collections[name] || []);
      return {
        ...makeQuery(docs),
        doc(id) {
          return {
            async set(data) {
              writes.push({ collection: name, id, data });
            },
          };
        },
      };
    },
  };

  return { db, writes };
}

const CONTACT = '+919000000001';
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function makeCase(overrides = {}) {
  return {
    caseId: 'case_under_test',
    razorpayOrderId: 'order_under_test',
    customerContact: CONTACT,
    classification: 'RETRIABLE',
    errorReason: 'payment_timed_out',
    createdAt: new Date(), // recent - inside the 7-day recovery window
    ...overrides,
  };
}

const SEND_LINK = { proposed_action: 'SEND_RECOVERY_LINK' };
const ESCALATE = { proposed_action: 'ESCALATE_TO_HUMAN' };
const NO_ACTION = { proposed_action: 'NO_ACTION_RECOMMENDED' };

// Runs the engine with a fake db + audit spy and returns everything a test
// might want to assert on.
async function run(revenueCase, aiProposal, collections) {
  const { db, writes } = createFakeDb(collections);
  const logAuditEvent = vi.fn().mockResolvedValue(undefined);
  const result = await evaluateProposal(revenueCase, aiProposal, { db, logAuditEvent });
  return { result, writes, logAuditEvent };
}

// Convenience: the name of the last rule the engine evaluated (the deciding one,
// since evaluation short-circuits at the first triggered rule).
const lastRule = (result) => result.rulesApplied[result.rulesApplied.length - 1];

describe('evaluateProposal - policy engine', () => {
  it('(a) VETO / CONTACT_FREQUENCY_CAP_EXCEEDED when the same contact was attempted within 24h', async () => {
    const revenueCase = makeCase();
    const { result } = await run(revenueCase, SEND_LINK, {
      // non-empty so rule 2 has caseIds to count against (and finds only 1 attempt)
      revenue_cases: [{ id: 'case_under_test', razorpayOrderId: 'order_under_test', customerContact: CONTACT }],
      recovery_attempts: [
        {
          id: 'ra_recent',
          caseId: 'case_under_test',
          customerContact: CONTACT,
          razorpayOrderId: 'order_under_test',
          status: 'expired', // link already expired -> rule 3 must NOT fire
          expiresAt: new Date(Date.now() - 1 * MS_PER_HOUR),
          createdAt: new Date(Date.now() - 2 * MS_PER_HOUR), // contacted 2h ago -> within cap
        },
      ],
    });

    expect(result.decision).toBe('VETO');
    expect(result.reasonCode).toBe('CONTACT_FREQUENCY_CAP_EXCEEDED');
    expect(result.rulesApplied).toHaveLength(4);
    expect(lastRule(result)).toEqual({ rule: 4, name: 'CONTACT_FREQUENCY_CAP', triggered: true });
    expect(result.rulesApplied.map((r) => r.triggered)).toEqual([false, false, false, true]);
  });

  it('(b) VETO / MAX_ATTEMPTS_EXCEEDED when 3+ prior recovery_attempts exist for the order', async () => {
    const revenueCase = makeCase({ razorpayOrderId: 'order_maxed' });
    const { result } = await run(revenueCase, SEND_LINK, {
      revenue_cases: [{ id: 'case_maxed', razorpayOrderId: 'order_maxed' }],
      recovery_attempts: [
        { id: 'ra_1', caseId: 'case_maxed' },
        { id: 'ra_2', caseId: 'case_maxed' },
        { id: 'ra_3', caseId: 'case_maxed' },
      ],
    });

    expect(result.decision).toBe('VETO');
    expect(result.reasonCode).toBe('MAX_ATTEMPTS_EXCEEDED');
    expect(result.rulesApplied).toHaveLength(2);
    expect(lastRule(result)).toEqual({ rule: 2, name: 'MAX_ATTEMPTS', triggered: true });
  });

  it('(c) VETO / DEFAULT_SAFE_VETO when the AI proposes SEND_RECOVERY_LINK on a NON_RETRIABLE case', async () => {
    const revenueCase = makeCase({
      classification: 'NON_RETRIABLE',
      errorReason: 'card_expired', // NON_RETRIABLE but not a hard-stop reason
      razorpayOrderId: 'order_mismatch',
    });
    const { result } = await run(revenueCase, SEND_LINK, {
      revenue_cases: [],
      recovery_attempts: [],
    });

    expect(result.decision).toBe('VETO');
    expect(result.reasonCode).toBe('DEFAULT_SAFE_VETO');
    expect(result.rulesApplied).toHaveLength(6);
    expect(lastRule(result)).toEqual({ rule: 6, name: 'FINAL_CLASSIFICATION', triggered: true });
    // rules 1-5 all evaluated but none triggered; rule 6 decided it
    expect(result.rulesApplied.map((r) => r.triggered)).toEqual([false, false, false, false, false, true]);
  });

  it('(d1) DO_NOT_ACT / HARD_STOP_FRAUD_FLAG on payment_risk_check_failed, short-circuiting after rule 1', async () => {
    const revenueCase = makeCase({ errorReason: 'payment_risk_check_failed' });
    const { result, writes, logAuditEvent } = await run(revenueCase, SEND_LINK, {});

    expect(result.decision).toBe('DO_NOT_ACT');
    expect(result.reasonCode).toBe('HARD_STOP_FRAUD_FLAG');
    // hard stop short-circuits immediately - only rule 1 is ever recorded
    expect(result.rulesApplied).toHaveLength(1);
    expect(result.rulesApplied[0]).toEqual({ rule: 1, name: 'HARD_STOP_REASONS', triggered: true });

    // still persists the decision + writes the audit event
    expect(writes).toContainEqual({ collection: 'policy_decisions', id: 'case_under_test', data: result });
    expect(logAuditEvent).toHaveBeenCalledWith('case_under_test', 'policy_decision_made', {
      decision: 'DO_NOT_ACT',
      reasonCode: 'HARD_STOP_FRAUD_FLAG',
    });
  });

  it('(d2) DO_NOT_ACT / OUTSIDE_RECOVERY_WINDOW when the failure is older than 7 days', async () => {
    const revenueCase = makeCase({ createdAt: new Date(Date.now() - 8 * MS_PER_DAY) });
    const { result } = await run(revenueCase, SEND_LINK, {
      revenue_cases: [],
      recovery_attempts: [],
    });

    expect(result.decision).toBe('DO_NOT_ACT');
    expect(result.reasonCode).toBe('OUTSIDE_RECOVERY_WINDOW');
    expect(result.rulesApplied).toHaveLength(5);
    expect(lastRule(result)).toEqual({ rule: 5, name: 'RECOVERY_WINDOW', triggered: true });
  });

  it('(d3) APPROVE / RETRIABLE_APPROVED on the clean path (RETRIABLE + SEND_RECOVERY_LINK, no rule triggered)', async () => {
    const revenueCase = makeCase();
    const { result, writes, logAuditEvent } = await run(revenueCase, SEND_LINK, {
      revenue_cases: [],
      recovery_attempts: [],
    });

    expect(result.decision).toBe('APPROVE');
    expect(result.reasonCode).toBe('RETRIABLE_APPROVED');
    expect(result.rulesApplied).toHaveLength(6);
    expect(result.rulesApplied.map((r) => r.triggered)).toEqual([false, false, false, false, false, true]);
    expect(lastRule(result)).toEqual({ rule: 6, name: 'FINAL_CLASSIFICATION', triggered: true });

    expect(writes).toContainEqual({ collection: 'policy_decisions', id: 'case_under_test', data: result });
    expect(logAuditEvent).toHaveBeenCalledWith('case_under_test', 'policy_decision_made', {
      decision: 'APPROVE',
      reasonCode: 'RETRIABLE_APPROVED',
    });
  });

  it('(d4) ESCALATE / UNCERTAIN_OR_AI_ESCALATED when the case is classified UNCERTAIN', async () => {
    const revenueCase = makeCase({ classification: 'UNCERTAIN', errorReason: 'payment_failed' });
    // AI did NOT propose escalation - the UNCERTAIN classification alone drives it
    const { result } = await run(revenueCase, NO_ACTION, {
      revenue_cases: [],
      recovery_attempts: [],
    });

    expect(result.decision).toBe('ESCALATE');
    expect(result.reasonCode).toBe('UNCERTAIN_OR_AI_ESCALATED');
    expect(result.rulesApplied).toHaveLength(6);
    expect(lastRule(result)).toEqual({ rule: 6, name: 'FINAL_CLASSIFICATION', triggered: true });
  });

  it('(d4b) ESCALATE / UNCERTAIN_OR_AI_ESCALATED when the AI itself proposes ESCALATE_TO_HUMAN', async () => {
    const revenueCase = makeCase(); // RETRIABLE classification
    const { result } = await run(revenueCase, ESCALATE, {
      revenue_cases: [],
      recovery_attempts: [],
    });

    expect(result.decision).toBe('ESCALATE');
    expect(result.reasonCode).toBe('UNCERTAIN_OR_AI_ESCALATED');
    expect(result.rulesApplied).toHaveLength(6);
  });

  it('every decision carries an ISO evaluatedAt timestamp', async () => {
    const { result } = await run(makeCase(), SEND_LINK, { revenue_cases: [], recovery_attempts: [] });
    expect(result.evaluatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
