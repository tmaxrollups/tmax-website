'use strict';

exports.handler = async function() {
  const ready = Boolean(process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL && process.env.FROM_EMAIL);
  const body = {
    ok: ready,
    email_notifications_ready: ready
  };

  return {
    statusCode: ready ? 200 : 503,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
};
