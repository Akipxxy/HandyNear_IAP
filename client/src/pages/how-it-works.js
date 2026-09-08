import React, { useState } from 'react';
import './css/style.css';
import './css/how-it-works.css';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

const HowItWorks = () => {
    // React state to keep track of which FAQ item is active
    const [activeIndex, setActiveIndex] = useState(null);

    const toggleAccordion = (index) => {
        // If the clicked item is already open, close it (set to null). Otherwise, open it.
        setActiveIndex(activeIndex === index ? null : index);
    };

    return (
        <>
            <Navbar />

            <main>
                <header class="hiw-header">
                    <div class="container">
                        <h1>How HandyNear Works</h1>
                        <p>Your home project or quick fix is just 4 simple steps away.</p>
                    </div>
                </header>

                <section class="hiw-steps">
                    <div class="container">
                        <div class="steps-grid">
                            <div class="step-card">
                                <div class="step-number">1</div>
                                <div class="step-icon"><i class="fa-solid fa-pen-to-square"></i></div>
                                <h3>Post your job</h3>
                                <p>Describe what you need done around your house or office.</p>
                            </div>
                            <div class="step-card">
                                <div class="step-number">2</div>
                                <div class="step-icon"><i class="fa-solid fa-users-viewfinder"></i></div>
                                <h3>Get matched</h3>
                                <p>We show you verified, available handymen right in your neighborhood.</p>
                            </div>
                            <div class="step-card">
                                <div class="step-number">3</div>
                                <div class="step-icon"><i class="fa-solid fa-id-card"></i></div>
                                <h3>Review profiles</h3>
                                <p>Check trusted ratings, reviews, and photos of past work.</p>
                            </div>
                            <div class="step-card">
                                <div class="step-number">4</div>
                                <div class="step-icon"><i class="fa-solid fa-calendar-check"></i></div>
                                <h3>Book and relax</h3>
                                <p>Your handyman arrives, completes the job, and you pay securely.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="hiw-trust">
                    <div class="container">
                        <div class="trust-grid">
                            <div class="trust-item">
                                <div class="trust-icon"><i class="fa-solid fa-user-shield"></i></div>
                                <h2>500+</h2>
                                <p>Verified Handymen</p>
                            </div>
                            <div class="trust-item">
                                <div class="trust-icon"><i class="fa-solid fa-circle-check"></i></div>
                                <h2>2,000+</h2>
                                <p>Jobs Completed</p>
                            </div>
                            <div class="trust-item">
                                <div class="trust-icon"><i class="fa-solid fa-star"></i></div>
                                <h2>4.8</h2>
                                <p>Average Rating</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="hiw-faq">
                    <div class="container small-container">
                        <h2 class="section-title">Frequently Asked Questions</h2>
                        <div class="accordion">
                            
                            {/* FAQ Item 1 */}
                            <div class={`accordion-item ${activeIndex === 0 ? 'active' : ''}`}>
                                <button class="accordion-header" onClick={() => toggleAccordion(0)}>
                                    <span>Is there a fee to post a job on HandyNear?</span>
                                    <i class="fa-solid fa-chevron-down toggle-icon"></i>
                                </button>
                                <div class="accordion-content">
                                    <p>No, posting a job is completely free! You only negotiate and pay your chosen handyman directly once the work details are agreed upon or finalized.</p>
                                </div>
                            </div>

                            {/* FAQ Item 2 */}
                            <div class={`accordion-item ${activeIndex === 1 ? 'active' : ''}`}>
                                <button class="accordion-header" onClick={() => toggleAccordion(1)}>
                                    <span>How do you verify the handymen on your platform?</span>
                                    <i class="fa-solid fa-chevron-down toggle-icon"></i>
                                </button>
                                <div class="accordion-content">
                                    <p>Every professional on our platform undergoes background checks, identity verification, and strict community guideline reviews to ensure a safe environment.</p>
                                </div>
                            </div>

                            {/* FAQ Item 3 */}
                            <div class={`accordion-item ${activeIndex === 2 ? 'active' : ''}`}>
                                <button class="accordion-header" onClick={() => toggleAccordion(2)}>
                                    <span>What if I am not satisfied with the finished work?</span>
                                    <i class="fa-solid fa-chevron-down toggle-icon"></i>
                                </button>
                                <div class="accordion-content">
                                    <p>We encourage communicating clearly via profiles and reviews before booking. If an issue arises, you can leave a community rating and contact our support team to help resolve any dispute.</p>
                                </div>
                            </div>

                            {/* FAQ Item 4 */}
                            <div class={`accordion-item ${activeIndex === 3 ? 'active' : ''}`}>
                                <button class="accordion-header" onClick={() => toggleAccordion(3)}>
                                    <span>How fast can a local handyman typically arrive?</span>
                                    <i class="fa-solid fa-chevron-down toggle-icon"></i>
                                </button>
                                <div class="accordion-content">
                                    <p>Many local professionals offer same-day or next-day availability depending on your job scope and their current schedule in your immediate area.</p>
                                </div>
                            </div>

                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
};

export default HowItWorks;