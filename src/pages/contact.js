import React, { useState } from 'react';
import './css/style.css';
import './css/contact.css';
import Navbar from '../components/Navbar';
//Job posting page
const Contact = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    e.target.reset();
  };

  return (
    <>
    <Navbar/>

      <main>

    <div className="contact-page">
      <header>
        <h1>Join Our Network of Skilled Handymen</h1>
        <p>
          Get connected with customers who need your expertise — fast, easy, and
          free to join.
        </p>
      </header>

      <section className="intro">
        <p>
          We connect reliable handymen with homeowners and businesses looking
          for help with repairs, installations, and maintenance. Whether you’re
          a plumber, electrician, painter, or general fixer, registering here
          means more job opportunities and steady work.
        </p>
      </section>

      <section className="registration">
        <h2>Register Now</h2>
        <p>
          Fill out the form below to register your skills and start receiving
          job calls from customers in your area.
        </p>

        <ul>
          <li>✅ Free registration</li>
          <li>✅ Verified customer requests</li>
          <li>✅ Flexible work schedule</li>
          <li>✅ Secure payments</li>
        </ul>

        {submitted ? (
          <div className="form-success" role="status">
            <p>🎉 Thanks for registering! We'll be in touch soon with job opportunities in your area.</p>
          </div>
        ) : (
          <form className="registration-form" onSubmit={handleSubmit}>
            <label>
              Full Name:
              <input type="text" name="name" required />
            </label>

            <label>
              Phone Number:
              <input type="tel" name="phone" required />
            </label>

            <label>
              Email Address:
              <input type="email" name="email" required />
            </label>

            <label>
              Skills (e.g., plumbing, painting):
              <input type="text" name="skills" required />
            </label>

            <button type="submit">Register</button>
          </form>
        )}
      </section>

      <section className="contact-info">
        <h2>Need Help?</h2>
        <p>
          Reach us at <a href="tel:+254115886800">+254 115 886 800</a> or email{" "}
          <a href="mailto:support@handynear.com">support@handynear.com</a>.
        </p>
      </section>

      <footer>
        <p>
          Your skills keep homes running — let’s make sure you get the jobs you
          deserve.
        </p>
      </footer>
    </div>


      </main>


    </>
  );
};

export default Contact;
