const { FieldValue } = require('firebase-admin/firestore');
const db = require('./firebase');

const SETTINGS_DOC = db.collection('app_settings').doc('global');

const DEFAULT_SETTINGS = {
  demoEmailOverride: null,
  autoSendEmail: false,
};

async function getSettings() {
  const doc = await SETTINGS_DOC.get();
  if (!doc.exists) {
    return { ...DEFAULT_SETTINGS };
  }

  const data = doc.data();
  return {
    demoEmailOverride: data.demoEmailOverride || null,
    autoSendEmail: Boolean(data.autoSendEmail),
  };
}

async function updateSettings(partial) {
  await SETTINGS_DOC.set(
    {
      ...partial,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return getSettings();
}

module.exports = { getSettings, updateSettings };
