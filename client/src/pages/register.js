import React, { useState } from 'react';
import './css/style.css';
import './css/contact.css';
import Navbar from '../components/Navbar';
//Job posting page
const Register = () => {
  const [formData, setFormData] = useState({
    full_name:'',
    national_id:'',
    phone:'',
    email:'',
    skills:'',
    location:'',
    
  });
  const [submitted, setSubmitted] = useState(false);
    const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };


 const handleSubmit = async(e)=>{
  e.preventDefault();
  console.log(formData);
  try{
    const response = await fetch('http://localhost:5000/api/handymen', {
      method: 'POST',
      headers:{ 'Content-Type': 'application/json'},
      body: JSON.stringify(formData)
     
    });
    if(response.ok)setSubmitted(true);

  }
  catch(error){
    console.error('Error registering handyman: ', error);
  }
  
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
            </label>
            <input type="text" name="full_name" value ={formData.full_name}onChange={handleChange} required />

            <label>
              National ID:
            </label>
              <input type="text" name = "national_id"value={formData.national_id}onChange={handleChange}required/>

            <label>
              Phone Number:
            </label>
            <input type="tel" name="phone" value={formData.phone}onChange={handleChange}required />

            <label>
              Email Address: 
            </label>
             <input type="email" name="email"value={formData.email}onChange={handleChange} required />

            <label>
              Skills (e.g., plumbing, painting):
            </label>
             <input type="text" name="skills"value={formData.skills}onChange={handleChange} required />

             <label>
              Location:
             </label>
             <input type="text" name="location" value={formData.location} onChange={handleChange} required />
             

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

export default Register;
