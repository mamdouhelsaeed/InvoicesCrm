import { createContext, useContext, useEffect, useState } from 'react';
import api from './api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('ledgerly_token'));

  useEffect(() => {
    if (!localStorage.getItem('ledgerly_token')) return;
    api
      .get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => localStorage.removeItem('ledgerly_token'))
      .finally(() => setLoading(false));
  }, []);

  const finish = ({ token, user }) => {
    localStorage.setItem('ledgerly_token', token);
    setUser(user);
  };

  const login = async (email, password) => finish((await api.post('/auth/login', { email, password })).data);
  const register = async (payload) => finish((await api.post('/auth/register', payload)).data);
  const logout = () => {
    localStorage.removeItem('ledgerly_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
