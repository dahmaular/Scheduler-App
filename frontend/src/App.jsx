import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Schedule from './pages/Schedule';
import Login from './pages/Login';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected — all other routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Navbar />
                <main>
                  <Routes>
                    <Route path="/"        element={<Dashboard />} />
                    <Route path="/members" element={<Members />} />
                    <Route path="/schedule" element={<Schedule />} />
                    <Route path="*"        element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
