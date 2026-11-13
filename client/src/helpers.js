import { getToken, clearSession } from './auth';

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Money is stored as integer cents. Never show raw cents.
export const formatKes = (cents) => {
  const n = Number(cents);
  if (cents === null || cents === undefined || !Number.isFinite(n)) return '-';
  return (
    'KES ' +
    (n / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
};

// A fresh key per top-up click. Only letters, digits, - and _ are allowed by the API.
export const newIdempotencyKey = () => {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `k-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

// fetch wrapper: adds the login token, throws an Error with .status (0 = network failure) and .code
export async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    const netErr = new Error('Network error');
    netErr.status = 0;
    throw netErr;
  }
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    // A saved session that the server no longer accepts: log out everywhere
    if (res.status === 401 && token) clearSession();
    const err = new Error((body && (body.message || body.error)) || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = body && body.code;
    throw err;
  }
  return body;
}

export const walletMessage = (err) => {
  if (err.status === 0 || err.status === 502) {
    return 'MoneyMentor is not responding right now. Try again in a minute.';
  }
  if (err.status === 404) return 'No wallet found for this customer.';
  if (err.status === 403) return 'You can only use your own wallet.';
  return err.message; // 409 and 400: show the server's message
};

export const bookingActionMessage = (err) => {
  if (err.code === 'PAYMENT_FAILED') {
    return `Payment failed: ${String(err.message).replace(/\.$/, '')}. Top up the wallet and try again.`;
  }
  if (err.code === 'PAYMENT_NOT_READY') {
    return 'This booking is not registered with MoneyMentor yet, so it cannot be paid.';
  }
  if (err.status === 0 || err.status === 502) {
    return 'MoneyMentor is not responding. The booking was NOT changed. Try again.';
  }
  return err.message;
};
