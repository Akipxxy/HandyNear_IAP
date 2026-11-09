import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Browse from './pages/browse';
import HowItWorks from './pages/how-it-works';
import Register from './pages/register';
import Footer from './components/Footer';
import Home from './pages/home';
import HandyNearDashboard from './HandyNearDashboard';
import Login from './pages/Login';
import Account from './pages/Account';
import AdminLogin from './pages/AdminLogin';
import { AuthProvider, RequireRole } from './auth';

//Main app containing all pages
const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className='app-container'>
          <Routes>
            <Route path="/" element={<Home/>}/>
            <Route path="/browse" element={<Browse />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/register" element={<Register />} />

            {/* Customers: log in to book, see the wallet balance and your own bookings */}
            <Route path="/login" element={<Login />} />
            <Route path="/account" element={<RequireRole role="customer"><Account /></RequireRole>} />

            {/* Admin only: the dashboard with every booking and customer */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<RequireRole role="admin"><HandyNearDashboard /></RequireRole>} />

            {/* The old public dashboard address now leads to the admin area */}
            <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
          </Routes>
          <Footer/>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
