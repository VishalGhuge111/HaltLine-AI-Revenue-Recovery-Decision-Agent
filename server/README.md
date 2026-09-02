# Halt Line - server

Express service: Razorpay webhook ingestion, failure classification, AI proposal
generation, and the deterministic policy engine.

## Running tests

Unit tests run with [Vitest](https://vitest.dev/).

```bash
cd server && npm test
```

Current coverage: `src/policy/evaluateProposal.js` (the policy engine) - a pure,
deterministic function, tested against a fake Firestore client injected via
`evaluateProposal(revenueCase, aiProposal, { db, logAuditEvent })`. Tests assert
the exact `decision` + `reasonCode` and the shape of `rulesApplied` (including
the short-circuit behavior where a hard-stop records only rule 1).
