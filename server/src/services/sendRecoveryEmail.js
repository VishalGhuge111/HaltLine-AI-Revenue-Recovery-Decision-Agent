const resend = require('../config/resend');
const { getSettings } = require('../config/settings');
const { logAuditEvent } = require('./auditLog');

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatRupees(amount) {
  return `₹${((amount || 0) / 100).toFixed(2)}`;
}

const FOOTER_LINE_1 = 'This is a Test Mode transaction. No real money is involved.';
const FOOTER_LINE_2 = "Recovery action reviewed and approved by Halt Line's policy engine.";

function buildTextBody(message, shortUrl) {
  const parts = [message];
  if (shortUrl) parts.push(`Complete your payment: ${shortUrl}`);
  parts.push(`---\n${FOOTER_LINE_1}\n${FOOTER_LINE_2}`);
  return parts.join('\n\n');
}

function buildHtmlBody(message, shortUrl) {
  const safe = escapeHtml(message).replace(/\n/g, '<br />');
  const fontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  const cta = shortUrl
    ? `<div style="text-align: center; margin: 28px 0 4px;">
              <a href="${escapeHtml(shortUrl)}" style="display: inline-block; padding: 13px 32px; background: #17171a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; font-family: ${fontStack};">Complete your payment</a>
            </div>
            <p style="text-align: center; font-size: 12px; color: #9c9ca5; margin: 14px 0 0; font-family: ${fontStack};">Or copy this link: <a href="${escapeHtml(shortUrl)}" style="color: #6b6b74;">${escapeHtml(shortUrl)}</a></p>`
    : '';

  return `<div style="background: #f6f6f7; padding: 32px 16px; font-family: ${fontStack};">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e7ea; border-radius: 12px; overflow: hidden;">
    <div style="padding: 20px 28px; border-bottom: 1px solid #e7e7ea;">
      <span style="display: inline-block; width: 24px; height: 24px; background: #17171a; color: #ffffff; border-radius: 6px; text-align: center; line-height: 24px; font-weight: 700; font-size: 13px; vertical-align: middle; font-family: ${fontStack};">H</span>
      <span style="font-weight: 700; font-size: 15px; color: #17171a; vertical-align: middle; margin-left: 8px; font-family: ${fontStack};">Halt Line</span>
    </div>
    <div style="padding: 28px;">
      <p style="font-size: 14px; line-height: 1.6; color: #17171a; margin: 0;">${safe}</p>
      ${cta}
    </div>
    <div style="padding: 18px 28px; border-top: 1px solid #e7e7ea; background: #fafafa;">
      <p style="font-size: 12px; color: #9c9ca5; margin: 0 0 4px; font-family: ${fontStack};">${FOOTER_LINE_1}</p>
      <p style="font-size: 12px; color: #9c9ca5; margin: 0; font-family: ${fontStack};">${FOOTER_LINE_2}</p>
    </div>
  </div>
</div>`;
}

// Demo/test recipient override lives in app_settings so a presenter can
// redirect every outgoing recovery email to their own inbox without editing
// code. See getSettings(). shortUrl is the real recovery_attempts payment
// link for this case - callers must pass it through so the email actually
// contains something the customer can click, not just the AI's draft text.
async function sendRecoveryEmail(revenueCase, aiProposal, shortUrl) {
  const { caseId, amount, customerEmail } = revenueCase;

  try {
    const settings = await getSettings();
    const recipient = settings.demoEmailOverride || customerEmail;

    if (!recipient) {
      throw new Error(
        `No recipient email available for case ${caseId}: no demoEmailOverride is set and this case has no customerEmail.`,
      );
    }

    const result = await resend.emails.send({
      from: 'Halt Line <onboarding@resend.dev>',
      to: recipient,
      subject: `Action needed: complete your payment of ${formatRupees(amount)}`,
      text: buildTextBody(aiProposal.customer_message, shortUrl),
      html: buildHtmlBody(aiProposal.customer_message, shortUrl),
    });

    if (result.error) {
      throw new Error(result.error.message || 'Resend returned an error');
    }

    await logAuditEvent(caseId, 'recovery_email_sent', { recipient, caseId, shortUrl: shortUrl || null });
    return { sent: true, recipient };
  } catch (error) {
    await logAuditEvent(caseId, 'recovery_email_failed', { error: error.message, caseId });
    throw error;
  }
}

module.exports = { sendRecoveryEmail };
