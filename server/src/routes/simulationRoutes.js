const express = require('express');
const db = require('../config/firebase');
const { generateSyntheticBatch } = require('../simulation/generateSyntheticBatch');

const router = express.Router();

// SYNTHETIC DATA ONLY. This route group reads/writes exclusively the
// synthetic_simulations collection - it never touches revenue_cases,
// ai_proposals, or policy_decisions, and nothing here should ever be merged
// with those collections' numbers.

router.post('/simulations/run', async (req, res) => {
  try {
    const n = Number.isInteger(req.body?.n) ? req.body.n : undefined;
    const result = generateSyntheticBatch(n);

    await db.collection('synthetic_simulations').doc(result.batchId).set(result);

    res.status(200).json({ status: 'ok', simulation: result });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/simulations', async (req, res) => {
  try {
    const snap = await db.collection('synthetic_simulations').orderBy('generatedAt', 'desc').get();

    const simulations = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        batchId: data.batchId,
        n: data.n,
        generatedAt: data.generatedAt,
        assumptions: data.assumptions,
        summary: data.summary,
      };
    });

    res.status(200).json({ status: 'ok', simulations });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/simulations/:batchId', async (req, res) => {
  try {
    const doc = await db.collection('synthetic_simulations').doc(req.params.batchId).get();
    if (!doc.exists) {
      return res.status(404).json({ status: 'error', message: 'Simulation not found' });
    }

    res.status(200).json({ status: 'ok', simulation: doc.data() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
