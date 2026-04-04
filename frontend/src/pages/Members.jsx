import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import MemberForm from '../components/MemberForm';
import { getMembers, createMember, updateMember, deleteMember } from '../api/members';
import './Members.css';

export default function Members() {
  const [members, setMembers] = useState([]);
  const [editing, setEditing] = useState(null); // member being edited
  const [loading, setLoading] = useState(false);

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
        <span className="member-count">{members.length} member{members.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Add Form */}
      {!editing && (
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
