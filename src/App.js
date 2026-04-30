import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './index.css';
import Home from './pages/Home';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Apply from './pages/Apply';

const Header = () => {
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="header-wrapper">
      <div className={`header-inner ${isScrolled ? 'scrolled' : ''}`}>
        <div className="header-left-empty" />
        <nav className="nav-links-centered">
          <div className="nav-group">
            <div className="nav-item">
              <span>About <svg className="arrow-svg" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg></span>
              <div className="dropdown-menu">
                <a href="#" className="dropdown-item">What Happens at XF</a>
                <a href="#" className="dropdown-item">XF Research</a>
                <a href="#" className="dropdown-item">Team</a>
                <a href="#" className="dropdown-item">Jobs</a>
                <a href="#" className="dropdown-item">Press</a>
              </div>
            </div>
            <div className="nav-item">
              <span>Companies <svg className="arrow-svg" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg></span>
              <div className="dropdown-menu">
                <a href="#" className="dropdown-item">Startup Directory</a>
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
          
          <Link to="/" className="yc-logo" style={{ textDecoration: 'none' }}>XF</Link>
          
          <div className="nav-group">
            <div className="nav-item">
              <a href="#" style={{ textDecoration: 'none', color: 'inherit' }}>Partners</a>
            </div>
            <div className="nav-item">
              <span>Resources <svg className="arrow-svg" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
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
          <Link to="/login" className="btn-login">Log in</Link>
          <Link to="/apply" className="btn-apply">Apply</Link>
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
          <li><a href="#">Startup Directory</a></li>
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
        <a href="#">Twitter</a>
        <a href="#">Facebook</a>
        <a href="#">Instagram</a>
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
          <Route path="*" element={
            <>
              <Header />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/apply" element={<Apply />} />
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
