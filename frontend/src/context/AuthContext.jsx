import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ds_token'));
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('ds_user')); }
    catch { return null; }
  });

  const login = useCallback((tokenValue, userData) => {
    localStorage.setItem('ds_token', tokenValue);
    localStorage.setItem('ds_user',  JSON.stringify(userData));
    setToken(tokenValue);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ds_token');
    localStorage.removeItem('ds_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuth: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
