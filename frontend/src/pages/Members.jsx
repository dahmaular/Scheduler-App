import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import MemberForm from '../components/MemberForm';
import { getMembers, createMember, updateMember, deleteMember, bulkUpload } from '../api/members';
import './Members.css';

// ── CSV template the user can download ───────────────────────────────────────
const CSV_TEMPLATE = `name,email,phone,isActive
John Doe,john@example.com,08012345678,true
Jane Smith,jane@example.com,08098765432,true`;

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'members_template.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ── Bulk-upload panel ─────────────────────────────────────────────────────────
function BulkUploadPanel({ onDone }) {
  const [dragOver,  setDragOver]  = useState(false);
  const [csvText,   setCsvText]   = useState('');
  const [preview,   setPreview]   = useState(null);  // parsed rows for preview
  const [uploading, setUploading] = useState(false);
  const [result,    setResult]    = useState(null);
  const fileRef = useRef();

  // Parse CSV into { headers, rows } for preview
  const parseForPreview = (text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return null;
    const split  = (l) => l.split(',').map((f) => f.replace(/^"|"$/g, '').trim());
    const headers = split(lines[0]);
    const rows    = lines.slice(1).map(split);
    return { headers, rows };
  };

  const handleFile = (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      toast.error('Please select a .csv file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setCsvText(text);
      setPreview(parseForPreview(text));
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!csvText) { toast.error('No file selected'); return; }
    setUploading(true);
    try {
      const { data } = await bulkUpload(csvText);
      setResult(data);
      const { inserted, updated, skipped } = data;
      toast.success(`Done! ${inserted} added, ${updated} updated${skipped ? `, ${skipped} skipped` : ''}`);
      setCsvText(''); setPreview(null);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => { setCsvText(''); setPreview(null); setResult(null); if (fileRef.current) fileRef.current.value = ''; };

  return (
    <div className="bulk-panel">
      <div className="bulk-panel-header">
        <span className="bulk-panel-title">📥 Bulk Upload Members</span>
        <button className="btn-template" onClick={downloadTemplate}>⬇ Download Template</button>
      </div>

      {/* Drop zone */}
      {!preview && (
        <div
          className={`bulk-dropzone${dragOver ? ' dragover' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current.click()}
        >
          <span className="bulk-dropzone-icon">📂</span>
          <p>Drag &amp; drop a <strong>.csv</strong> file here, or <span className="bulk-link">browse</span></p>
          <p className="bulk-hint">Columns: <code>name</code>, <code>email</code>, <code>phone</code>, <code>isActive</code> — only <code>name</code> is required</p>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])} />
        </div>
      )}

      {/* Preview table */}
      {preview && (
        <>
          <div className="bulk-preview-header">
            <span className="bulk-preview-count">{preview.rows.length} row{preview.rows.length !== 1 ? 's' : ''} detected</span>
            <button className="btn-clear" onClick={handleClear}>✕ Clear</button>
          </div>
          <div className="bulk-preview-wrap">
            <table className="bulk-preview-table">
              <thead>
                <tr>{preview.headers.map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 8).map((row, i) => (
                  <tr key={i}>{row.map((cell, j) => <td key={j}>{cell || '—'}</td>)}</tr>
                ))}
                {preview.rows.length > 8 && (
                  <tr><td colSpan={preview.headers.length} className="bulk-preview-more">
                    … and {preview.rows.length - 8} more row{preview.rows.length - 8 !== 1 ? 's' : ''}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <button className="btn btn-primary bulk-upload-btn" onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading…' : `Upload ${preview.rows.length} Member${preview.rows.length !== 1 ? 's' : ''}`}
          </button>
        </>
      )}

      {/* Result summary */}
      {result && (
        <div className="bulk-result">
          <span className="bulk-result-item ok">✓ {result.inserted} inserted</span>
          <span className="bulk-result-item info">↺ {result.updated} updated</span>
          {result.skipped > 0 && <span className="bulk-result-item warn">⚠ {result.skipped} skipped</span>}
          {result.errors?.length > 0 && (
            <details className="bulk-errors">
              <summary>{result.errors.length} error{result.errors.length !== 1 ? 's' : ''}</summary>
              <ul>{result.errors.map((e, i) => <li key={i}>Row {e.row}{e.name ? ` (${e.name})` : ''}: {e.reason}</li>)}</ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default function Members() {
  const [members,    setMembers]    = useState([]);
  const [editing,    setEditing]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [showBulk,   setShowBulk]   = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await getMembers();
      setMembers(res.data);
    } catch {
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleCreate = async (form) => {
    try {
      await createMember(form);
      toast.success('Member added');
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    }
  };

  const handleUpdate = async (form) => {
    try {
      await updateMember(editing._id, form);
      toast.success('Member updated');
      setEditing(null);
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update member');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this member?')) return;
    try {
      await deleteMember(id);
      toast.success('Member removed');
      fetchMembers();
    } catch {
      toast.error('Failed to delete member');
    }
  };

  const handleToggleActive = async (member) => {
    try {
      await updateMember(member._id, { isActive: !member.isActive });
      toast.success(`Member ${member.isActive ? 'deactivated' : 'activated'}`);
      fetchMembers();
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="page members-page">
      <div className="page-header">
        <h1>Members</h1>
        <div className="members-header-actions">
          <span className="member-count">{members.length} member{members.length !== 1 ? 's' : ''}</span>
          <button
            className={`btn ${showBulk ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => { setShowBulk((v) => !v); setEditing(null); }}
          >
            {showBulk ? '✕ Close Bulk Upload' : '📥 Bulk Upload'}
          </button>
        </div>
      </div>

      {/* Bulk upload panel */}
      {showBulk && (
        <BulkUploadPanel onDone={() => { fetchMembers(); }} />
      )}

      {/* Add Form */}
      {!editing && !showBulk && (
        <MemberForm onSubmit={handleCreate} />
      )}

      {/* Edit Form */}
      {editing && (
        <MemberForm
          initial={editing}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Table */}
      {loading ? (
        <p className="loading">Loading…</p>
      ) : (
        <div className="members-table-wrapper">
          <table className="members-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, idx) => (
                <tr key={m._id} className={m.isActive ? '' : 'inactive-row'}>
                  <td>{idx + 1}</td>
                  <td>{m.name}</td>
                  <td>{m.phone || '—'}</td>
                  <td>{m.email || '—'}</td>
                  <td>
                    <span className={`status-badge ${m.isActive ? 'complete' : 'pending'}`}>
                      {m.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button className="btn btn-secondary" onClick={() => setEditing(m)}>
                      Edit
                    </button>
                    <button
                      className={`btn ${m.isActive ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => handleToggleActive(m)}
                    >
                      {m.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDelete(m._id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af' }}>
                    No members yet. Add one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
