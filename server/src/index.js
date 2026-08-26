const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { FieldValue } = require('firebase-admin/firestore');
const db = require('./config/firebase');
const razorpay = require('./config/razorpay');
const razorpayWebhookRouter = require('./webhooks/razorpayWebhook');

const app = express();
const PORT = process.env.PORT || 4000;

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.use(cors());

// Must be registered before express.json() below: Razorpay's HMAC signature
// is computed over the exact raw request bytes, which express.json() would
// otherwise consume and reparse. Once express.raw() has fully read the
// request stream, body-parser's internal onFinished(req) check is true, so
// express.json() no-ops for this path - every other route is unaffected.
app.use('/webhooks/razorpay', express.raw({ type: '*/*' }));

app.use(express.json());

app.use('/webhooks/razorpay', razorpayWebhookRouter);

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

app.get('/health/razorpay', async (req, res) => {
  try {
    const paymentLink = await razorpay.paymentLink.create({
      amount: 100,
      currency: 'INR',
      description: 'Halt Line integration test - safe to ignore',
      customer: {
        name: 'Test Customer',
        email: 'test@example.com',
        contact: '9123456780',
      },
      notify: {
        sms: false,
        email: false,
      },
    });

    res.status(200).json({
      status: 'ok',
      paymentLinkId: paymentLink.id,
      shortUrl: paymentLink.short_url,
    });
  } catch (error) {
    const message = error.error?.description || error.message || 'Unknown Razorpay error';
    res.status(500).json({ status: 'error', message });
  }
});

app.listen(PORT, () => {
  console.log(`Halt Line server running on port ${PORT}`);
});