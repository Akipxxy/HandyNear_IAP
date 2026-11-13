import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../auth';
import { apiFetch } from '../helpers';

const box = { maxWidth: '420px', margin: '40px auto', padding: '24px', border: '1px solid #ddd', borderRadius: '8px', fontFamily: 'sans-serif' };
const input = { padding: '10px', width: '100%', boxSizing: 'border-box', marginBottom: '12px' };
const button = { padding: '10px 18px', cursor: 'pointer', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', width: '100%' };

// Customer login and sign-up
function Login() {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state && location.state.from) || '/account';

  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (session && session.role === 'customer') return <Navigate to="/account" replace />;

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body =
        mode === 'login'
          ? { email: form.email, password: form.password }
          : { name: form.name, phone: form.phone, email: form.email, password: form.password };
      const data = await apiFetch(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      login({ token: data.token, role: 'customer', customer: data.customer });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.status === 0 ? 'Cannot reach the server. Is the API running?' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Navbar />
      <div style={box}>
        <h2 style={{ marginTop: 0 }}>{mode === 'login' ? 'Log in' : 'Create an account'}</h2>
        <form onSubmit={submit}>
          {mode === 'register' && (
            <>
              <input style={input} name="name" placeholder="Full name" value={form.name} onChange={change} required maxLength={100} />
              <input style={input} name="phone" type="tel" placeholder="Phone (e.g. +254712345678)" value={form.phone} onChange={change} required maxLength={20} />
            </>
          )}
          <input style={input} name="email" type="email" placeholder="Email" value={form.email} onChange={change} required autoComplete="email" />
          <input
            style={input}
            name="password"
            type="password"
            placeholder={mode === 'register' ? 'Password (8 characters or more)' : 'Password'}
            value={form.password}
            onChange={change}
            required
            minLength={mode === 'register' ? 8 : undefined}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />
          {error && <p style={{ color: '#b00', margin: '0 0 12px' }}>{error}</p>}
          <button type="submit" disabled={busy} style={{ ...button, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>
        <p style={{ marginBottom: 0 }}>
          {mode === 'login' ? 'New here? ' : 'Already have an account? '}
          <a
            href="/login"
            onClick={(e) => {
              e.preventDefault();
              setError('');
              setMode(mode === 'login' ? 'register' : 'login');
            }}
          >
            {mode === 'login' ? 'Create an account' : 'Log in'}
          </a>
        </p>
      </div>
    </>
  );
}

export default Login;
