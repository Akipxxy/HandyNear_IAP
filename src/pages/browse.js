import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import './css/style.css';
import './css/browse.css';

const handymen = [
  { id: 1, name: "John Mwangi", category: "plumbing", location: "Westlands, Nairobi", rating: 4.5, photo: "https://i.pravatar.cc/150?img=3" },
  { id: 2, name: "Grace Wanjiru", category: "electrical", location: "Kilimani, Nairobi", rating: 4.8, photo: "https://i.pravatar.cc/150?img=5" },
  { id: 3, name: "Peter Otieno", category: "carpentry", location: "Lavington, Nairobi", rating: 4.2, photo: "https://i.pravatar.cc/150?img=8" },
  { id: 4, name: "Mary Achieng", category: "painting", location: "Karen, Nairobi", rating: 4.6, photo: "https://i.pravatar.cc/150?img=9" },
  { id: 5, name: "Samuel Kiptoo", category: "general", location: "Ngong Road, Nairobi", rating: 4.0, photo: "https://i.pravatar.cc/150?img=12" },
  { id: 6, name: "Faith Njeri", category: "plumbing", location: "South B, Nairobi", rating: 4.7, photo: "https://i.pravatar.cc/150?img=15" },
];

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
             
              <div className="card-body">
                <h3>{h.name}</h3>
                <p className="category"><i className="fas fa-wrench"></i> {h.category}</p>
                <p className="location"><i className="fas fa-map-marker-alt"></i> {h.location}</p>
                <div className="stars">
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star-half-alt"></i>
                  <span>{h.rating}</span>
                </div>
                <span className="verified-badge"><i className="fas fa-check-circle"></i> Verified</span>
                <a href="/contact" className="btn-primary">Book Now</a>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
};

export default Browse;