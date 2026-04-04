import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { getScheduleNames } from '../api/schedules';
import { getMembers } from '../api/members';
import './Dashboard.css';

const SVC_TYPE_COLORS = { A: 'pill-a', B: 'pill-b', C: 'pill-c' };
const SVC_TYPE_LABELS = { A: '1st & 2nd', B: '3rd Service', C: 'Midweek' };

export default function Dashboard() {
  const navigate = useNavigate();

  const [scheduleNames, setScheduleNames] = useState([]);
  const [totalMembers,  setTotalMembers]  = useState(0);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [schRes, memRes] = await Promise.all([
          getScheduleNames(),
          getMembers(),
        ]);
        setScheduleNames(schRes.data);
        setTotalMembers(memRes.data.filter((m) => m.isActive).length);
      } catch {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Aggregate counts across all schedules
  const totalAssignments = scheduleNames.reduce((sum, s) => sum + (s.totalEntries ?? 0), 0);
  const serviceTypeSets  = scheduleNames.reduce(
    (acc, s) => { (s.serviceTypes ?? []).forEach((t) => acc.add(t)); return acc; },
    new Set()
  );

  const openSchedule = (meta) => {
    navigate('/schedule', { state: { scheduleToOpen: meta } });
  };

  return (
    <div className="page">

      {/* ── Daystar branded hero banner ────────────────────────────────── */}
      <div className="dash-hero">
        <img
          src="https://admin.daystar.online.synccentre.com/uploads/images/system/2025-07/daystar-logo.png"
          alt="Daystar Christian Centre"
          className="dash-hero-logo"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <div className="dash-hero-text">
          <h2 className="dash-hero-title">Daystar Christian Centre</h2>
          <p className="dash-hero-sub">Service Unit Scheduler · <span>Contact Team</span></p>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────────── */}
      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-value">{totalMembers}</span>
          <span className="stat-label">Active Members</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{scheduleNames.length}</span>
          <span className="stat-label">Schedules</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{totalAssignments}</span>
          <span className="stat-label">Total Assignments</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{serviceTypeSets.size}</span>
          <span className="stat-label">Service Types Covered</span>
        </div>
      </div>

      {/* ── Schedule List ───────────────────────────────────────────────── */}
      <p className="section-title">Schedule List</p>

      {loading ? (
        <p className="loading">Loading…</p>
      ) : scheduleNames.length === 0 ? (
        <div className="dash-empty">
          <span className="dash-empty-icon">📅</span>
          <p>No schedules yet. Head to <strong>Schedules</strong> to create one.</p>
        </div>
      ) : (
        <div className="dash-sched-list">
          {scheduleNames.map((s, idx) => (
            <button
              key={s.scheduleName}
              className="dash-sched-row"
              onClick={() => openSchedule(s)}
            >
              <span className="dash-sched-num">{idx + 1}</span>
              <span className="dash-sched-name">{s.scheduleName}</span>
              <span className="dash-sched-dates">
                {dayjs(s.minDate).format('D MMM YYYY')} – {dayjs(s.maxDate).format('D MMM YYYY')}
              </span>
              <span className="dash-sched-types">
                {(s.serviceTypes ?? []).map((t) => (
                  <span key={t} className={`slot-pill ${SVC_TYPE_COLORS[t]}`}>
                    {SVC_TYPE_LABELS[t]}
                  </span>
                ))}
              </span>
              <span className="dash-sched-count">
                {s.totalEntries} assignment{s.totalEntries !== 1 ? 's' : ''}
              </span>
              <span className="dash-sched-arrow">→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

