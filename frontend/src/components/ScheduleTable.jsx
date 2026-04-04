import dayjs from 'dayjs';
import './ScheduleTable.css';

const SERVICE_LABELS = {
  A: { label: 'A – 1st & 2nd Service', color: '#6366f1' },
  B: { label: 'B – 3rd Service',        color: '#0ea5e9' },
  C: { label: 'C – Midweek',            color: '#10b981' },
};

export default function ScheduleTable({ schedules, onDelete }) {
  if (!schedules.length) {
    return (
      <div className="empty-state">
        <p>No schedules found for this period.</p>
      </div>
    );
  }

  return (
    <div className="schedule-table-wrapper">
      <table className="schedule-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Schedule Name</th>
            <th>Member</th>
            <th>Service Type</th>
            <th>Date</th>
            <th>Notes</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((s, idx) => {
            const svc = SERVICE_LABELS[s.serviceType] || {};
            return (
              <tr key={s._id}>
                <td>{idx + 1}</td>
                <td className="schedule-name-cell">{s.scheduleName || <span className="muted">—</span>}</td>
                <td>{s.member?.name || '—'}</td>
                <td>
                  <span className="badge" style={{ background: svc.color || '#888' }}>
                    {svc.label || s.serviceType}
                  </span>
                </td>
                <td>{dayjs(s.date).format('ddd, D MMM YYYY')}</td>
                <td>{s.notes || <span className="muted">—</span>}</td>
                <td>
                  <button className="btn-icon btn-delete" onClick={() => onDelete(s._id)} title="Remove">
                    🗑
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
