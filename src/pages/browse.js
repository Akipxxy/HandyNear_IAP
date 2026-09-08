import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './css/style.css';
import './css/browse.css';
import handymen from '../data/handymen';

// Builds an array of 5 star "types" (full / half / empty) from a numeric rating
const getStarTypes = (rating) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  for (let i = 0; i < fullStars; i++) stars.push('full');
  if (hasHalf) stars.push('half');
  while (stars.length < 5) stars.push('empty');

  return stars;
};

//Browsing page
const Browse = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredHandymen = selectedCategory === 'all'
    ? handymen
    : handymen.filter(h => h.category === selectedCategory);

  return (
    <>
      <Navbar />
      <main>
        <section className="page-header">
          <h1>Find a Handyman</h1>
          <p>Browse through trusted professionals near you.</p>
        </section>

        <section className="filter-bar">
          <label htmlFor="category-filter">Filter by category:</label>
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All</option>
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
            <option value="carpentry">Carpentry</option>
            <option value="painting">Painting</option>
            <option value="general">General</option>
          </select>
        </section>

        <div className="cards-grid">
          {filteredHandymen.map(h => (
            <div className="handyman-card" data-category={h.category} key={h.id}>
              <img src={h.photo} alt={h.name} />
              <div className="card-body">
                <h3>{h.name}</h3>
                <p className="category"><i className="fas fa-wrench"></i> {h.category}</p>
                <p className="location"><i className="fas fa-map-marker-alt"></i> {h.location}</p>
                <div className="stars">
                  {getStarTypes(h.rating).map((type, i) => (
                    <i
                      key={i}
                      className={
                        type === 'full'
                          ? 'fas fa-star'
                          : type === 'half'
                          ? 'fas fa-star-half-alt'
                          : 'far fa-star'
                      }
                    ></i>
                  ))}
                  <span>{h.rating}</span>
                </div>
                <span className="verified-badge"><i className="fas fa-check-circle"></i> Verified</span>
                <Link to={`/book/${h.id}`} className="btn-primary">Book Now</Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
};

export default Browse;