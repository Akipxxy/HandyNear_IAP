import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../images/logo.svg';
import { useAuth } from '../auth';
//Navigation bar to be used across all pages
const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  const closeMenu = () => setIsOpen(false);
  const handleLogout = () => {
    closeMenu();
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="logo" onClick={closeMenu}>
        <img src={logo} alt="HandyNear Logo" />
      </Link>
      <ul className={isOpen ? "nav-links open" : "nav-links"}>
        <li><Link to="/" onClick={closeMenu}>Home</Link></li>
        <li><Link to="/browse" onClick={closeMenu}>Find a Handyman</Link></li>
        <li><Link to="/how-it-works" onClick={closeMenu}>How It Works</Link></li>
        <li><Link to="/register" onClick={closeMenu}>Register</Link></li>
        {session && session.role === 'customer' && (
          <li><Link to="/account" onClick={closeMenu}>My account</Link></li>
        )}
        {session && session.role === 'admin' && (
          <li><Link to="/admin" onClick={closeMenu}>Admin</Link></li>
        )}
        {session ? (
          <li><a href="/" onClick={(e) => { e.preventDefault(); handleLogout(); }}>Log out</a></li>
        ) : (
          <li><Link to="/login" onClick={closeMenu}>Log in</Link></li>
        )}
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
