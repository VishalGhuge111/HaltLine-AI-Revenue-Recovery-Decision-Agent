// SYNTHETIC DATA ONLY. This module never reads or writes revenue_cases,
// ai_proposals, or policy_decisions - it is fully self-contained and produces
// a "Simulated Incremental Recovery" number from declared assumptions, not
// from any real customer/payment data. Output must stay isolated in its own
// synthetic_simulations collection and be labeled as such everywhere it's
// shown.
const { randomUUID } = require('crypto');

const DEFAULT_N = 300;

// Declared assumption, not derived from real data: how synthetic cases are
// split across classifications. Must sum to 1.
const DISTRIBUTION_BY_CLASSIFICATION = {
  RETRIABLE: 0.45,
  NON_RETRIABLE: 0.35,
  UNCERTAIN: 0.2,
};

// Declared assumption, not derived from real data: baseline/organic recovery
// rate with no recovery action taken, by classification.
const CONTROL_RECOVERY_RATES = {
  RETRIABLE: 0.08,
  NON_RETRIABLE: 0.02,
  UNCERTAIN: 0.04,
};

// Declared assumption, not derived from real data: recovery rate when a
// recovery link IS sent, by classification. NON_RETRIABLE barely moves
// (0.02 -> 0.04) intentionally - this models that intervention genuinely
// shouldn't rescue non-retriable failures, rather than the simulation being
// uniformly optimistic about every classification.
const TREATMENT_RECOVERY_RATES = {
  RETRIABLE: 0.35,
  NON_RETRIABLE: 0.04,
  UNCERTAIN: 0.15,
};

const MIN_AMOUNT_INR = 50;
const MAX_AMOUNT_INR = 5000;

// A fixed random seed would make simulation runs reproducible, but that
// isn't required for this demo, so this uses plain Math.random().
function pickClassification() {
  const roll = Math.random();
  let cumulative = 0;
  for (const [classification, share] of Object.entries(DISTRIBUTION_BY_CLASSIFICATION)) {
    cumulative += share;
    if (roll < cumulative) return classification;
  }
  return 'UNCERTAIN';
}

function randomAmountPaise() {
  const inr = MIN_AMOUNT_INR + Math.random() * (MAX_AMOUNT_INR - MIN_AMOUNT_INR);
  return Math.round(inr * 100);
}

function generateSyntheticBatch(n = DEFAULT_N) {
  const batchId = `sim_${randomUUID()}`;
  const generatedAt = new Date().toISOString();

  const cases = [];
  for (let i = 0; i < n; i += 1) {
    const classification = pickClassification();
    const group = Math.random() < 0.5 ? 'control' : 'treatment';
    const amount = randomAmountPaise();

    const recoveryRate =
      group === 'control'
        ? CONTROL_RECOVERY_RATES[classification]
        : TREATMENT_RECOVERY_RATES[classification];
    const recovered = Math.random() < recoveryRate;

    cases.push({
      syntheticCaseId: `syn_${randomUUID()}`,
      classification,
      group,
      amount,
      recovered,
    });
  }

  const controlCases = cases.filter((c) => c.group === 'control');
  const treatmentCases = cases.filter((c) => c.group === 'treatment');

  const controlRecovered = controlCases.filter((c) => c.recovered);
  const treatmentRecovered = treatmentCases.filter((c) => c.recovered);

  const controlGroupSize = controlCases.length;
  const treatmentGroupSize = treatmentCases.length;
  const controlRecoveredCount = controlRecovered.length;
  const treatmentRecoveredCount = treatmentRecovered.length;
  const controlRecoveredAmount = controlRecovered.reduce((sum, c) => sum + c.amount, 0);
  const treatmentRecoveredAmount = treatmentRecovered.reduce((sum, c) => sum + c.amount, 0);

  const controlRecoveryRateActual = controlGroupSize > 0 ? controlRecoveredCount / controlGroupSize : 0;
  const treatmentRecoveryRateActual =
    treatmentGroupSize > 0 ? treatmentRecoveredCount / treatmentGroupSize : 0;

  return {
    batchId,
    n,
    generatedAt,
    assumptions: {
      distributionByClassification: DISTRIBUTION_BY_CLASSIFICATION,
      controlRecoveryRates: CONTROL_RECOVERY_RATES,
      treatmentRecoveryRates: TREATMENT_RECOVERY_RATES,
    },
    cases,
    summary: {
      controlGroupSize,
      treatmentGroupSize,
      controlRecoveredCount,
      controlRecoveredAmount,
      treatmentRecoveredCount,
      treatmentRecoveredAmount,
      controlRecoveryRateActual,
      treatmentRecoveryRateActual,
      simulatedIncrementalRecoveryAmount: treatmentRecoveredAmount - controlRecoveredAmount,
      simulatedIncrementalRecoveryRate: treatmentRecoveryRateActual - controlRecoveryRateActual,
    },
  };
}

module.exports = {
  generateSyntheticBatch,
  DEFAULT_N,
  DISTRIBUTION_BY_CLASSIFICATION,
  CONTROL_RECOVERY_RATES,
  TREATMENT_RECOVERY_RATES,
};
