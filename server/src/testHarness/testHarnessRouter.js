// TEST HARNESS ONLY - not part of product architecture. Used to generate
// realistic Razorpay test failures via Custom Checkout (Orders API +
// Checkout.js), since Payment Links checkout only ever returns a generic
// payment_failed reason and can't simulate specific error_reason values
// (payment_timed_out, insufficient_funds, card_declined, etc). Exclude this
// router from the "core loop" when the architecture doc gets written.
const express = require('express');
const razorpay = require('../config/razorpay');

const router = express.Router();

router.post('/create-order', async (req, res) => {
  const amount = req.body?.amount || 100;
  const currency = req.body?.currency || 'INR';

  try {
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt: `test_harness_${Date.now()}`,
    });

    res.status(200).json({
      orderId: order.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    const message = error.error?.description || error.message || 'Unknown Razorpay error';
    res.status(500).json({ status: 'error', message });
  }
});

module.exports = router;
