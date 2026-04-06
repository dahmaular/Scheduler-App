import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import CalendarView from '../components/CalendarView';
import {
  getSchedules,
  getScheduleNames,
  getSlots,
  createSchedule,
  deleteSchedule,
  deleteScheduleName,
  autoGenerate,
} from '../api/schedules';
import { getMembers } from '../api/members';
import './Schedule.css';

const SERVICE_TYPES = ['A', 'B', 'C'];
const SERVICE_LABELS = {
  A: 'A – First & Second Service (Sunday)',
  B: 'B – Third Service (Sunday)',
  C: 'C – Midweek Service (Wednesdays)',
};
const SVC_TYPE_COLORS = { A: 'pill-a', B: 'pill-b', C: 'pill-c' };

function nextMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST VIEW
// ─────────────────────────────────────────────────────────────────────────────
function ScheduleListView({ onOpen, onNew }) {
  const [nameList, setNameList] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const loadNames = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getScheduleNames();
      setNameList(res.data);
    } catch {
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNames(); }, [loadNames]);

  const handleDelete = async (name, e) => {
    e.stopPropagation();
    if (!confirm(`Delete all entries for "${name}"?`)) return;
    try {
      await deleteScheduleName(name);
      toast.success('Schedule deleted');
      loadNames();
    } catch {
      toast.error('Failed to delete schedule');
    }
  };

  return (
    <div className="page schedule-page">
      <div className="page-header">
        <h1>Schedules</h1>
        <div className="schedule-controls">
          <button className="btn btn-primary" onClick={onNew}>New Schedule</button>
        </div>
      </div>

      {loading ? (
        <p className="loading">Loading…</p>
      ) : nameList.length === 0 ? (
        <div className="sched-empty">
          <div className="sched-empty-icon">📅</div>
          <p>No schedules yet. Click <strong>New Schedule</strong> to generate one.</p>
        </div>
      ) : (
        <div className="sched-list">
          {nameList.map((s) => (
            <div
              key={s.scheduleName}
              className="sched-card"
              onClick={() => onOpen(s)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onOpen(s)}
            >
              <div className="sched-card-main">
                <div className="sched-card-name">{s.scheduleName}</div>
                <div className="sched-card-meta">
                  <span className="sched-card-dates">
                    {dayjs(s.minDate).format('D MMM YYYY')} – {dayjs(s.maxDate).format('D MMM YYYY')}
                  </span>
                  <span className="sched-card-count">
                    {s.totalEntries} assignment{s.totalEntries !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="sched-card-types">
                  {s.serviceTypes.map((t) => (
                    <span key={t} className={`slot-pill ${SVC_TYPE_COLORS[t]}`} style={{ fontSize: '0.72rem', padding: '0.15rem 0.55rem' }}>
                      {t === 'A' ? '1st & 2nd' : t === 'B' ? '3rd Service' : 'Midweek'}
                    </span>
                  ))}
                </div>
              </div>
              <div className="sched-card-actions">
                <button
                  className="btn-sched-open"
                  onClick={(e) => { e.stopPropagation(); onOpen(s); }}
                  tabIndex={-1}
                >
                  View
                </button>
                <button
                  className="btn-sched-delete"
                  title="Delete schedule"
                  onClick={(e) => handleDelete(s.scheduleName, e)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL VIEW
// ─────────────────────────────────────────────────────────────────────────────
function ScheduleDetailView({ scheduleMeta, onBack, onDeleted }) {
  const [schedules, setSchedules] = useState([]);
  const [loading,   setLoading]   = useState(true);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSchedules({ scheduleName: scheduleMeta.scheduleName });
      setSchedules(res.data);
    } catch {
      toast.error('Failed to load entries');
    } finally {
      setLoading(false);
    }
  }, [scheduleMeta.scheduleName]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleDeleteEntry = async (id) => {
    if (!confirm('Remove this entry?')) return;
    try {
      await deleteSchedule(id);
      toast.success('Entry removed');
      fetchEntries();
    } catch {
      toast.error('Failed to remove entry');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Delete all entries for "${scheduleMeta.scheduleName}"?`)) return;
    try {
      await deleteScheduleName(scheduleMeta.scheduleName);
      toast.success('Schedule deleted');
      onDeleted();
    } catch {
      toast.error('Failed to delete schedule');
    }
  };

  const handleExportCSV = async () => {
    if (!schedules.length) { toast.error('No data to export'); return; }
    const { exportCSV } = await import('../utils/exportUtils');
    exportCSV(schedules, scheduleMeta.scheduleName.replace(/\s+/g, '-'));
    toast.success('CSV downloaded');
  };

  const handleExportPDF = async () => {
    if (!schedules.length) { toast.error('No data to export'); return; }
    const { exportPDF } = await import('../utils/exportUtils');
    exportPDF(schedules, scheduleMeta.scheduleName.replace(/\s+/g, '-'), scheduleMeta.scheduleName);
    toast.success('PDF downloaded');
  };

  const handleExportICS = async () => {
    if (!schedules.length) { toast.error('No data to export'); return; }
    const { exportICS } = await import('../utils/exportUtils');
    exportICS(schedules, scheduleMeta.scheduleName.replace(/\s+/g, '-'), scheduleMeta.scheduleName);
    toast.success('Calendar file (.ics) downloaded');
  };

  return (
    <div className="page schedule-page">
      <div className="page-header">
        <div className="sched-detail-title">
          <button className="btn-back" onClick={onBack}>Back</button>
          <h1>{scheduleMeta.scheduleName}</h1>
        </div>
        <div className="schedule-controls">
          <div className="export-group">
            <button className="btn btn-export" onClick={handleExportCSV}>⬇ CSV</button>
            <button className="btn btn-export" onClick={handleExportPDF}>⬇ PDF</button>
            <button className="btn btn-export btn-export-ics" onClick={handleExportICS} title="Export to Google / Outlook / Apple Calendar">⬇ Calendar (.ics)</button>
          </div>
          <button className="btn btn-danger" onClick={handleDeleteAll}>Delete</button>
        </div>
      </div>

      <div className="slot-summary">
        <span className="slot-period">📅 {dayjs(scheduleMeta.minDate).format('D MMM YYYY')} – {dayjs(scheduleMeta.maxDate).format('D MMM YYYY')}</span>
        <span className="slot-pill pill-total"><strong>{scheduleMeta.totalEntries}</strong> assignments</span>
        {scheduleMeta.serviceTypes.map((t) => (
          <span key={t} className={`slot-pill ${SVC_TYPE_COLORS[t]}`}>
            {t === 'A' ? '1st & 2nd' : t === 'B' ? '3rd Service' : 'Midweek'}
          </span>
        ))}
      </div>

      {loading ? (
        <p className="loading">Loading…</p>
      ) : (
        <div className="schedule-card">
          <CalendarView schedules={schedules} onDelete={handleDeleteEntry} scheduleName={scheduleMeta.scheduleName} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW SCHEDULE VIEW
// ─────────────────────────────────────────────────────────────────────────────
function NewScheduleView({ onBack, onCreated }) {
  const curMonth = dayjs().format('YYYY-MM');
  const [startMonth, setStartMonth] = useState(curMonth);
  const [endMonth,   setEndMonth]   = useState(nextMonth(curMonth));
  const [members,    setMembers]    = useState([]);
  const [slots,      setSlots]      = useState(null);
  const [generating, setGenerating] = useState(false);
  const [autoName,   setAutoName]   = useState('');
  const [overwrite,  setOverwrite]  = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ member: '', serviceType: 'A', date: '', notes: '', scheduleName: '' });

  useEffect(() => { if (endMonth < startMonth) setEndMonth(startMonth); }, [startMonth, endMonth]);

  useEffect(() => {
    getMembers().then((res) => setMembers(res.data.filter((m) => m.isActive))).catch(() => {});
  }, []);

  useEffect(() => {
    getSlots(startMonth, endMonth).then((res) => setSlots(res.data)).catch(() => setSlots(null));
  }, [startMonth, endMonth]);

  const periodLabel = startMonth === endMonth
    ? dayjs(startMonth).format('MMMM YYYY')
    : `${dayjs(startMonth).format('MMM YYYY')} – ${dayjs(endMonth).format('MMM YYYY')}`;

  const handleAutoGenerate = async (e) => {
    e.preventDefault();
    if (!autoName.trim()) { toast.error('Please enter a schedule name'); return; }
    setGenerating(true);
    try {
      const res = await autoGenerate({ scheduleName: autoName, startMonth, endMonth, overwrite });
      const { created, totalServiceDays, skipped } = res.data;
      toast.success(`Generated! ${created} assignments across ${totalServiceDays} service days.`);
      if (skipped > 0) toast(`${skipped} slot(s) skipped (duplicates).`, { icon: 'ℹ️' });
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Auto-generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      await createSchedule(manualForm);
      toast.success('Entry added');
      setManualForm({ member: '', serviceType: 'A', date: '', notes: '', scheduleName: '' });
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add entry');
    }
  };

  return (
    <div className="page schedule-page">
      <div className="page-header">
        <div className="sched-detail-title">
          <button className="btn-back" onClick={onBack}>← Back</button>
          <h1>New Schedule</h1>
        </div>
      </div>

      <div className="panel">
        <h3>Select Period</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="month-picker">
            <label>From</label>
            <input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} />
          </div>
          <div className="month-picker">
            <label>To</label>
            <input type="month" value={endMonth} min={startMonth} onChange={(e) => setEndMonth(e.target.value)} />
          </div>
        </div>
        {slots && (
          <div className="slot-summary" style={{ marginTop: '1rem', marginBottom: 0 }}>
            <span className="slot-period">📅 {periodLabel}</span>
            <span className="slot-pill pill-a"><strong>{slots.byType.A}</strong> 1st&2nd Sundays</span>
            <span className="slot-pill pill-b"><strong>{slots.byType.B}</strong> 3rd-Service Sundays</span>
            <span className="slot-pill pill-c"><strong>{slots.byType.C}</strong> Wednesdays</span>
            <span className="slot-pill pill-total"><strong>{slots.totalSlots}</strong> total assignments</span>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>✨ Auto-Generate</h3>
        <p className="panel-hint">Randomly assigns <strong>3 members</strong> to every Sunday (1st&2nd + 3rd service) and every Wednesday in the period.</p>
        <form onSubmit={handleAutoGenerate} className="auto-form">
          <div className="form-group" style={{ maxWidth: 420 }}>
            <label>Schedule Name *</label>
            <input type="text" value={autoName} onChange={(e) => setAutoName(e.target.value)} placeholder="e.g. April–May 2026 Rota" required />
          </div>
          <label className="checkbox-label">
            <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
            Overwrite existing entries for this period
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={generating}>{generating ? 'Generating…' : 'Generate Now'}</button>
            <button type="button" className="btn btn-secondary" onClick={onBack}>Cancel</button>
          </div>
        </form>
      </div>

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>+ Add Entry Manually</h3>
          <button className="btn btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => setShowManual(!showManual)}>{showManual ? 'Hide' : 'Show'}</button>
        </div>
        {showManual && (
          <form onSubmit={handleManualSubmit} className="manual-form" style={{ marginTop: '1rem' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Schedule Name</label>
                <input type="text" value={manualForm.scheduleName} onChange={(e) => setManualForm({ ...manualForm, scheduleName: e.target.value })} placeholder="e.g. April Rota" />
              </div>
              <div className="form-group">
                <label>Member *</label>
                <select value={manualForm.member} onChange={(e) => setManualForm({ ...manualForm, member: e.target.value })} required>
                  <option value="">Select member…</option>
                  {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Service Type *</label>
                <select value={manualForm.serviceType} onChange={(e) => setManualForm({ ...manualForm, serviceType: e.target.value })}>
                  {SERVICE_TYPES.map((t) => <option key={t} value={t}>{SERVICE_LABELS[t]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Date *</label>
                <input type="date" value={manualForm.date} onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input type="text" value={manualForm.notes} onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })} placeholder="Optional" />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Add Entry</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT — controls which view is shown
// ─────────────────────────────────────────────────────────────────────────────
export default function Schedule() {
  const location = useLocation();
  const [view,         setView]         = useState('list');
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [listKey,      setListKey]      = useState(0);

  // If Dashboard navigated here with a schedule to open, jump straight to detail
  useEffect(() => {
    const incoming = location.state?.scheduleToOpen;
    if (incoming) {
      setSelectedMeta(incoming);
      setView('detail');
      // Clear the state so a back-navigation doesn't re-open it
      window.history.replaceState({}, '');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = (meta) => { setSelectedMeta(meta); setView('detail'); };
  const goList     = ()     => { setView('list'); setListKey((k) => k + 1); };

  if (view === 'new')    return <NewScheduleView    onBack={goList} onCreated={goList} />;
  if (view === 'detail') return <ScheduleDetailView scheduleMeta={selectedMeta} onBack={goList} onDeleted={goList} />;
  return <ScheduleListView key={listKey} onOpen={openDetail} onNew={() => setView('new')} />;
}
