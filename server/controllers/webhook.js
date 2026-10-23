const { config } = require('../config');
const crypto = require('crypto');

let twilioClient = null;
const getTwilioClient = () => {
  if (!twilioClient && config.hasTwilio) {
    twilioClient = require('twilio')(config.twilio.accountSid, config.twilio.authToken);
  }
  return twilioClient;
};

/**
 * Guards the webhook endpoint with a shared secret.
 *
 * Stream can be configured to append `?auth_token=<secret>` to webhook calls.
 * Without this, anybody who can reach the endpoint could feed it arbitrary
 * payloads and trigger SMS dispatches.
 */
const hasValidStreamSecret = (req) => {
  if (!config.streamWebhookSecret) return true;

  const provided =
    req.query?.auth_token ||
    req.get('x-stream-auth-token') ||
    req.get('authorization');

  if (!provided) return false;

  const a = Buffer.from(String(provided));
  const b = Buffer.from(config.streamWebhookSecret);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

/**
 * Verifies the `X-Twilio-Signature` header against the shared auth token.
 *
 * Without this check anybody who can reach the endpoint could trigger SMS
 * dispatches to arbitrary numbers on the account. Twilio's `validateRequest`
 * needs the exact public URL the request was made to, so it must be
 * configured explicitly via `TWILIO_WEBHOOK_URL`.
 */
const isValidTwilioRequest = (req) => {
  if (!config.hasTwilio) return true; // Twilio disabled - nothing to validate.

  const signature = req.get('X-Twilio-Signature');
  if (!signature) return false;

  const client = getTwilioClient();
  if (!client?.validateRequest) return false;

  // `validateRequest` needs the form-encoded body. Express only populates
  // `req.body` for JSON payloads, so rebuild it from the raw stream.
  return client.validateRequest(config.twilio.authToken, signature, config.twilio.webhookUrl, req.body || {});
};

const dispatchOfflineSms = async ({ message, sender, members }) => {
  const client = getTwilioClient();
  if (!client || !config.twilio.messagingServiceSid) return;

  const recipients = (members || [])
    .filter((member) => member.user_id !== sender?.id)
    .filter((member) => !member.user?.online && member.user?.phoneNumber);

  await Promise.allSettled(
    recipients.map(({ user }) =>
      client.messages.create({
        body: `You have a new message from ${message.user?.fullName || message.user?.name || 'a team member'} - ${message.text}`,
        messagingServiceSid: config.twilio.messagingServiceSid,
        to: user.phoneNumber,
      }),
    ),
  ).then((results) => {
    const sent = results.filter((r) => r.status === 'fulfilled').length;
    if (sent) console.log(`[twilio] dispatched ${sent} SMS notification(s)`);
  });
};

/**
 * Stream Chat webhook target for `message.new`.
 */
const handleMessageNew = async (req, res) => {
  if (!hasValidStreamSecret(req)) {
    console.warn('[webhook] rejected request with invalid shared secret');
    return res.status(403).json({ message: 'Invalid signature.' });
  }

  if (!isValidTwilioRequest(req)) {
    console.warn('[webhook] rejected request with invalid Twilio signature');
    return res.status(403).json({ message: 'Invalid signature.' });
  }

  const { message, user: sender, type, members } = req.body || {};

  if (type !== 'message.new') {
    return res.status(200).json({ message: 'Event ignored.' });
  }

  try {
    await dispatchOfflineSms({ message: message || {}, sender, members });
  } catch (err) {
    console.error('[twilio] failed to dispatch SMS:', err.message);
  }

  return res.status(200).json({ message: 'Message event processed' });
};

module.exports = { handleMessageNew, isValidTwilioRequest, hasValidStreamSecret };
