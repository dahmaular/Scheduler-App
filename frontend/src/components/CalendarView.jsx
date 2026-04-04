import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import './CalendarView.css';

dayjs.extend(isoWeek);

// Service type config (matches image colour coding)
const SERVICE_CONFIG = {
  A: { label: '1ST & 2ND\nSERVICE', short: '1st & 2nd Service', colorClass: 'svc-a' },
  B: { label: '3RD\nSERVICE',        short: '3rd Service',       colorClass: 'svc-b' },
  C: { label: 'WEDNESDAY',           short: 'Wednesday',         colorClass: 'svc-c' },
};

// Row order: Wednesday, then 1st&2nd, then 3rd — matching the image top-to-bottom
const ROW_ORDER = ['C', 'A', 'B'];

/**
 * Groups schedule entries into calendar weeks.
 * Each week has days: { A: {date, members[]}, B: {date, members[]}, C: {date, members[]} }
 *
 * Note: A and B share the same Sunday date; C is the Wednesday of that week.
 * The week key uses ISO week so cross-month/cross-year boundaries work correctly.
 */
function groupByWeek(schedules) {
  if (!schedules.length) return [];

  const weekMap = new Map();

  for (const entry of schedules) {
    const d = dayjs(entry.date);
    const weekKey = `${d.isoWeekYear()}-W${String(d.isoWeek()).padStart(2, '0')}`;
    const serviceType = entry.serviceType;

    if (!weekMap.has(weekKey)) weekMap.set(weekKey, { weekKey, days: {} });
    const week = weekMap.get(weekKey);

    if (!week.days[serviceType]) {
      week.days[serviceType] = { date: entry.date, members: [] };
    }
    if (entry.member?.name) {
      const members = week.days[serviceType].members;
      members.push({
        id: entry._id,
        name: entry.member.name,
        isLead: members.length === 0, // first member added is the team lead
      });
    }
  }

  // Sort weeks chronologically
  const sorted = [...weekMap.values()].sort((a, b) => (a.weekKey > b.weekKey ? 1 : -1));

  // Label them WEEK 1, WEEK 2, … and pick a display date (prefer Sunday date, else Wednesday)
  return sorted.map((w, idx) => ({
    ...w,
    weekLabel: `WEEK ${idx + 1}`,
    // Show the Sunday date in the header (A and B share the same Sunday)
    headerDate: w.days['A']?.date ?? w.days['B']?.date ?? w.days['C']?.date ?? null,
  }));
}

function formatDate(dateStr) {
  return dayjs(dateStr).format('D MMM. YYYY');
}

export default function CalendarView({ schedules, onDelete, scheduleName }) {
  if (!schedules.length) {
    return (
      <div className="cv-empty">
        <p>No schedules found for this period.</p>
      </div>
    );
  }

  const weeks = groupByWeek(schedules);

  return (
    <div className="cv-wrapper">
      {scheduleName && <div className="cv-title">{scheduleName}</div>}

      <div className="cv-table-scroll">
        <table className="cv-table">
          <thead>
            <tr>
              {/* Empty corner cell */}
              <th className="cv-row-label-header" />
              {weeks.map((w) => (
                <th key={w.weekKey} className="cv-week-header">
                  <div className="cv-week-label">{w.weekLabel}</div>
                  {w.headerDate && (
                    <div className="cv-week-date">{formatDate(w.headerDate)}</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROW_ORDER.map((type) => {
              const cfg = SERVICE_CONFIG[type];
              return (
                <tr key={type} className={`cv-row cv-row-${type.toLowerCase()}`}>
                  {/* Row label */}
                  <td className={`cv-row-label ${cfg.colorClass}-label`}>
                    {cfg.label.split('\n').map((line, i) => (
                      <span key={i} className="cv-label-line">{line}</span>
                    ))}
                  </td>

                  {/* One cell per week */}
                  {weeks.map((w) => {
                    const day = w.days[type];
                    return (
                      <td key={w.weekKey} className={`cv-cell ${cfg.colorClass}-cell`}>
                        {day ? (
                          <div className="cv-cell-inner">
                            {day.date && (
                              <div className="cv-cell-date">{formatDate(day.date)}</div>
                            )}
                            <div className="cv-members">
                              {day.members.map((m, i) => (
                                <div
                                  key={m.id || i}
                                  className={`cv-member ${m.isLead ? 'cv-member-lead' : ''}`}
                                >
                                  {m.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="cv-cell-empty">—</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="cv-legend">
        <span className="cv-legend-swatch cv-legend-lead" />
        <span className="cv-legend-text">Highlighted name = Team Lead for that service</span>
      </div>
    </div>
  );
}
