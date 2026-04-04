import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <img
          src="https://admin.daystar.online.synccentre.com/uploads/images/system/2025-07/daystar-logo.png"
          alt="Daystar Christian Centre"
          className="navbar-logo"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextSibling.style.display = 'flex';
          }}
        />
        <div className="navbar-brand-fallback" style={{ display: 'none' }}>
          <span className="navbar-title">Daystar</span>
        </div>
        <div className="navbar-brand-text">
          <span className="navbar-title">Unit Service Planner</span>
          <span className="navbar-subtitle">Daystar Online Church</span>
        </div>
      </div>
      <ul className="navbar-links">
        <li>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink to="/members" className={({ isActive }) => (isActive ? 'active' : '')}>
            Members
          </NavLink>
        </li>
        <li>
          <NavLink to="/schedule" className={({ isActive }) => (isActive ? 'active' : '')}>
            Schedule
          </NavLink>
        </li>
      </ul>
      <div className="navbar-user">
        {user && <span className="navbar-user-name">{user.name}</span>}
        <button className="navbar-logout" onClick={handleLogout} title="Sign out">
          Sign Out
        </button>
      </div>
    </nav>
  );
}
