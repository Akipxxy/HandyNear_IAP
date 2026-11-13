import { useCallback, useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../auth';
import { apiFetch, formatKes, newIdempotencyKey, walletMessage } from '../helpers';

const inputStyle = { padding: '8px' };
const primaryButton = { padding: '8px 18px', cursor: 'pointer', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px' };
const panelStyle = { border: '1px solid #ddd', borderRadius: '6px', padding: '12px 16px', margin: '16px 0', background: '#fafafa' };
const pill = (bg) => ({ padding: '4px 8px', borderRadius: '4px', color: '#fff', backgroundColor: bg, fontWeight: 'bold', fontSize: '12px' });
const statusColor = (s) => (s === 'completed' ? '#28a745' : s === 'confirmed' ? '#0066cc' : s === 'pending' ? '#ffc107' : '#dc3545');

const emptyForm = { handymanId: '', serviceDescription: '', scheduledTime: '', durationHours: '1' };

// The customer's own area: wallet balance, top-up, book a handyman, own bookings.
function Account() {
  const { session } = useAuth();
  const customer = session.customer;

  const [handymen, setHandymen] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loadError, setLoadError] = useState('');

  const [balanceCents, setBalanceCents] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [walletError, setWalletError] = useState('');
  const [walletLoading, setWalletLoading] = useState(true);
  const [topupKes, setTopupKes] = useState('');
  const [topupMessage, setTopupMessage] = useState('');
  const [toppingUp, setToppingUp] = useState(false);
  const walletRequest = useRef(0);

  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadWallet = useCallback(async () => {
    walletRequest.current += 1;
    const requestId = walletRequest.current;
    // Money must never be shown stale: clear before every refresh.
    setBalanceCents(null);
    setTransactions([]);
    setWalletError('');
    setWalletLoading(true);
    try {
      const [wallet, txs] = await Promise.all([
        apiFetch(`/api/customers/${customer.id}/wallet`),
        apiFetch(`/api/customers/${customer.id}/wallet/transactions`),
      ]);
      if (requestId !== walletRequest.current) return;
      setBalanceCents(wallet.balanceCents);
      setTransactions(Array.isArray(txs) ? txs : []);
    } catch (err) {
      if (requestId !== walletRequest.current) return;
      setWalletError(
        err.status === 404
          ? 'You do not have a wallet yet. MoneyMentor has to set one up for your account.'
          : walletMessage(err)
      );
    } finally {
      if (requestId === walletRequest.current) setWalletLoading(false);
    }
  }, [customer.id]);

  const loadBookings = useCallback(async () => {
    try {
      setBookings(await apiFetch('/api/bookings/mine'));
    } catch (err) {
      setLoadError(err.status === 0 ? 'Cannot reach the server.' : err.message);
    }
  }, []);

  useEffect(() => {
    apiFetch('/api/handymen')
      .then(setHandymen)
      .catch((err) => setLoadError(err.status === 0 ? 'Cannot reach the server.' : err.message));
    loadBookings();
    loadWallet();
  }, [loadBookings, loadWallet]);

  const handleTopUp = async (e) => {
    e.preventDefault();
    setTopupMessage('');
    setWalletError('');
    const text = topupKes.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(text) || Number(text) <= 0) {
      setWalletError('Enter a positive amount in KES with up to 2 decimals.');
      return;
    }
    const amountCents = Math.round(Number(text) * 100);
    if (amountCents < 1 || amountCents > 1000000000) {
      setWalletError('Amount must be between KES 0.01 and KES 10,000,000.00.');
      return;
    }
    setToppingUp(true);
    try {
      await apiFetch(`/api/customers/${customer.id}/wallet/topups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': newIdempotencyKey() },
        body: JSON.stringify({ amountCents }),
      });
      setTopupKes('');
      setTopupMessage(`Top-up of ${formatKes(amountCents)} successful.`);
      await loadWallet();
    } catch (err) {
      setWalletError(walletMessage(err));
    } finally {
      setToppingUp(false);
    }
  };

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleBook = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormMessage('');
    const durationHours = Number(form.durationHours);
    if (!Number.isFinite(durationHours) || durationHours < 0.5 || durationHours > 24) {
      setFormError('Duration must be between 0.5 and 24 hours.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        handymanId: Number(form.handymanId),
        customerName: customer.name,
        customerPhone: customer.phone,
        serviceDescription: form.serviceDescription,
        scheduledTime: new Date(form.scheduledTime).toISOString().replace(/\.\d{3}Z$/, 'Z'),
        durationHours,
      };
      if (customer.email) payload.customerEmail = customer.email;
      const created = await apiFetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setBookings((prev) => [created, ...prev]);
      setForm(emptyForm);
      setFormMessage(`Booking #${created.id} created. You will be charged ${formatKes(created.priceCents)} when the job is completed.`);
    } catch (err) {
      setFormError(err.status === 0 ? 'Cannot reach the server.' : err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handymanName = (id) => {
    const h = handymen.find((x) => x.id === id);
    return h ? h.name : `#${id}`;
  };

  const selected = handymen.find((h) => String(h.id) === form.handymanId);
  const hours = Number(form.durationHours);
  const estimatedCents =
    selected && Number.isFinite(hours) && hours > 0 ? Math.round(Number(selected.hourlyRate) * 100 * hours) : null;
  const lowBalance = estimatedCents !== null && balanceCents !== null && estimatedCents > balanceCents;

  return (
    <>
      <Navbar />
      <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ borderBottom: '2px solid #333', paddingBottom: '10px' }}>Welcome, {customer.name}</h1>
        {loadError && <p style={{ color: '#b00' }}>{loadError}</p>}

        {/* ---------- Wallet ---------- */}
        <div style={{ ...panelStyle, background: '#f4fbf5', borderColor: '#c9e8cf' }}>
          <h3 style={{ marginTop: 0 }}>My wallet</h3>
          <p style={{ fontSize: '12px', color: '#555', margin: '0 0 10px' }}>Simulated money. No real payments.</p>
          <p style={{ fontSize: '22px', margin: '0 0 10px' }}>
            Balance: <strong>{walletLoading ? 'Loading...' : balanceCents !== null ? formatKes(balanceCents) : '-'}</strong>
          </p>
          {walletError && <p style={{ color: '#b00', margin: '0 0 10px' }}>{walletError}</p>}
          {topupMessage && <p style={{ color: '#1e7e34', margin: '0 0 10px' }}>{topupMessage}</p>}

          <form onSubmit={handleTopUp} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <input type="number" min="0.01" step="0.01" placeholder="Amount in KES" value={topupKes}
              onChange={(e) => setTopupKes(e.target.value)} required style={inputStyle} />
            <button type="submit" disabled={toppingUp} style={primaryButton}>{toppingUp ? 'Sending...' : 'Top up'}</button>
          </form>

          <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%', background: '#fff' }}>
            <thead style={{ background: '#f0f0f0' }}>
              <tr><th>Date</th><th>Type</th><th>Amount</th><th>Balance after</th><th>Booking #</th></tr>
            </thead>
            <tbody>
              {transactions.length > 0 ? (
                transactions.map((t) => (
                  <tr key={t.id}>
                    <td>{new Date(t.createdAt).toLocaleString()}</td>
                    <td>{t.type}</td>
                    <td>{formatKes(t.amountCents)}</td>
                    <td>{formatKes(t.balanceAfterCents)}</td>
                    <td>{t.bookingId != null ? t.bookingId : '-'}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" style={{ textAlign: 'center' }}>{walletLoading ? 'Loading...' : walletError ? '-' : 'No transactions yet.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ---------- Book ---------- */}
        <h2>Book a handyman</h2>
        {formError && <p style={{ color: 'red' }}>{formError}</p>}
        {formMessage && <p style={{ color: '#1e7e34' }}>{formMessage}</p>}
        <form onSubmit={handleBook} style={{ marginBottom: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select name="handymanId" value={form.handymanId} onChange={change} required style={inputStyle}>
            <option value="">Select Handyman</option>
            {handymen.filter((h) => h.isAvailable).map((h) => (
              <option key={h.id} value={h.id}>{h.name} ({h.serviceCategory}) - KES {Number(h.hourlyRate).toLocaleString()}/hr</option>
            ))}
          </select>
          <input type="text" name="serviceDescription" placeholder="What needs fixing?" value={form.serviceDescription}
            onChange={change} required style={{ ...inputStyle, minWidth: '220px' }} />
          <input type="datetime-local" name="scheduledTime" value={form.scheduledTime} onChange={change} required style={inputStyle} />
          <label htmlFor="durationHours">Hours</label>
          <input id="durationHours" type="number" name="durationHours" min="0.5" max="24" step="0.5"
            value={form.durationHours} onChange={change} required style={{ ...inputStyle, width: '80px' }} />
          <button type="submit" disabled={submitting} style={{ ...primaryButton, opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Booking...' : 'Book now'}
          </button>
        </form>
        <p style={{ marginTop: 0, fontSize: '14px' }}>
          Estimated price: <strong>{estimatedCents !== null ? formatKes(estimatedCents) : '-'}</strong>. It is taken from your wallet
          automatically when the job is marked completed.
        </p>
        {lowBalance && (
          <p style={{ background: '#fff3cd', border: '1px solid #ffe69c', padding: '6px 10px', borderRadius: '4px' }}>
            Your wallet balance is lower than this price. Top up before the job is completed.
          </p>
        )}

        {/* ---------- My bookings ---------- */}
        <h2>My bookings</h2>
        <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead style={{ background: '#f0f0f0' }}>
            <tr><th>ID</th><th>Handyman</th><th>Service</th><th>Scheduled</th><th>Price</th><th>Status</th><th>Payment</th></tr>
          </thead>
          <tbody>
            {bookings.length > 0 ? (
              bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td>{handymanName(b.handymanId)}</td>
                  <td>{b.serviceDescription}</td>
                  <td>{new Date(b.scheduledTime).toLocaleString()}</td>
                  <td>{b.priceCents != null ? formatKes(b.priceCents) : '-'}</td>
                  <td><span style={pill(statusColor(b.status))}>{b.status}</span></td>
                  <td><span style={pill(b.paymentStatus === 'paid' ? '#28a745' : '#6c757d')}>{b.paymentStatus || 'unpaid'}</span></td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="7" style={{ textAlign: 'center' }}>You have no bookings yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default Account;
