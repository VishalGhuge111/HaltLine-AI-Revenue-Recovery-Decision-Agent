# Halt Line - AI Revenue Recovery Decision Agent

**"AI proposes. Policy decides."**

Built for Razorpay AI Buildathon 2026 - Track 03: AI Revenue Recovery.

> Under active development. Full README, architecture doc, and demo video coming before submission.

## What this is
Halt Line listens to Razorpay `payment.failed` webhooks, classifies the failure,
has an AI agent *propose* a recovery action, and runs that proposal through a
deterministic policy engine that can independently **approve, veto, or escalate**
it. The AI never has financial execution authority - only the policy engine
can trigger a real action.

## Status
Setup in progress.