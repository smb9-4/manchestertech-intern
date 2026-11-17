import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, getToken } from './api';
import { connectSocket, disconnectSocket } from './socket';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());
  const [toastMsg, setToastMsg] = useState('');

  const toast = useCallback((m) => { setToastMsg(m); clearTimeout(window.__t); window.__t = setTimeout(() => setToastMsg(''), 2600); }, []);

  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me').then((u) => { setUser(u); connectSocket(); }).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { token, user } = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(token); setUser(user); connectSocket();
    return user;
  };
  const logout = () => { setToken(null); disconnectSocket(); setUser(null); };
  const refreshMe = async () => setUser(await api('/auth/me'));

  const isAdmin = user && ['admin', 'superadmin'].includes(user.role);
  const isLeader = user?.role === 'leader';
  const isIntern = user?.role === 'intern';

  return (
    <Ctx.Provider value={{ user, loading, login, logout, refreshMe, toast, isAdmin, isLeader, isIntern }}>
      {children}
      <div className={'toast' + (toastMsg ? ' show' : '')}>{toastMsg}</div>
    </Ctx.Provider>
  );
}
