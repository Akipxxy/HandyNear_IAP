import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Browse from './pages/browse';
import HowItWorks from './pages/how-it-works';
import Contact from './pages/contact';
import Book from './pages/book';
import Footer from './components/Footer';
import Home from './pages/home';
//Main app containing all pages
const App = () => {
  return (
      <Router>
     <div className='app-container'>
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/browse" element={<Browse />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/book/:id" element={<Book />} />
      </Routes>
      <Footer/>
      </div>
    </Router>
  );
};

export default App;