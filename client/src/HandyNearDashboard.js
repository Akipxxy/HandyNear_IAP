import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const emptyForm = {
  handymanId: '',
  serviceDescription: '',
  scheduledTime: '',
  durationHours: '1',
};

const emptyNewCustomer = { name: '', phone: '', email: '' };

// ---------- helpers ----------

// Money is stored as integer cents. Never show raw cents.
const formatKes = (cents) => {
  const n = Number(cents);
  if (cents === null || cents === undefined || !Number.isFinite(n)) return '-';
  return (
    'KES ' +
    (n / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
};

// A fresh key per top-up click. Only letters, digits, - and _ are allowed by the API.
const newIdempotencyKey = () => {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `k-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

// fetch wrapper: throws an Error with .status (0 = network failure) and .code
async function apiFetch(path, options) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, options);
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
    const err = new Error((body && (body.message || body.error)) || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = body && body.code;
    throw err;
  }
  return body;
}

const walletMessage = (err) => {
  if (err.status === 0 || err.status === 502) {
    return 'MoneyMentor is not responding right now. Try again in a minute.';
  }
  if (err.status === 404) return 'No wallet found for this customer.';
  return err.message; // 409 and 400: show the server's message
};

const bookingActionMessage = (err) => {
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

const inputStyle = { padding: '8px' };
const primaryButton = {
  padding: '8px 18px',
  cursor: 'pointer',
  background: '#0066cc',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
};
const smallButton = {
  padding: '4px 10px',
  cursor: 'pointer',
  border: '1px solid #999',
  borderRadius: '4px',
  background: '#fff',
  marginRight: '6px',
  fontSize: '12px',
};
const pill = (bg) => ({
  padding: '4px 8px',
  borderRadius: '4px',
  color: '#fff',
  backgroundColor: bg,
  fontWeight: 'bold',
  fontSize: '12px',
});
const panelStyle = {
  border: '1px solid #ddd',
  borderRadius: '6px',
  padding: '12px 16px',
  margin: '16px 0',
  background: '#fafafa',
};

function HandyNearDashboard() {
  const [handymen, setHandymen] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Active customer
  const [customerIdInput, setCustomerIdInput] = useState('1');
  const [customer, setCustomer] = useState(null);
  const [customerError, setCustomerError] = useState('');
  const [customerLoading, setCustomerLoading] = useState(false);
  const [newCustomer, setNewCustomer] = useState(emptyNewCustomer);
  const [newCustomerError, setNewCustomerError] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // Wallet (kept separate so a partner failure never breaks the rest of the page)
  const [balanceCents, setBalanceCents] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [walletError, setWalletError] = useState('');
  const [walletLoading, setWalletLoading] = useState(false);
  const [topupKes, setTopupKes] = useState('');
  const [topupMessage, setTopupMessage] = useState('');
  const [toppingUp, setToppingUp] = useState(false);
  const walletRequest = useRef(0);

  // Booking row actions
  const [actionError, setActionError] = useState('');
  const [actingId, setActingId] = useState(null);

  // ---------- data loading ----------

  const loadWallet = useCallback(async (customerId) => {
    walletRequest.current += 1;
    const requestId = walletRequest.current;
    // Money must never be shown stale: clear before every refresh.
    setBalanceCents(null);
    setTransactions([]);
    setWalletError('');
    setWalletLoading(true);
    try {
      const [wallet, txs] = await Promise.all([
        apiFetch(`/api/customers/${customerId}/wallet`),
        apiFetch(`/api/customers/${customerId}/wallet/transactions`),
      ]);
      if (requestId !== walletRequest.current) return;
      setBalanceCents(wallet.balanceCents);
      setTransactions(Array.isArray(txs) ? txs : []);
    } catch (err) {
      if (requestId !== walletRequest.current) return;
      setWalletError(walletMessage(err));
    } finally {
      if (requestId === walletRequest.current) setWalletLoading(false);
    }
  }, []);

  const loadCustomer = useCallback(async (idText) => {
    const idNumber = Number(idText);
    if (!Number.isInteger(idNumber) || idNumber < 1) {
      setCustomer(null);
      setCustomerError('Customer ID must be a positive whole number.');
      return;
    }
    setCustomerLoading(true);
    setCustomerError('');
    try {
      const data = await apiFetch(`/api/customers/${idNumber}`);
      setCustomer(data);
    } catch (err) {
      setCustomer(null);
      setCustomerError(err.status === 0 ? 'Cannot reach the API.' : err.message);
    } finally {
      setCustomerLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([apiFetch('/api/handymen'), apiFetch('/api/bookings')])
      .then(([handymenData, bookingsData]) => {
        setHandymen(handymenData);
        setBookings(bookingsData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.status === 0 ? 'Failed to fetch' : err.message);
        setLoading(false);
      });
  }, []);

  // Start with customer 1 loaded so the wallet is visible straight away.
  useEffect(() => {
    loadCustomer('1');
  }, [loadCustomer]);

  // Whenever the active customer changes, reload their wallet (or clear it).
  useEffect(() => {
    if (customer) {
      loadWallet(customer.id);
    } else {
      walletRequest.current += 1;
      setBalanceCents(null);
      setTransactions([]);
      setWalletError('');
      setWalletLoading(false);
    }
  }, [customer, loadWallet]);

  // ---------- handlers ----------

  const handleLoadCustomer = (e) => {
    e.preventDefault();
    loadCustomer(customerIdInput);
  };

  const handleNewCustomerChange = (e) => {
    const { name, value } = e.target;
    setNewCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setNewCustomerError('');
    const name = newCustomer.name.trim();
    const phone = newCustomer.phone.trim();
    const email = newCustomer.email.trim();
    if (!name || !phone) {
      setNewCustomerError('Name and phone are required.');
      return;
    }
    const payload = { name, phone };
    if (email) payload.email = email;

    setCreatingCustomer(true);
    try {
      const created = await apiFetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setNewCustomer(emptyNewCustomer);
      setCustomerIdInput(String(created.id));
      setCustomerError('');
      setCustomer(created);
    } catch (err) {
      setNewCustomerError(err.status === 0 ? 'Cannot reach the API.' : err.message);
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleTopUp = async (e) => {
    e.preventDefault();
    if (!customer) return;
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
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': newIdempotencyKey(),
        },
        body: JSON.stringify({ amountCents }),
      });
      setTopupKes('');
      setTopupMessage(`Top-up of ${formatKes(amountCents)} successful.`);
      await loadWallet(customer.id);
    } catch (err) {
      setWalletError(walletMessage(err));
    } finally {
      setToppingUp(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!customer) {
      setFormError('Load a customer first.');
      return;
    }
    const durationHours = Number(formData.durationHours);
    if (!Number.isFinite(durationHours) || durationHours < 0.5 || durationHours > 24) {
      setFormError('Duration must be between 0.5 and 24 hours.');
      return;
    }
    setSubmitting(true);

    try {
      const payload = {
        handymanId: Number(formData.handymanId),
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        serviceDescription: formData.serviceDescription,
        scheduledTime: new Date(formData.scheduledTime).toISOString().replace(/\.\d{3}Z$/, 'Z'),
        durationHours,
      };
      if (customer.email) payload.customerEmail = customer.email;

      const newBooking = await apiFetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setBookings((prev) => [...prev, newBooking]);
      setFormData(emptyForm);
    } catch (err) {
      setFormError(err.message === 'Network error' ? 'Cannot reach the API.' : err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateBookingStatus = async (booking, status) => {
    setActionError('');
    setActingId(booking.id);
    try {
      const updated = await apiFetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      if (customer && updated.customerId === customer.id) {
        loadWallet(customer.id);
      }
    } catch (err) {
      setActionError(bookingActionMessage(err));
    } finally {
      setActingId(null);
    }
  };

  const handymanName = (id) => {
    const h = handymen.find((x) => x.id === id);
    return h ? h.name : `#${id}`;
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <p style={{ padding: '20px' }}>Loading HandyNear data...</p>
      </>
    );
  }
  if (error) {
    return (
      <>
        <Navbar />
        <p style={{ padding: '20px', color: 'red' }}>
          Error: {error}. Is the API running on {API_URL}?
        </p>
      </>
    );
  }

  const term = searchTerm.toLowerCase();
  const filteredHandymen = handymen.filter(
    (h) =>
      (h.name || '').toLowerCase().includes(term) ||
      (h.serviceCategory || '').toLowerCase().includes(term) ||
      (h.location || '').toLowerCase().includes(term)
  );

  const statusColor = (status) =>
    status === 'completed' ? '#28a745'
    : status === 'confirmed' ? '#0066cc'
    : status === 'pending' ? '#ffc107'
    : '#dc3545';

  const selectedHandyman = handymen.find((h) => String(h.id) === formData.handymanId);
  const durationValue = Number(formData.durationHours);
  const estimatedCents =
    selectedHandyman && Number.isFinite(durationValue) && durationValue > 0
      ? Math.round(Number(selectedHandyman.hourlyRate) * 100 * durationValue)
      : null;

  return (
    <>
      <Navbar />
      <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ borderBottom: '2px solid #333', paddingBottom: '10px' }}>
          HandyNear Dashboard
        </h1>

        {/* ---------- Active customer ---------- */}
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Active customer</h3>
          <form onSubmit={handleLoadCustomer} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <label htmlFor="customerId">Customer ID</label>
            <input
              id="customerId"
              type="number"
              min="1"
              step="1"
              value={customerIdInput}
              onChange={(e) => setCustomerIdInput(e.target.value)}
              style={{ ...inputStyle, width: '90px' }}
            />
            <button type="submit" disabled={customerLoading} style={primaryButton}>
              {customerLoading ? 'Loading...' : 'Load'}
            </button>
          </form>
          {customer && (
            <p style={{ margin: '10px 0 0' }}>
              <strong>{customer.name}</strong> ({customer.phone}
              {customer.email ? `, ${customer.email}` : ''}) - customer #{customer.id}
            </p>
          )}
          {customerError && <p style={{ color: '#b00', margin: '10px 0 0' }}>{customerError}</p>}

          <h4 style={{ marginBottom: '8px' }}>New customer</h4>
          <form onSubmit={handleCreateCustomer} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              name="name"
              placeholder="Name"
              value={newCustomer.name}
              onChange={handleNewCustomerChange}
              maxLength={100}
              style={inputStyle}
            />
            <input
              type="tel"
              name="phone"
              placeholder="Phone"
              value={newCustomer.phone}
              onChange={handleNewCustomerChange}
              maxLength={20}
              style={inputStyle}
            />
            <input
              type="email"
              name="email"
              placeholder="Email (optional)"
              value={newCustomer.email}
              onChange={handleNewCustomerChange}
              maxLength={100}
              style={inputStyle}
            />
            <button type="submit" disabled={creatingCustomer} style={primaryButton}>
              {creatingCustomer ? 'Creating...' : 'Create customer'}
            </button>
          </form>
          {newCustomerError && <p style={{ color: '#b00', margin: '8px 0 0' }}>{newCustomerError}</p>}
          <p style={{ fontSize: '12px', color: '#555', margin: '8px 0 0' }}>
            New customers have no wallet until MoneyMentor sets one up.
          </p>
        </div>

        {/* ---------- Wallet ---------- */}
        <div style={{ ...panelStyle, background: '#f4fbf5', borderColor: '#c9e8cf' }}>
          <h3 style={{ marginTop: 0 }}>Wallet</h3>
          <p style={{ fontSize: '12px', color: '#555', margin: '0 0 10px' }}>
            Simulated money. No real payments.
          </p>

          {!customer && <p style={{ margin: 0 }}>Load a customer to see their wallet.</p>}

          {customer && (
            <>
              <p style={{ fontSize: '18px', margin: '0 0 10px' }}>
                Balance:{' '}
                <strong>
                  {walletLoading ? 'Loading...' : balanceCents !== null ? formatKes(balanceCents) : '-'}
                </strong>
              </p>

              {walletError && <p style={{ color: '#b00', margin: '0 0 10px' }}>{walletError}</p>}
              {topupMessage && <p style={{ color: '#1e7e34', margin: '0 0 10px' }}>{topupMessage}</p>}

              <form onSubmit={handleTopUp} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Amount in KES"
                  value={topupKes}
                  onChange={(e) => setTopupKes(e.target.value)}
                  required
                  style={inputStyle}
                />
                <button type="submit" disabled={toppingUp} style={primaryButton}>
                  {toppingUp ? 'Sending...' : 'Top up'}
                </button>
              </form>

              <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%', background: '#fff' }}>
                <thead style={{ background: '#f0f0f0' }}>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Balance after</th>
                    <th>Booking #</th>
                  </tr>
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
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center' }}>
                        {walletLoading ? 'Loading...' : walletError ? '-' : 'No transactions yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* ---------- Create booking ---------- */}
        <h2>Create New Booking</h2>
        {formError && <p style={{ color: 'red' }}>{formError}</p>}
        <form
          onSubmit={handleSubmit}
          style={{ marginBottom: '36px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}
        >
          <select
            name="handymanId"
            value={formData.handymanId}
            onChange={handleInputChange}
            required
            style={inputStyle}
          >
            <option value="">Select Handyman</option>
            {handymen.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.serviceCategory})
              </option>
            ))}
          </select>

          <input
            type="text"
            name="serviceDescription"
            placeholder="What needs fixing?"
            value={formData.serviceDescription}
            onChange={handleInputChange}
            required
            style={{ ...inputStyle, minWidth: '220px' }}
          />

          <input
            type="datetime-local"
            name="scheduledTime"
            value={formData.scheduledTime}
            onChange={handleInputChange}
            required
            style={inputStyle}
          />

          <label htmlFor="durationHours">Hours</label>
          <input
            id="durationHours"
            type="number"
            name="durationHours"
            min="0.5"
            max="24"
            step="0.5"
            value={formData.durationHours}
            onChange={handleInputChange}
            required
            style={{ ...inputStyle, width: '80px' }}
          />

          <button
            type="submit"
            disabled={submitting || !customer}
            style={{ ...primaryButton, opacity: submitting || !customer ? 0.6 : 1 }}
          >
            {submitting ? 'Booking...' : 'Add Booking'}
          </button>

          <div style={{ width: '100%', fontSize: '14px' }}>
            Estimated price: <strong>{estimatedCents !== null ? formatKes(estimatedCents) : '-'}</strong>
            {customer ? ` for ${customer.name}` : ' (load a customer first)'}
          </div>
        </form>

        {/* ---------- Handymen ---------- */}
        <h2>Available Handymen</h2>
        <input
          type="text"
          placeholder="Filter by name, category, or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ marginBottom: '16px', padding: '8px', width: '320px', fontSize: '14px' }}
        />

        <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '40px' }}>
          <thead style={{ background: '#f0f0f0' }}>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Location</th>
              <th>Rating</th>
              <th>Rate (KES/hr)</th>
              <th>Available</th>
            </tr>
          </thead>
          <tbody>
            {filteredHandymen.length > 0 ? (
              filteredHandymen.map((h) => (
                <tr key={h.id}>
                  <td>{h.id}</td>
                  <td>{h.name}</td>
                  <td>{h.serviceCategory}</td>
                  <td>{h.location}</td>
                  <td>{h.rating != null ? `⭐ ${h.rating}` : '-'}</td>
                  <td>{Number(h.hourlyRate).toLocaleString()}</td>
                  <td>{h.isAvailable ? 'Yes' : 'No'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center' }}>
                  No handymen match that search.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ---------- Bookings ---------- */}
        <h2>Current Bookings</h2>
        {actionError && <p style={{ color: '#b00' }}>{actionError}</p>}
        <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead style={{ background: '#f0f0f0' }}>
            <tr>
              <th>ID</th>
              <th>Handyman</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Service</th>
              <th>Scheduled</th>
              <th>Price</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length > 0 ? (
              bookings.map((b) => {
                const busy = actingId === b.id;
                const open = b.status === 'pending' || b.status === 'confirmed';
                return (
                  <tr key={b.id}>
                    <td>{b.id}</td>
                    <td>{handymanName(b.handymanId)}</td>
                    <td>{b.customerName}</td>
                    <td>{b.customerPhone}</td>
                    <td>{b.serviceDescription}</td>
                    <td>{new Date(b.scheduledTime).toLocaleString()}</td>
                    <td>{b.priceCents != null ? formatKes(b.priceCents) : '-'}</td>
                    <td>
                      <span style={pill(statusColor(b.status))}>{b.status}</span>
                    </td>
                    <td>
                      <span style={pill(b.paymentStatus === 'paid' ? '#28a745' : '#6c757d')}>
                        {b.paymentStatus || 'unpaid'}
                      </span>
                    </td>
                    <td>
                      {b.status === 'pending' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => updateBookingStatus(b, 'confirmed')}
                          style={smallButton}
                        >
                          Confirm
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy || !open}
                        onClick={() => updateBookingStatus(b, 'completed')}
                        style={smallButton}
                      >
                        {busy ? 'Working...' : 'Mark completed (pays handyman)'}
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center' }}>
                  No bookings registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default HandyNearDashboard;