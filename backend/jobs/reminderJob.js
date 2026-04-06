const dayjs    = require('dayjs');
const Schedule = require('../models/Schedule');
const { sendReminderEmail } = require('../services/mailService');

/**
 * sendTomorrowReminders()
 *
 * Finds every schedule entry whose date is tomorrow, groups them by
 * (serviceType, date) so each slot knows its full team, then sends
 * a reminder email to every member who has an email address on file.
 *
 * Returns a summary object: { checked, sent, skipped, errors }
 */
async function sendTomorrowReminders() {
  const tomorrow     = dayjs().add(1, 'day');
  const tomorrowDate = tomorrow.format('YYYY-MM-DD');

  // Fetch all entries for tomorrow, populating member details
  const entries = await Schedule.find({
    date: {
      $gte: new Date(`${tomorrowDate}T00:00:00.000Z`),
      $lte: new Date(`${tomorrowDate}T23:59:59.999Z`),
    },
  }).populate('member', 'name email');

  if (!entries.length) {
    console.log(`[Reminder] No service entries found for ${tomorrowDate}`);
    return { checked: 0, sent: 0, skipped: 0, errors: 0 };
  }

  console.log(`[Reminder] Found ${entries.length} entries for ${tomorrowDate}`);

  // Group entries by (serviceType + date) to build team context per slot
  const slotMap = new Map();
  for (const entry of entries) {
    const key = `${entry.serviceType}__${tomorrowDate}`;
    if (!slotMap.has(key)) {
      slotMap.set(key, {
        serviceType:  entry.serviceType,
        date:         entry.date,
        scheduleName: entry.scheduleName || 'Service Schedule',
        members:      [],
      });
    }
    if (entry.member) {
      const slot    = slotMap.get(key);
      const isLead  = slot.members.length === 0; // first added = team lead
      slot.members.push({ name: entry.member.name, email: entry.member.email, isLead });
    }
  }

  let sent = 0, skipped = 0, errors = 0;

  for (const slot of slotMap.values()) {
    for (const member of slot.members) {
      if (!member.email) {
        console.log(`[Reminder] Skipped ${member.name} — no email address`);
        skipped++;
        continue;
      }

      try {
        const result = await sendReminderEmail(
          { name: member.name, email: member.email },
          {
            date:         slot.date,
            serviceType:  slot.serviceType,
            scheduleName: slot.scheduleName,
            isLead:       member.isLead,
            teammates:    slot.members, // full team list (mailService filters out self)
          }
        );

        if (result.skipped) {
          skipped++;
        } else {
          console.log(`[Reminder] ✓ Sent to ${member.name} <${member.email}> — ${slot.serviceType} on ${tomorrowDate}`);
          sent++;
        }
      } catch (err) {
        console.error(`[Reminder] ✗ Failed for ${member.name} <${member.email}>:`, err.message);
        errors++;
      }
    }
  }

  const summary = { checked: entries.length, sent, skipped, errors };
  console.log('[Reminder] Done:', summary);
  return summary;
}

module.exports = { sendTomorrowReminders };
