const Schedule = require('../models/Schedule');
const Member = require('../models/Member');
const dayjs = require('dayjs');

const SERVICE_TYPES = ['A', 'B', 'C'];

// helpers
const toMonthKey = (date) => dayjs(date).format('YYYY-MM');

function getDatesInMonth(year, month, dayOfWeek) {
  const dates = [];
  const start = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);
  for (let d = 1; d <= start.daysInMonth(); d++) {
    const cur = start.date(d);
    if (cur.day() === dayOfWeek) dates.push(cur.format('YYYY-MM-DD'));
  }
  return dates;
}

function buildSlots(startMonth, endMonth) {
  const [sy, sm] = startMonth.split('-').map(Number);
  const [ey, em] = endMonth.split('-').map(Number);
  const months = [];
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    months.push({ year: y, month: m });
    m++; if (m > 12) { m = 1; y++; }
  }
  const slots = [];
  for (const { year, month } of months) {
    const sundays    = getDatesInMonth(year, month, 0); // 0 = Sunday
    const wednesdays = getDatesInMonth(year, month, 3); // 3 = Wednesday
    const mKey = `${year}-${String(month).padStart(2, '0')}`;

    // Every Sunday has BOTH a 1st&2nd service (A) AND a 3rd service (B)
    sundays.forEach((date) => {
      slots.push({ date, serviceType: 'A', monthKey: mKey }); // 1st & 2nd service
      slots.push({ date, serviceType: 'B', monthKey: mKey }); // 3rd service
    });

    // Every Wednesday has a midweek service (C)
    wednesdays.forEach((date) => {
      slots.push({ date, serviceType: 'C', monthKey: mKey });
    });
  }
  return slots;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// GET /api/schedules
exports.getSchedules = async (req, res) => {
  try {
    const { month, startMonth, endMonth, periodKey, scheduleName } = req.query;
    let filter = {};
    if (scheduleName) {
      filter.scheduleName = scheduleName;
    } else if (periodKey) {
      filter.periodKey = periodKey;
    } else if (startMonth && endMonth) {
      const [sy, sm] = startMonth.split('-').map(Number);
      const [ey, em] = endMonth.split('-').map(Number);
      const keys = [];
      let y = sy, m = sm;
      while (y < ey || (y === ey && m <= em)) {
        keys.push(`${y}-${String(m).padStart(2, '0')}`);
        m++; if (m > 12) { m = 1; y++; }
      }
      filter.monthKey = { $in: keys };
    } else if (month) {
      filter.monthKey = month;
    }
    const schedules = await Schedule.find(filter)
      .populate('member', 'name phone email')
      .sort({ date: 1, serviceType: 1 });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/schedules/slots
exports.getSlots = async (req, res) => {
  try {
    const { startMonth, endMonth } = req.query;
    if (!startMonth || !endMonth)
      return res.status(400).json({ message: 'startMonth and endMonth are required.' });
    const slots = buildSlots(startMonth, endMonth);
    const byType = {
      A: slots.filter((s) => s.serviceType === 'A').length,
      B: slots.filter((s) => s.serviceType === 'B').length,
      C: slots.filter((s) => s.serviceType === 'C').length,
    };
    res.json({
      totalServiceDays: slots.length,
      totalSlots: slots.length * 3, // 3 members per service day
      byType,
      byTypeSlots: { A: byType.A * 3, B: byType.B * 3, C: byType.C * 3 },
      slots,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/schedules
exports.createSchedule = async (req, res) => {
  try {
    const { member, serviceType, date, notes, scheduleName } = req.body;
    const monthKey = toMonthKey(date);
    const schedule = await Schedule.create({
      member, serviceType, date, monthKey,
      notes: notes || '',
      scheduleName: scheduleName || '',
      periodKey: '',
    });
    await schedule.populate('member', 'name phone email');
    res.status(201).json(schedule);
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ message: 'This member is already scheduled for this service type on that date.' });
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/schedules/:id
exports.deleteSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    if (!schedule) return res.status(404).json({ message: 'Schedule entry not found' });
    res.json({ message: 'Schedule entry deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/schedules/period/:periodKey
exports.deletePeriod = async (req, res) => {
  try {
    const result = await Schedule.deleteMany({ periodKey: req.params.periodKey });
    res.json({ message: `Deleted ${result.deletedCount} entries` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/schedules/auto-generate
exports.autoGenerate = async (req, res) => {
  try {
    const { scheduleName = '', startMonth, endMonth, overwrite = false } = req.body;
    if (!startMonth || !endMonth)
      return res.status(400).json({ message: 'startMonth and endMonth are required.' });

    const periodKey = `${startMonth}_${endMonth}`;
    if (overwrite) await Schedule.deleteMany({ periodKey });

    const members = await Member.find({ isActive: true });
    if (!members.length)
      return res.status(400).json({ message: 'No active members found.' });
    if (members.length < 3)
      return res.status(400).json({ message: 'At least 3 active members are required to fill each service day.' });

    const allSlots = buildSlots(startMonth, endMonth);

    // Track how many times each member has been assigned per type
    // so we spread load evenly across the 2-month period
    const memberCounts = {};
    members.forEach((m) => {
      memberCounts[m._id.toString()] = { A: 0, B: 0, C: 0, total: 0 };
    });

    const assignments = []; // { date, serviceType, monthKey, memberId }

    // For every slot, pick 3 distinct members — prefer those with lowest count for that type
    for (const slot of allSlots) {
      const t = slot.serviceType;
      // Sort members by count for this type (ascending), then shuffle ties
      const pool = shuffle([...members]).sort(
        (a, b) => memberCounts[a._id.toString()][t] - memberCounts[b._id.toString()][t]
      );
      // Pick first 3 (they won't conflict with each other — different member IDs, same date is fine)
      const picked = pool.slice(0, 3);
      for (const m of picked) {
        memberCounts[m._id.toString()][t]++;
        memberCounts[m._id.toString()].total++;
        assignments.push({
          date: slot.date,
          serviceType: slot.serviceType,
          monthKey: slot.monthKey,
          memberId: m._id,
        });
      }
    }

    // Insert — unique index is (member, date, serviceType)
    // A member CAN serve both A and B on the same Sunday (different services)
    // but CANNOT be assigned the same service type twice on the same date
    let createdCount = 0;
    const skipped = [];
    for (const a of assignments) {
      try {
        await Schedule.create({
          scheduleName,
          member: a.memberId,
          serviceType: a.serviceType,
          date: a.date,
          monthKey: a.monthKey,
          periodKey,
          notes: '',
        });
        createdCount++;
      } catch (err) {
        if (err.code === 11000) skipped.push(`${a.date} – member already assigned`);
        else throw err;
      }
    }

    res.status(201).json({
      scheduleName,
      periodKey,
      totalServiceDays: allSlots.length,
      totalSlots: allSlots.length * 3,
      created: createdCount,
      skipped: skipped.length,
      skippedDetails: skipped,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/schedules/name/:scheduleName
exports.deleteScheduleName = async (req, res) => {
  try {
    const result = await Schedule.deleteMany({ scheduleName: req.params.scheduleName });
    res.json({ message: `Deleted ${result.deletedCount} entries for "${req.params.scheduleName}"` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/schedules/names
// Returns all distinct schedule names with metadata: periodKey, date range, counts
exports.getScheduleNames = async (req, res) => {
  try {
    const agg = await Schedule.aggregate([
      { $match: { scheduleName: { $ne: '' } } },
      {
        $group: {
          _id: '$scheduleName',
          periodKey:  { $first: '$periodKey' },
          minDate:    { $min: '$date' },
          maxDate:    { $max: '$date' },
          totalEntries: { $sum: 1 },
          serviceTypes: { $addToSet: '$serviceType' },
        },
      },
      { $sort: { minDate: -1 } },
    ]);

    const result = agg.map((r) => ({
      scheduleName: r._id,
      periodKey:    r.periodKey,
      minDate:      r.minDate,
      maxDate:      r.maxDate,
      totalEntries: r.totalEntries,
      serviceTypes: r.serviceTypes.sort(),
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/schedules/summary
exports.getMonthlySummary = async (req, res) => {
  try {
    const { month, startMonth, endMonth } = req.query;
    let monthKeys = [];
    if (startMonth && endMonth) {
      const [sy, sm] = startMonth.split('-').map(Number);
      const [ey, em] = endMonth.split('-').map(Number);
      let y = sy, m = sm;
      while (y < ey || (y === ey && m <= em)) {
        monthKeys.push(`${y}-${String(m).padStart(2, '0')}`);
        m++; if (m > 12) { m = 1; y++; }
      }
    } else if (month) {
      monthKeys = [month];
    } else {
      return res.status(400).json({ message: 'month or startMonth+endMonth required.' });
    }

    const members = await Member.find({ isActive: true }).sort({ name: 1 });
    const schedules = await Schedule.find({ monthKey: { $in: monthKeys } }).populate('member', 'name');

    const summary = members.map((m) => {
      const ms = schedules.filter((s) => s.member._id.toString() === m._id.toString());
      const assigned = ms.map((s) => s.serviceType);
      const missing = SERVICE_TYPES.filter((t) => !assigned.includes(t));
      return {
        member: { _id: m._id, name: m.name },
        assigned,
        missing,
        counts: {
          A: assigned.filter((t) => t === 'A').length,
          B: assigned.filter((t) => t === 'B').length,
          C: assigned.filter((t) => t === 'C').length,
        },
        isComplete: missing.length === 0,
      };
    });

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
