import { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function HandyNearDashboard() {
  const [handymen, setHandymen] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    handyman: '',
    customer_name: '',
    phone: '',
    category: '',
    booking_datetime: '',
    status: 'pending',
  });
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
    
    // Auto-fill category when a handyman is selected from dropdown
    if (name === 'handyman') {
      const selected = handymen.find((h) => h.name === value);
      setFormData((prev) => ({
        ...prev,
        handyman: value,
        category: selected ? selected.category : prev.category,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit booking');
      }

      const newBooking = await res.json();
      setBookings((prev) => [...prev, newBooking]);

      setFormData({
        handyman: '',
        customer_name: '',
        phone: '',
        category: '',
        booking_datetime: '',
        status: 'pending',
      });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p style={{ padding: '20px' }}>Loading HandyNear database...</p>;
  if (error) return <p style={{ padding: '20px', color: 'red' }}>Error: {error}</p>;

  const filteredHandymen = handymen.filter((h) =>
    h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ borderBottom: '2px solid #333', paddingBottom: '10px' }}>HandyNear Management Dashboard</h1>

      {/* Booking Submission Form */}
      <h2>Create New Booking</h2>
      {formError && <p style={{ color: 'red' }}>{formError}</p>}
      <form onSubmit={handleSubmit} style={{ marginBottom: '36px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <select
          name="handyman"
          value={formData.handyman}
          onChange={handleInputChange}
          required
          style={{ padding: '8px' }}
        >
          <option value="">Select Handyman</option>
          {handymen.map((h) => (
            <option key={h.id} value={h.name}>
              {h.name} ({h.category})
            </option>
          ))}
        </select>

        <input
          type="text"
          name="customer_name"
          placeholder="Customer Name"
          value={formData.customer_name}
          onChange={handleInputChange}
          required
          style={{ padding: '8px' }}
        />

        <input
          type="tel"
          name="phone"
          placeholder="Phone Number (e.g. 0712...)"
          value={formData.phone}
          onChange={handleInputChange}
          required
          style={{ padding: '8px' }}
        />

        <input
          type="text"
          name="category"
          placeholder="Category"
          value={formData.category}
          onChange={handleInputChange}
          required
          readOnly
          style={{ padding: '8px', background: '#eee', cursor: 'not-allowed' }}
        />

        <input
          type="datetime-local"
          name="booking_datetime"
          value={formData.booking_datetime}
          onChange={handleInputChange}
          required
          style={{ padding: '8px' }}
        />

        <select
          name="status"
          value={formData.status}
          onChange={handleInputChange}
          style={{ padding: '8px' }}
        >
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <button
          type="submit"
          disabled={submitting}
          style={{ padding: '8px 18px', cursor: 'pointer', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px' }}
        >
          {submitting ? 'Booking...' : 'Add Booking'}
        </button>
      </form>

      {/* Handymen Table */}
      <h2>Available Handymen</h2>
      <input
        type="text"
        placeholder="Filter by name, category, or location..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          marginBottom: '16px',
          padding: '8px',
          width: '320px',
          fontSize: '14px',
        }}
      />

      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '40px' }}>
        <thead style={{ background: '#f0f0f0' }}>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Category</th>
            <th>Location</th>
            <th>Rating</th>
            <th>Base Rate (KES)</th>
          </tr>
        </thead>
        <tbody>
          {filteredHandymen.length > 0 ? (
            filteredHandymen.map((h) => (
              <tr key={h.id}>
                <td>{h.id}</td>
                <td>{h.name}</td>
                <td>{h.category}</td>
                <td>{h.location}</td>
                <td>⭐ {h.rating}</td>
                <td>KES {Number(h.base_rate).toLocaleString()}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center' }}>
                No handymen match that search.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Bookings Table */}
      <h2>Current Bookings</h2>
      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead style={{ background: '#f0f0f0' }}>
          <tr>
            <th>ID</th>
            <th>Handyman</th>
            <th>Customer Name</th>
            <th>Phone</th>
            <th>Category</th>
            <th>Booking Date & Time</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {bookings.length > 0 ? (
            bookings.map((b) => (
              <tr key={b.id}>
                <td>{b.id}</td>
                <td>{b.handyman}</td>
                <td>{b.customer_name}</td>
                <td>{b.phone}</td>
                <td>{b.category}</td>
                <td>{new Date(b.booking_datetime).toLocaleString()}</td>
                <td>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      color: '#fff',
                      backgroundColor:
                        b.status === 'completed'
                          ? '#28a745'
                          : b.status === 'pending'
                          ? '#ffc107'
                          : '#dc3545',
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
  );
}

export default HandyNearDashboard;