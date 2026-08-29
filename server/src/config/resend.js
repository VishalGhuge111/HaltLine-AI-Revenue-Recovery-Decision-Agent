const { Resend } = require('resend');

const { RESEND_API_KEY } = process.env;

if (!RESEND_API_KEY) {
  throw new Error('Missing RESEND_API_KEY environment variable');
}

const resend = new Resend(RESEND_API_KEY);

module.exports = resend;
