const Anthropic = require('@anthropic-ai/sdk');

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set - required to initialize the Anthropic client');
}

// maxRetries: 0 overrides the SDK default of 2. We want exactly one attempt
// per case: if the Anthropic call fails (429, 5xx, connection error, timeout),
// proposeRecoveryAction should fail fast into the deterministic ESCALATE
// fail-safe path rather than have the SDK silently retry with exponential
// backoff (0.5s -> 8s), which would both delay the outcome and eat into the
// 15s timeout budget in proposeRecoveryAction.js.
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 0,
});

module.exports = anthropic;
