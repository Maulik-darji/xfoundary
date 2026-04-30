import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
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
import FounderDirectory from './pages/FounderDirectory';
import StartupDetail from './pages/StartupDetail';
import FounderDashboard from './pages/FounderDashboard';
import CreateBlog from './pages/CreateBlog';
import LaunchXF from './pages/LaunchXF';

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
  const [isApprovedFounder, setIsApprovedFounder] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let unsubUser = null;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Real-time listener for user status
          unsubUser = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setIsApprovedFounder(data.application?.status === 'approved');
              setUserRole('user');
            }
            setAuthLoading(false);
          });

          // Check if admin or member (these are usually static roles)
          const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
          if (adminDoc.exists()) {
            setUserRole('admin');
            setAuthLoading(false);
            return;
          }
          const memberDoc = await getDoc(doc(db, 'members', currentUser.uid));
          if (memberDoc.exists()) {
            setUserRole('member');
            setAuthLoading(false);
            return;
          }
        } catch (error) {
          console.error("Error fetching role:", error);
          setUserRole('user');
          setAuthLoading(false);
        }
      } else {
        setUserRole(null);
        setIsApprovedFounder(false);
        setAuthLoading(false);
      }
    });
    return () => {
      unsubscribe();
      if (unsubUser) unsubUser();
    };
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
          <div className="nav-item has-dropdown">
            <span>About <svg className="arrow-svg" width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
            <div className="dropdown-menu">
              <Link to="/what-happens" className="dropdown-item">What Happens at X?</Link>
              <Link to="/faq" className="dropdown-item">FAQ</Link>
              <Link to="/people" className="dropdown-item">People</Link>
              <Link to="/blog" className="dropdown-item">X Blog</Link>
            </div>
          </div>
          
          <div className="nav-item has-dropdown">
            <span>Companies <svg className="arrow-svg" width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
            <div className="dropdown-menu">
              <Link to="/directory" className="dropdown-item">Startup Directory</Link>
              <Link to="/founder-directory" className="dropdown-item">Founder Directory</Link>
              <Link to="/launch-xf" className="dropdown-item">Launch XF</Link>
            </div>
          </div>
          
          <Link to="/" className="nav-item">Library</Link>
          
          <Link to="/" className="logo-container" style={{ textDecoration: 'none' }}>
            <div className="yc-logo">X</div>
          </Link>
          
          <div className="nav-item has-dropdown">
            <span>Resources <svg className="arrow-svg" width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
            <div className="dropdown-menu">
              <a href="#" className="dropdown-item">Startup School</a>
              <a href="#" className="dropdown-item">Newsletter</a>
              <a href="#" className="dropdown-item">Requests for Startups</a>
              <a href="#" className="dropdown-item">For Investors</a>
              <a href="#" className="dropdown-item">Verify Founders</a>
              <a href="#" className="dropdown-item">Hacker News</a>
              <a href="#" className="dropdown-item">Bookface</a>
              <a href="#" className="dropdown-item">Safe</a>
              <a href="#" className="dropdown-item">Find a Co-Founder</a>
            </div>
          </div>
          
          <Link to="/blog" className="nav-item">Startup Jobs</Link>
          
          {isApprovedFounder && (
            <Link to="/founderscompany/dashboard" className="nav-item" style={{ color: 'var(--yc-orange)', fontWeight: '600', textDecoration: 'none' }}>
              Founder Dashboard
            </Link>
          )}
        </nav>
        <div className="nav-actions">
          {user ? (
            <div className="nav-item user-menu">
              <div className="user-avatar">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'U')}
              </div>
              <div className="dropdown-menu profile-dropdown">
                <div className="profile-username">{user.displayName || (user.email && user.email.split('@')[0]) || 'User'}</div>
                
                {userRole === 'admin' && (
                  <Link to="/admin" className="dropdown-item" style={{ color: 'var(--yc-orange)', fontWeight: '600' }}>
                    Admin Portal
                  </Link>
                )}
                
                {userRole === 'member' && (
                  <Link to="/member" className="dropdown-item" style={{ color: 'var(--yc-orange)', fontWeight: '600' }}>
                    Member Portal
                  </Link>
                )}

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

const Footer = () => {
  const location = useLocation();
  if (location.pathname === '/founderscompany/dashboard') return null;

  return (
  <footer className="footer-v2">
    <div className="footer-v2-container">
      <div className="footer-v2-main">
        <div className="footer-v2-brand">
          <div className="footer-v2-logo">X</div>
          <p className="footer-v2-tagline">Make something people want.</p>
        </div>
        <div className="footer-v2-links">
          <div className="footer-v2-column">
            <h4>Programs</h4>
            <ul>
              <li><a href="#">XF Program</a></li>
              <li><a href="#">Startup School</a></li>
              <li><a href="#">Work at a Startup</a></li>
              <li><a href="#">Co-Founder Matching</a></li>
            </ul>
          </div>
          <div className="footer-v2-column">
            <h4>Resources</h4>
            <ul>
              <li><Link to="/directory">Startup Directory</Link></li>
              <li><a href="#">Startup Library</a></li>
              <li><a href="#">Investors</a></li>
              <li><a href="#">Demo Day</a></li>
              <li><a href="#">Safe</a></li>
              <li><a href="#">Hacker News</a></li>
              <li><a href="#">Launch XF</a></li>
              <li><a href="#">XF Deals</a></li>
            </ul>
          </div>
          <div className="footer-v2-column">
            <h4>Company</h4>
            <ul>
              <li><Link to="/blog">XF Blog</Link></li>
              <li><a href="#">Contact</a></li>
              <li><a href="#">Press</a></li>
              <li><Link to="/people">People</Link></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Security</a></li>
              <li><a href="#">Terms of Use</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="footer-v2-bottom">
        <div className="footer-v2-copyright">© 2026 X Foundary</div>
        <div className="footer-v2-social">
          <a href="https://x.com/FoundaryX35172" target="_blank" rel="noopener noreferrer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="#" target="_blank" rel="noopener noreferrer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.04c-5.5 0-10 4.5-10 10 0 4.97 3.64 9.08 8.44 9.88v-6.99h-2.54v-2.89h2.54v-2.2c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.19 2.23.19v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.77l-.44 2.89h-2.33v6.99c4.8-.8 8.44-4.91 8.44-9.88 0-5.5-4.5-10-10-10z"/></svg>
          </a>
          <a href="https://www.instagram.com/xfoundary/" target="_blank" rel="noopener noreferrer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.063 1.366-.333 2.633-1.308 3.608-.975.975-2.242 1.245-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.063-2.633-.333-3.608-1.308-.975-.975-1.245-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-1.245 3.608-1.308 1.266-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          </a>
          <a href="#" target="_blank" rel="noopener noreferrer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
          </a>
          <a href="#" target="_blank" rel="noopener noreferrer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186c-.272-1.015-1.065-1.815-2.071-2.091-1.83-.495-9.177-.495-9.177-.495s-7.347 0-9.177.495c-1.006.276-1.799 1.076-2.071 2.091-.491 1.83-.491 5.656-.491 5.656s0 3.826.491 5.656c.272 1.015 1.065 1.815 2.071 2.091 1.83.495 9.177.495 9.177.495s7.347 0 9.177-.495c1.006-.276 1.799-1.076 2.071-2.091.491-1.83.491-5.656.491-5.656s0-3.826-.491-5.656zM9.545 15.568V8.15l6.378 3.709-6.378 3.709z"/></svg>
          </a>
        </div>
      </div>
    </div>
  </footer>
  );
};

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
                <Route path="/founder-directory" element={<FounderDirectory />} />
                <Route path="/companies/:id" element={<StartupDetail />} />
                <Route path="/founderscompany/dashboard" element={<FounderDashboard />} />
                <Route path="/launch-xf" element={<LaunchXF />} />
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
