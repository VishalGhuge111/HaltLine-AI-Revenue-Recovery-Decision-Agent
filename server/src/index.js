const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./config/firebase');
const razorpay = require('./config/razorpay');
const razorpayWebhookRouter = require('./webhooks/razorpayWebhook');
const dashboardRouter = require('./routes/dashboardRoutes');
const simulationRouter = require('./routes/simulationRoutes');
const settingsRouter = require('./routes/settingsRoutes');
// TEST HARNESS ONLY - see src/testHarness/testHarnessRouter.js. Not part of
// the product's locked core loop.
const testHarnessRouter = require('./testHarness/testHarnessRouter');

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

app.use('/api', dashboardRouter);
app.use('/api', simulationRouter);
app.use('/api', settingsRouter);

// TEST HARNESS ONLY - not part of product architecture. Scoped to public/ so
// only files intentionally placed there are ever served (never .env, never
// the service account key sitting elsewhere in server/).
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/test-harness', testHarnessRouter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'halt-line-server' });
});

app.get('/health/firestore', async (req, res) => {
  try {
    // Read-only connectivity check: listing root collections round-trips to
    // Firestore and fails if the client can't authenticate or reach the DB,
    // without writing anything. (Previously this wrote a throwaway doc to a
    // _healthchecks collection on every hit - removed to keep the DB clean.)
    const collections = await db.listCollections();

    res.status(200).json({
      status: 'ok',
      firestoreConnected: true,
      collectionsVisible: collections.length,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', firestoreConnected: false, message: error.message });
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