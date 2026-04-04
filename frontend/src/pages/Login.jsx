import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.token, data.user);
      toast.success(`Welcome, ${data.user.name}!`);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        {/* ── Branding ── */}
        <div className="login-brand">
          <img
            src="https://admin.daystar.online.synccentre.com/uploads/images/system/2025-07/daystar-logo.png"
            alt="Daystar Christian Centre"
            className="login-logo"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <h1 className="login-org">Daystar Christian Centre</h1>
          <p className="login-app-name">Unit Service Planner</p>
        </div>

        {/* ── Form ── */}
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <p className="login-welcome">Sign in to your account</p>

          <div className="login-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="admin@daystar.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="login-footer">The Word Works Wonders</p>
      </div>
    </div>
  );
}
