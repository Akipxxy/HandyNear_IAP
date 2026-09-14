import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Browse from './pages/browse';
import HowItWorks from './pages/how-it-works';
import Footer from './components/Footer';
import Home from './pages/home';
import Register from './pages/register';
//Main app containing all pages
const App = () => {
  return (
      <Router>
     <div className='app-container'>
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/browse" element={<Browse />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/register" element={<Register />} />
      </Routes>
      <Footer/>
      </div>
    </Router>
  );
};

export default App;
