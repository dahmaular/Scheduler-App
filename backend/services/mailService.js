const Mailjet = require('node-mailjet');
const dayjs   = require('dayjs');

const SVC_LABEL = {
  A: '1st & 2nd Service (Sunday)',
  B: '3rd Service (Sunday)',
  C: 'Midweek Service (Wednesday)',
};

// Lazily initialise the Mailjet client so missing keys only error at send-time
function getClient() {
  const apiKey    = process.env.MAILJET_API_KEY;
  const secretKey = process.env.MAILJET_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error('MAILJET_API_KEY and MAILJET_SECRET_KEY must be set in environment variables');
  }

  return Mailjet.apiConnect(apiKey, secretKey);
}

/**
 * Send a 24-hour service reminder to a single member.
 *
 * @param {Object} member  - { name, email }
 * @param {Object} slot    - { date (Date|string), serviceType ('A'|'B'|'C'), scheduleName, isLead (bool), teammates [] }
 */
async function sendReminderEmail(member, slot) {
  if (!member.email) return { skipped: true, reason: 'no email address' };

  const client   = getClient();
  const dateStr  = dayjs(slot.date).format('dddd, D MMMM YYYY');
  const svcLabel = SVC_LABEL[slot.serviceType] ?? slot.serviceType;
  const roleTag  = slot.isLead ? '★ Team Lead' : 'Team Member';

  // Build teammate list (excluding the current member)
  const teammateLines = (slot.teammates ?? [])
    .filter((t) => t.name !== member.name)
    .map((t, i) => `<li>${t.isLead ? '<strong>★ Team Lead: ' + t.name + '</strong>' : t.name}</li>`)
    .join('');

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Service Reminder</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0a1f44 0%,#163366 100%);padding:28px 32px;border-bottom:3px solid #c9a84c;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;color:#c9a84c;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Daystar Christian Centre</p>
                    <h1 style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:800;">Service Reminder</h1>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;background:#c9a84c;color:#0a1f44;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.8px;text-transform:uppercase;">${roleTag}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Hi <strong style="color:#111827;">${member.name}</strong>,</p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
                This is a reminder that you are scheduled to serve <strong>tomorrow</strong>.
              </p>

              <!-- Service card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fc;border-radius:8px;border-left:4px solid #c9a84c;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Service</p>
                    <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#0a1f44;">${svcLabel}</p>
                    <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Date</p>
                    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#111827;">📅 ${dateStr}</p>
                    <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Schedule</p>
                    <p style="margin:0;font-size:14px;color:#374151;">${slot.scheduleName}</p>
                  </td>
                </tr>
              </table>

              ${teammateLines ? `
              <!-- Teammates -->
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#374151;">Serving alongside you:</p>
              <ul style="margin:0 0 24px;padding-left:20px;color:#374151;font-size:14px;line-height:1.8;">
                ${teammateLines}
              </ul>` : ''}

              <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
                Please ensure you are available and prepared. If you have any issues, kindly reach out to your unit leader.<br/><br/>
                <em style="color:#c9a84c;font-weight:600;">The Word Works Wonders.</em>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f9fc;padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
                Daystar Christian Centre &mdash; Unit Service Planner &bull; This is an automated reminder.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textBody = `Hi ${member.name},

You are scheduled to serve TOMORROW.

Service: ${svcLabel}
Date:    ${dateStr}
Role:    ${roleTag}
Schedule: ${slot.scheduleName}
${slot.teammates?.length ? '\nServing alongside you:\n' + slot.teammates.filter(t => t.name !== member.name).map(t => (t.isLead ? '★ ' : '  ') + t.name).join('\n') : ''}

Please ensure you are available and prepared.

The Word Works Wonders.
— Daystar Christian Centre, Unit Service Planner`;

  const result = await client.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: {
          Email: process.env.MAIL_FROM_EMAIL || 'noreply@daystar.org',
          Name:  process.env.MAIL_FROM_NAME  || 'Daystar Service Planner',
        },
        To: [{ Email: member.email, Name: member.name }],
        Subject: `⛪ Reminder: You're serving tomorrow — ${svcLabel}`,
        TextPart: textBody,
        HTMLPart: htmlBody,
      },
    ],
  });

  return { sent: true, status: result.body?.Messages?.[0]?.Status };
}

module.exports = { sendReminderEmail };
