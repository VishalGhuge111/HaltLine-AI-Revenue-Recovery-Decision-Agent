const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', '..', 'firebase-service-account.json'));

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);

module.exports = db;
