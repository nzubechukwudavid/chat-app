const { config } = require('../config');

/**
 * Transactional email, deliberately dependency-free.
 *
 * Only the reset message exists today, so this is a small provider adapter
 * rather than a general mail framework. `provider=none` is a supported state:
 * the API still issues links through the admin script.
 */

/** Test-only outbox. Populated when `MAIL_PROVIDER=memory`. */
const outbox = [];

const isConfigured = () => {
  if (config.mail.provider === 'memory') return true;
  if (config.mail.provider === 'brevo') {
    return Boolean(config.mail.apiKey && config.mail.from);
  }
  return false;
};

/** Accepts `no-reply@example.com` or `Rail Hub <no-reply@example.com>`. */
const parseSender = (value) => {
  const raw = String(value || '').trim();
  const match = raw.match(/^(.*)<([^>]+)>$/);
  if (!match) return { email: raw };

  const name = match[1].trim().replace(/^"|"$/g, '');
  return name ? { name, email: match[2].trim() } : { email: match[2].trim() };
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const resetContent = ({ username, resetUrl, ttlMinutes }) => {
  const safeUsername = username || 'there';
  const subject = 'Reset your Rail Hub password';
  const text = [
    `A password reset was requested for your Rail Hub account (${safeUsername}).`,
    '',
    'Open this link to choose a new password:',
    resetUrl,
    '',
    `This link expires in ${ttlMinutes} minutes and can only be used once.`,
    'If you did not request this, you can ignore this message.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;">
      <h1 style="margin:0 0 12px;font-size:20px;">Reset your Rail Hub password</h1>
      <p style="margin:0 0 12px;line-height:1.5;">
        A password reset was requested for your Rail Hub account
        (<strong>${escapeHtml(safeUsername)}</strong>).
      </p>
      <p style="margin:0 0 20px;">
        <a href="${escapeHtml(resetUrl)}"
           style="display:inline-block;background:#15803d;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:bold;">
          Choose a new password
        </a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#475569;line-height:1.5;">
        This link expires in ${ttlMinutes} minutes and can only be used once.
        If you did not request this, you can ignore this message.
      </p>
      <p style="margin:16px 0 0;font-size:12px;color:#64748b;word-break:break-all;">
        ${escapeHtml(resetUrl)}
      </p>
    </div>
  </body>
</html>`;

  return { subject, text, html };
};

const sendBrevo = async ({ to, subject, text, html }) => {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': config.mail.apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: parseSender(config.mail.from),
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    // Keep the provider's explanation in the log for operators, but never
    // include the reset URL or token.
    const detail = await response.text().catch(() => '');
    return {
      ok: false,
      error: `Brevo responded ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`,
    };
  }

  return { ok: true };
};

/**
 * Sends the reset email. Never throws: callers must be able to keep the API
 * response identical whether delivery worked, failed, or was skipped.
 */
const sendPasswordReset = async ({ to, username, resetUrl }) => {
  if (!to) return { ok: false, error: 'No recipient address.' };

  const ttlMinutes = Math.round(config.passwordReset.ttlMs / 60_000);
  const content = resetContent({ username, resetUrl, ttlMinutes });

  if (config.mail.provider === 'memory') {
    outbox.push({
      to,
      username,
      resetUrl,
      ttlMinutes,
      sentAt: new Date().toISOString(),
      ...content,
    });
    return { ok: true };
  }

  if (!isConfigured()) {
    // A deliberate `none` is not an error worth logging on every request; the
    // controller distinguishes this from a real delivery failure.
    return {
      ok: false,
      skipped: true,
      error: `Mail provider "${config.mail.provider}" is not configured.`,
    };
  }

  try {
    if (config.mail.provider === 'brevo') {
      return await sendBrevo({ to, ...content });
    }
    return { ok: false, error: `Unsupported mail provider "${config.mail.provider}".` };
  } catch (error) {
    return { ok: false, error: error.message };
  }
};

/** Test helpers; harmless in production because the outbox stays empty. */
const getOutbox = () => outbox.map((entry) => ({ ...entry }));
const clearOutbox = () => {
  outbox.length = 0;
};

module.exports = {
  isConfigured,
  parseSender,
  sendPasswordReset,
  getOutbox,
  clearOutbox,
};
