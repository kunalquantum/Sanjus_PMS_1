const AUDIT_RECIPIENT = 'sanjanakasbe0526@gmail.com';

export const sendDbAuditLog = async ({ action, entity, summary, payload }) => {
  const webhookUrl = import.meta.env.VITE_DB_AUDIT_WEBHOOK_URL;

  if (!webhookUrl) {
    console.info('DB audit webhook not configured.', {
      recipient: AUDIT_RECIPIENT,
      action,
      entity,
      summary,
      payload,
    });
    return { delivered: false, reason: 'missing_webhook' };
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: AUDIT_RECIPIENT,
      action,
      entity,
      summary,
      payload,
      createdAt: new Date().toISOString(),
      app: 'Sneha Asha PMS',
    }),
  });

  if (!response.ok) {
    throw new Error('Audit webhook failed.');
  }

  return { delivered: true };
};
