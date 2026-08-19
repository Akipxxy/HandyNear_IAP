import React from 'react';
import Navbar from '../components/Navbar';
import './css/style.css';
import './css/home.css';

const Home = () => {

    const searchHandyman = () => {
        const input = document.getElementById('search-input').value.trim();
        if (input === '') {
            alert('Please type what you need help with first.');
            return;
        }
        window.location.href = '/browse';
    };

    return (
        <>
            <Navbar />

            <main>

                <section className="hero">
                    <div className="hero-content">
                        <h1>Find a Trusted Local Handyman <span>In Under 2 hours</span></h1>
                        <p>Verified by your neighbours. Book instantly. Get the job done.</p>
                        <div className="search-bar">
                            <input type="text" id="search-input" placeholder="What do you need help with? e.g. Plumbing" />
                            <button className="btn-primary" onClick={searchHandyman}>Find a Handyman</button>
                        </div>
                    </div>
                </section>

                <section className="features">
                    <div className="container">
                        <h2>Why HandyNear?</h2>
                        <div className="features-grid">
                            <div className="feature-card">
                                <i className="fas fa-shield-alt"></i>
                                <h3>Verified Pros</h3>
                                <p>Every handyman is background-checked and reviewed by real neighbours in your area.</p>
                            </div>
                            <div className="feature-card">
                                <i className="fas fa-bolt"></i>
                                <h3>Fast Booking</h3>
                                <p>See who is available right now and book instantly — no calls, no waiting.</p>
                            </div>
                            <div className="feature-card">
                                <i className="fas fa-star"></i>
                                <h3>Trusted Reviews</h3>
                                <p>Real ratings from real customers in your neighbourhood, not anonymous strangers.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="steps-teaser">
                    <div className="container">
                        <h2>How It Works</h2>
                        <p className="section-sub">Three simple steps to get your job done</p>
                        <div className="steps-grid">
                            <div className="step-card">
                                <div className="step-number">1</div>
                                <h3>Post Your Job</h3>
                                <p>Describe what you need and upload a photo of the problem.</p>
                            </div>
                            <div className="step-card">
                                <div className="step-number">2</div>
                                <h3>Get Matched</h3>
                                <p>We show you verified handymen available near you right now.</p>
                            </div>
                            <div className="step-card">
                                <div className="step-number">3</div>
                                <h3>Book and Relax</h3>
                                <p>Choose your handyman, confirm the booking, and get the job done.</p>
                            </div>
                        </div>
                        <a href="/how-it-works" className="btn-outline">Learn More</a>
                    </div>
                </section>

                <section className="cta">
                    <div className="container">
                        <h2>Ready to Get Started?</h2>
                        <p>Join hundreds of homeowners who trust HandyNear for fast, reliable repairs.</p>
                        <a href="/contact" className="btn-primary">Post a Job Today</a>
                    </div>
                </section>

            </main>

            
        </>
    );
};

export default Home;