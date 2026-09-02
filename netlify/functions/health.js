'use strict';

function isProductionEnvironment() {
  return !process.env.DEPLOY_PRIME_URL && process.env.BRANCH !== 'dev';
}

exports.handler = async function() {
  const emailConfig = {
    resend_api_key: Boolean(process.env.RESEND_API_KEY),
    notify_email: Boolean(process.env.NOTIFY_EMAIL),
    from_email: Boolean(process.env.FROM_EMAIL)
  };

  const ready = emailConfig.resend_api_key && emailConfig.notify_email && emailConfig.from_email;
  const deploySignals = {
    branch: process.env.BRANCH || null,
    head: process.env.HEAD || null,
    context: process.env.CONTEXT || null,
    deploy_prime_url: process.env.DEPLOY_PRIME_URL || null,
    url: process.env.URL || null
  };
  const body = {
    ok: true,
    production: isProductionEnvironment(),
    context: deploySignals,
    email_notifications_ready: ready,
    missing_email_envs: Object.entries(emailConfig).filter(([, value]) => !value).map(([key]) => key)
  };

  return {
    statusCode: ready ? 200 : 503,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
};
