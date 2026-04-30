import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import './index.css';
import Home from './pages/Home';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Apply from './pages/Apply';
import ResetPassword from './pages/ResetPassword';
import ApplicationHome from './pages/ApplicationHome';
import Settings from './pages/Settings';
import ApplyForm from './pages/ApplyForm';
import PreviewApplication from './pages/PreviewApplication';
import FounderProfile from './pages/FounderProfile';
import WhatHappens from './pages/WhatHappens';
import FAQ from './pages/FAQ';
import People from './pages/People';
import Blog from './pages/Blog';
import Admin from './pages/Admin';
import Member from './pages/Member';

import Directory from './pages/Directory';
import StartupDetail from './pages/StartupDetail';
import FounderDashboard from './pages/FounderDashboard';
import CreateBlog from './pages/CreateBlog';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
          if (adminDoc.exists()) {
            setUserRole('admin');
            return;
          }
          const memberDoc = await getDoc(doc(db, 'members', currentUser.uid));
          if (memberDoc.exists()) {
            setUserRole('member');
            return;
          }
          const memberAppDoc = await getDoc(doc(db, 'memberApplications', currentUser.uid));
          if (memberAppDoc.exists()) {
            setUserRole('member');
            return;
          }
          setUserRole('user');
        } catch (error) {
          console.error("Error fetching role:", error);
          setUserRole('user');
        }
      } else {
        setUserRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  };

  return (
    <header className="header-wrapper">
      <div className={`header-inner ${isScrolled ? 'scrolled' : ''}`}>
        <div className="header-left-empty" />
        <nav className="nav-links-centered">
          <div className="nav-group">
            <div className="nav-item">
              <span>About <svg className="arrow-svg" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
</svg></span>
              <div className="dropdown-menu">
                <Link to="/what-happens" className="dropdown-item">What Happens at XF?</Link>
                {(!userRole || userRole === 'user') && <Link to="/apply" className="dropdown-item">Apply</Link>}
                <Link to="/faq" className="dropdown-item">FAQ</Link>
                <Link to="/people" className="dropdown-item">People</Link>
                <Link to="/blog" className="dropdown-item">XF Blog</Link>
              </div>
            </div>
            <div className="nav-item">
              <span>Companies <svg className="arrow-svg" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
</svg></span>
              <div className="dropdown-menu">
                <Link to="/directory" className="dropdown-item">Startup Directory</Link>
                <a href="#" className="dropdown-item">Top Companies</a>
                <a href="#" className="dropdown-item">Revenue</a>
                <a href="#" className="dropdown-item">Valuation</a>
                <a href="#" className="dropdown-item">Industry</a>
                <a href="#" className="dropdown-item">Region</a>
              </div>
            </div>
            <div className="nav-item">
              <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>Library</Link>
            </div>
          </div>
          
          <Link to="/" className="yc-logo" style={{ textDecoration: 'none' }}>X</Link>
          
          <div className="nav-group">
            <div className="nav-item">
              <a href="#" style={{ textDecoration: 'none', color: 'inherit' }}>Partners</a>
            </div>
            <div className="nav-item">
              <span>Resources <svg className="arrow-svg" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
</svg></span>
              <div className="dropdown-menu">
                <a href="#" className="dropdown-item">Startup Library</a>
                <a href="#" className="dropdown-item">Hacker News</a>
                <a href="#" className="dropdown-item">XF Blog</a>
                <a href="#" className="dropdown-item">Work at a Startup</a>
                <a href="#" className="dropdown-item">Founder Matching</a>
              </div>
            </div>
            <div className="nav-item">
              <a href="#" style={{ textDecoration: 'none', color: 'inherit' }}>Startup Jobs</a>
            </div>
          </div>
        </nav>
        <div className="nav-actions">
          {user ? (
            <div className="nav-item user-menu">
              <div className="user-avatar">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'U')}
              </div>
              <div className="dropdown-menu profile-dropdown">
                <div className="profile-username">{user.displayName || (user.email && user.email.split('@')[0]) || 'User'}</div>
                <button onClick={handleLogout} className="dropdown-item logout-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Log out
                </button>
              </div>
            </div>
          ) : (
            <Link to="/login" className="btn-login">Log in</Link>
          )}
          {(!userRole || userRole === 'user') && <Link to="/apply" className="btn-apply">Apply</Link>}
        </div>
      </div>
    </header>
  );
};

const Footer = () => (
  <footer className="footer">
    <div className="footer-content">
      <div className="footer-column">
        <h4>Programs</h4>
        <ul>
          <li><a href="#">XF Program</a></li>
          <li><a href="#">Startup School</a></li>
          <li><a href="#">Work at a Startup</a></li>
          <li><a href="#">Co-Founder Matching</a></li>
        </ul>
      </div>
      <div className="footer-column">
        <h4>Resources</h4>
        <ul>
          <li><Link to="/directory">Startup Directory</Link></li>
          <li><Link to="/faq">FAQ</Link></li>
          <li><a href="#">Startup Library</a></li>
          <li><a href="#">Investors</a></li>
          <li><a href="#">Demo Day</a></li>
        </ul>
      </div>
      <div className="footer-column">
        <h4>Company</h4>
        <ul>
          <li><a href="#">XF Blog</a></li>
          <li><a href="#">Contact</a></li>
          <li><a href="#">Press</a></li>
          <li><a href="#">People</a></li>
        </ul>
      </div>
    </div>
    <div className="footer-bottom">
      <div>© 2026 X foundary</div>
      <div className="social-links">
        <a href="https://x.com/FoundaryX35172" target="_blank" rel="noopener noreferrer">Twitter</a>
        <a href="#">Facebook</a>
        <a href="https://www.instagram.com/xfoundary/" target="_blank" rel="noopener noreferrer">Instagram</a>
        <a href="#">LinkedIn</a>
        <a href="#">YouTube</a>
      </div>
    </div>
  </footer>
);

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Portal Pages (No main header/footer) */}
          <Route path="/home" element={<ApplicationHome />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/apply-form" element={<ApplyForm />} />
          <Route path="/preview-application" element={<PreviewApplication />} />
          <Route path="/founder-profile" element={<FounderProfile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/member" element={<Member />} />
          <Route path="/create-blog" element={<CreateBlog />} />
          <Route path="/founderscompany/dashboard" element={<FounderDashboard />} />

          {/* Main Website Pages */}
          <Route path="/*" element={
            <>
              <Header />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/apply" element={<Apply />} />
                <Route path="/what-happens" element={<WhatHappens />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/people" element={<People />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/directory" element={<Directory />} />
                <Route path="/companies/:id" element={<StartupDetail />} />
              </Routes>
              <Footer />
            </>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
