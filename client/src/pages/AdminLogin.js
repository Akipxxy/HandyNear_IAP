import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../auth';
import { apiFetch } from '../helpers';

const box = { maxWidth: '380px', margin: '40px auto', padding: '24px', border: '1px solid #ddd', borderRadius: '8px', fontFamily: 'sans-serif' };
const input = { padding: '10px', width: '100%', boxSizing: 'border-box', marginBottom: '12px' };

// Admin login. This page is not linked anywhere on the public site.
function AdminLogin() {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (session && session.role === 'admin') return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await apiFetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      login({ token: data.token, role: 'admin' });
      navigate('/admin', { replace: true });
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
        <h2 style={{ marginTop: 0 }}>Admin login</h2>
        <form onSubmit={submit}>
          <input style={input} placeholder="Username" value={form.username} autoComplete="username"
            onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          <input style={input} type="password" placeholder="Password" value={form.password} autoComplete="current-password"
            onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          {error && <p style={{ color: '#b00', margin: '0 0 12px' }}>{error}</p>}
          <button type="submit" disabled={busy}
            style={{ padding: '10px 18px', cursor: 'pointer', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', width: '100%', opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Please wait...' : 'Log in'}
          </button>
        </form>
      </div>
    </>
  );
}

export default AdminLogin;
