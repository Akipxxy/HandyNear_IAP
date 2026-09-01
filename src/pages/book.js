import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import handymen from '../data/handymen';
import './css/style.css';
import './css/book.css';

// Customer-facing booking page for a single handyman.
// Reached from Browse's "Book Now" button (was previously, incorrectly,
// sending customers to the handyman-registration form at /contact).
const Book = () => {
  const { id } = useParams();
  const handyman = handymen.find(h => h.id === Number(id));
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    e.target.reset();
  };

  if (!handyman) {
    return (
      <>
        <Navbar />
        <main className="book-page">
          <p>We couldn't find that handyman. <Link to="/browse">Back to Browse</Link></p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="book-page">
        <section className="book-summary">
          <img src={handyman.photo} alt={handyman.name} />
          <div>
            <h1>{handyman.name}</h1>
            <p className="category">{handyman.category}</p>
            <p className="location"><i className="fas fa-map-marker-alt"></i> {handyman.location}</p>
            <p className="estimate">Estimated job cost: KES {handyman.baseRate.toLocaleString()}</p>
          </div>
        </section>

        <section className="book-form-section">
          <h2>Request This Job</h2>
          {submitted ? (
            <div className="form-success" role="status">
              <p>✅ Request sent to {handyman.name}. They'll get back to you shortly.</p>
            </div>
          ) : (
            <form className="booking-form" onSubmit={handleSubmit}>
              <label>
                Full Name:
                <input type="text" name="name" required />
              </label>
              <label>
                Phone Number:
                <input type="tel" name="phone" required />
              </label>
              <label>
                Preferred Date:
                <input type="date" name="date" required />
              </label>
              <label>
                Job Details:
                <textarea name="details" rows="4" placeholder="Briefly describe the job" required />
              </label>
              <button type="submit" className="btn-primary">Send Request</button>
            </form>
          )}
        </section>

        <AffordabilityCheck jobCost={handyman.baseRate} />
      </main>
    </>
  );
};

// "Can I afford this?" — savings-timeline calculator.
//
// MoneyMentor (our upstream partner) doesn't actually expose a callable API yet —
// per their own description, its calculators run entirely in the browser with no
// backend, no accounts, no permanent storage. So there's nothing to fetch() from
// right now. This replicates their public savings-goal math locally so the feature
// works today.
//
// TODO once MoneyMentor exposes a real endpoint: replace the calculation below with
// a fetch() call sending { target: jobCost, monthlyContribution: contribution } and
// render their response instead of computing it here.
const AffordabilityCheck = ({ jobCost }) => {
  const [monthly, setMonthly] = useState('');
  const [result, setResult] = useState(null);

  const handleCheck = (e) => {
    e.preventDefault();
    const contribution = Number(monthly);
    if (!contribution || contribution <= 0) return;
    setResult(Math.ceil(jobCost / contribution));
  };

  return (
    <section className="affordability-check">
      <h2>Can't pay it all at once?</h2>
      <p>See how many months it'd take to save up for this job.</p>
      <form onSubmit={handleCheck}>
        <label>
          Monthly amount you can set aside (KES):
          <input
            type="number"
            min="1"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="btn-outline">Calculate</button>
      </form>
      {result !== null && (
        <p className="afford-result">
          At that rate, you'd have KES {jobCost.toLocaleString()} saved up in{' '}
          <strong>{result} month{result !== 1 ? 's' : ''}</strong>.
        </p>
      )}
    </section>
  );
};

export default Book;