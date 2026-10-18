import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const emptyForm = {
  handymanId: '',
  customerName: '',
  customerPhone: '',
  serviceDescription: '',
  scheduledTime: '',
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

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/handymen`).then((res) => {
        if (!res.ok) throw new Error('Failed to fetch handymen');
        return res.json();
      }),
      fetch(`${API_URL}/api/bookings`).then((res) => {
        if (!res.ok) throw new Error('Failed to fetch bookings');
        return res.json();
      }),
    ])
      .then(([handymenData, bookingsData]) => {
        setHandymen(handymenData);
        setBookings(bookingsData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      // Shape the payload exactly like the API contract's CreateBookingRequest
      const payload = {
        handymanId: Number(formData.handymanId),
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        serviceDescription: formData.serviceDescription,
        scheduledTime: new Date(formData.scheduledTime).toISOString(),
      };

      const res = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to submit booking');
      }

      const newBooking = await res.json();
      setBookings((prev) => [...prev, newBooking]);
      setFormData(emptyForm);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
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

  return (
    <>
      <Navbar />
      <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ borderBottom: '2px solid #333', paddingBottom: '10px' }}>
          HandyNear Dashboard
        </h1>

        <h2>Create New Booking</h2>
        {formError && <p style={{ color: 'red' }}>{formError}</p>}
        <form
          onSubmit={handleSubmit}
          style={{ marginBottom: '36px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}
        >
          <select
            name="handymanId"
            value={formData.handymanId}
            onChange={handleInputChange}
            required
            style={{ padding: '8px' }}
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
            name="customerName"
            placeholder="Customer Name"
            value={formData.customerName}
            onChange={handleInputChange}
            required
            style={{ padding: '8px' }}
          />

          <input
            type="tel"
            name="customerPhone"
            placeholder="Phone (e.g. +254712345678)"
            value={formData.customerPhone}
            onChange={handleInputChange}
            required
            style={{ padding: '8px' }}
          />

          <input
            type="text"
            name="serviceDescription"
            placeholder="What needs fixing?"
            value={formData.serviceDescription}
            onChange={handleInputChange}
            required
            style={{ padding: '8px', minWidth: '220px' }}
          />

          <input
            type="datetime-local"
            name="scheduledTime"
            value={formData.scheduledTime}
            onChange={handleInputChange}
            required
            style={{ padding: '8px' }}
          />

          <button
            type="submit"
            disabled={submitting}
            style={{ padding: '8px 18px', cursor: 'pointer', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px' }}
          >
            {submitting ? 'Booking...' : 'Add Booking'}
          </button>
        </form>

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

        <h2>Current Bookings</h2>
        <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead style={{ background: '#f0f0f0' }}>
            <tr>
              <th>ID</th>
              <th>Handyman</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Service</th>
              <th>Scheduled</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length > 0 ? (
              bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td>{handymanName(b.handymanId)}</td>
                  <td>{b.customerName}</td>
                  <td>{b.customerPhone}</td>
                  <td>{b.serviceDescription}</td>
                  <td>{new Date(b.scheduledTime).toLocaleString()}</td>
                  <td>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        color: '#fff',
                        backgroundColor: statusColor(b.status),
                        fontWeight: 'bold',
                        fontSize: '12px',
                      }}
                    >
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center' }}>
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