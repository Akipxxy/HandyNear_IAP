import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../images/logo.svg';
//Navigation bar to be used across all pages
const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="navbar">
      <Link to="/" className="logo" onClick={closeMenu}>
        <img src={logo} alt="HandyNear Logo" />
      </Link>
      <ul className={isOpen ? "nav-links open" : "nav-links"}>
        <li><Link to="/" onClick={closeMenu}>Home</Link></li>
        <li><Link to="/browse" onClick={closeMenu}>Find a Handyman</Link></li>
        <li><Link to="/how-it-works" onClick={closeMenu}>How It Works</Link></li>
        <li><Link to="/contact" onClick={closeMenu}>Post a Job</Link></li>
      </ul>
      <button
        className="hamburger"
        id="hamburger"
        aria-label="Toggle navigation menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        &#9776;
      </button>
    </nav>
  );
};

export default Navbar;
