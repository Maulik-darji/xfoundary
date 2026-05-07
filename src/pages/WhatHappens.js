import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

const WhatHappens = () => {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    document.title = "What Happens at X";
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'what-we-do', label: 'What We Do' },
    { id: 'why-xf', label: 'Why X Exists' },
    { id: 'who-for', label: 'Who It\'s For' },
    { id: 'vision', label: 'The Vision' }
  ];

  const sidebarLinkStyle = (id) => ({
    textDecoration: 'none',
    color: activeSection === id ? '#ff6026' : '#111',
    fontWeight: activeSection === id ? 'bold' : 'normal',
    fontSize: '14px',
    display: 'block',
    marginBottom: '1rem',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif'
  });

  const h2Style = {
    fontFamily: 'Newsreader, serif',
    fontSize: '1.75rem',
    fontWeight: '500',
    fontStyle: 'italic',
    margin: '2.5rem 0 1rem 0'
  };

  const pStyle = {
    fontSize: '18px',
    lineHeight: '1.6',
    color: '#333',
    marginBottom: '1.5rem',
    fontFamily: 'Inter, sans-serif'
  };

  return (
    <div style={{ backgroundColor: '#f6f6ef', minHeight: '100vh', color: '#111' }}>
      <div className="page-container">
        
        {/* Left Sidebar */}
        <aside className="mobile-hide" style={{ width: '180px', position: 'sticky', top: '150px', height: 'fit-content' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {sections.map(s => (
                <li key={s.id}>
                    <a 
                      href={`#${s.id}`} 
                      onClick={() => setActiveSection(s.id)}
                      style={sidebarLinkStyle(s.id)}
                    >{s.label}</a>
                </li>
            ))}
          </ul>
        </aside>

        {/* Main Content */}
        <div className="main-content">
            <h1 className="responsive-h1">What Happens at X</h1>
            
            <section id="overview">
                <p className="responsive-p" style={{ fontSize: '1.25rem', fontWeight: '500' }}>
                    People often ask us what happens at X. Here is an overview of how we discover the most promising startups that the world is currently overlooking.
                </p>
                <p className="responsive-p">
                    X is a platform dedicated to Indian startups, early-stage builders, and founders who didn’t get access to traditional elite platforms. Our goal is simple: <strong>Find the best — before everyone else does.</strong>
                </p>
            </section>

            <section id="what-we-do">
                <h2 className="responsive-h2">What We Do</h2>
                
                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>1. Curate High-Potential Startups</h3>
                    <p className="responsive-p">We actively search for startups with real potential — not just hype. Every startup listed on X is carefully reviewed and selected based on vision, execution, and scalability.</p>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>2. Give Founders Visibility</h3>
                    <p className="responsive-p">Many great founders never get noticed. X helps them get discovered, showcase their products, and tell their stories to the right audience.</p>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>3. Connect Startups with Investors</h3>
                    <p className="responsive-p">We bridge the gap between underrated founders and investors looking for the next big thing. We make it easier for VCs, Angel investors, and early backers to discover high-quality startups early.</p>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>4. Build a Trusted Startup Directory</h3>
                    <p className="responsive-p">X is building a high-signal startup directory where quality matters more than quantity. Every listing counts, and investors can explore with confidence.</p>
                </div>
            </section>

            <section id="why-xf">
                <h2 className="responsive-h2">Why X Exists</h2>
                <p className="responsive-p">Right now, the system is broken. Great startups often get ignored because they don’t have the right network or didn’t get into top accelerators. X exists to fix this gap and reveal hidden opportunities.</p>
            </section>

            <section id="who-for">
                <h2 className="responsive-h2">Who It’s For</h2>
                <div className="responsive-grid-2">
                    <div>
                        <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Founders</h3>
                        <p className="responsive-p" style={{ fontSize: '15px' }}>If you’re building something real but not getting attention — X is for you.</p>
                    </div>
                    <div>
                        <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Investors</h3>
                        <p className="responsive-p" style={{ fontSize: '15px' }}>If you want access to startups before they blow up — X is for you.</p>
                    </div>
                </div>
            </section>

            <section id="vision">
                <h2 className="responsive-h2">The Vision</h2>
                <p className="responsive-p" style={{ fontWeight: '500' }}>We want X to become the place where the next generation of great startups are discovered first.</p>
                
                <div style={{ marginTop: '4rem', padding: '2.5rem', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '8px' }}>
                    <h3 style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '1.5rem', marginBottom: '1rem' }}>Built by a Founder, for Founders</h3>
                    <p className="responsive-p" style={{ fontSize: '16px', marginBottom: 0 }}>
                        X is being built by a student founder who understands how hard it is to get noticed, how unfair access can be, and how much talent goes unseen. This platform exists to change that.
                    </p>
                </div>
            </section>
        </div>
      </div>
    </div>
  );
};

export default WhatHappens;
