import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

// The session lives in sessionStorage: closing the tab logs you out.
const KEY = 'handynear_session';

function load() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY));
  } catch {
    return null;
  }
}
function save(session) {
  try {
    if (session) sessionStorage.setItem(KEY, JSON.stringify(session));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* storage blocked: the session just will not survive a page reload */
  }
}

let memorySession = null; // fallback if storage is blocked

export function getToken() {
  const s = load() || memorySession;
  return s ? s.token : null;
}

// Called by apiFetch when the server says the token is invalid or expired.
export function clearSession() {
  memorySession = null;
  save(null);
  window.dispatchEvent(new Event('handynear-logout'));
}

const AuthContext = createContext({ session: null, login: () => {}, logout: () => {} });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => load());

  const login = useCallback((s) => {
    memorySession = s;
    save(s);
    setSession(s);
  }, []);
  const logout = useCallback(() => {
    memorySession = null;
    save(null);
    setSession(null);
  }, []);

  useEffect(() => {
    const onLogout = () => setSession(null);
    window.addEventListener('handynear-logout', onLogout);
    return () => window.removeEventListener('handynear-logout', onLogout);
  }, []);

  return <AuthContext.Provider value={{ session, login, logout }}>{children}</AuthContext.Provider>;
}

// Wrap a page: only the given role gets in, everyone else is sent to the right login page.
export function RequireRole({ role, children }) {
  const { session } = useAuth();
  const location = useLocation();
  if (!session || session.role !== role) {
    return <Navigate to={role === 'admin' ? '/admin/login' : '/login'} state={{ from: location.pathname }} replace />;
  }
  return children;
}
