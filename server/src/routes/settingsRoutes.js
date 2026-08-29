const express = require('express');
const { getSettings, updateSettings } = require('../config/settings');

const router = express.Router();

router.get('/settings', async (req, res) => {
  try {
    const settings = await getSettings();
    res.status(200).json({ status: 'ok', settings });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const { demoEmailOverride, autoSendEmail } = req.body || {};
    const settings = await updateSettings({
      demoEmailOverride: demoEmailOverride || null,
      autoSendEmail: Boolean(autoSendEmail),
    });
    res.status(200).json({ status: 'ok', settings });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
