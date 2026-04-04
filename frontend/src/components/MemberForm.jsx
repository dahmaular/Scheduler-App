import { useState } from 'react';
import './MemberForm.css';

const emptyForm = { name: '', phone: '', email: '' };

export default function MemberForm({ onSubmit, initial = null, onCancel }) {
  const [form, setForm] = useState(initial || emptyForm);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
    if (!initial) setForm(emptyForm);
  };

  return (
    <form className="member-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label>Name *</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Full name"
            required
          />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Phone number"
          />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email address"
            type="email"
          />
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          {initial ? 'Update Member' : 'Add Member'}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
