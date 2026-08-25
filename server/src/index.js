const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { FieldValue } = require('firebase-admin/firestore');
const db = require('./config/firebase');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'halt-line-server' });
});

app.get('/health/firestore', async (req, res) => {
  try {
    const docRef = db.collection('_healthchecks').doc();
    await docRef.set({
      timestamp: FieldValue.serverTimestamp(),
      status: 'ok',
    });

    const snapshot = await docRef.get();

    res.status(200).json({
      status: 'ok',
      firestoreWrite: true,
      firestoreRead: snapshot.exists,
      docId: docRef.id,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Halt Line server running on port ${PORT}`);
});