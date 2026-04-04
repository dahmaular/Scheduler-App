const mongoose = require('mongoose');

/**
 * Service Types:
 *  A = First & Second Service  (Sunday)
 *  B = Third Service           (Sunday)
 *  C = Midweek Service         (Wednesday)
 *
 * Scheduling period: 2 calendar months.
 * Rule: each active member must serve AT LEAST once for A, once for B, once for C
 *       across the period. Extra slots are distributed randomly.
 */

const scheduleSchema = new mongoose.Schema(
  {
    // Human-readable name for this schedule batch / entry
    scheduleName: {
      type: String,
      trim: true,
      default: '',
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    serviceType: {
      type: String,
      enum: ['A', 'B', 'C'],
      required: true,
    },
    // The specific date of the service
    date: {
      type: Date,
      required: true,
    },
    // "YYYY-MM" of the date — kept for filtering / dashboard
    monthKey: {
      type: String,
      required: true,
    },
    // The 2-month period this entry belongs to e.g. "2026-04_2026-05"
    periodKey: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// One member can only appear ONCE per service type per date
// (a member CAN serve both A and B on the same Sunday — they are different services)
scheduleSchema.index({ member: 1, date: 1, serviceType: 1 }, { unique: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
