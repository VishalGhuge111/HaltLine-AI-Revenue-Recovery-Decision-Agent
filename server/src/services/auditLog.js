const { FieldValue } = require('firebase-admin/firestore');
const db = require('../config/firebase');

async function logAuditEvent(caseId, step, details) {
  await db.collection('audit_trail').add({
    caseId,
    step,
    details,
    timestamp: FieldValue.serverTimestamp(),
  });
}

module.exports = { logAuditEvent };
