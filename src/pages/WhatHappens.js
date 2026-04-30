import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

const WhatHappens = () => {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    document.title = "What Happens at XF";
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'what-we-do', label: 'What We Do' },
    { id: 'why-xf', label: 'Why XF Exists' },
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
    <div style={{ backgroundColor: '#f6f6ef', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#111', paddingTop: '10rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', gap: '5rem', padding: '0 2rem 10rem 2rem' }}>
        
        {/* Left Sidebar */}
        <aside style={{ width: '180px', position: 'sticky', top: '150px', height: 'fit-content' }}>
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
        <div style={{ flex: 1, maxWidth: '700px' }}>
            <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '4.5rem', fontWeight: '500', fontStyle: 'italic', marginBottom: '3rem', textAlign: 'left', letterSpacing: '-0.02em' }}>What Happens at XF</h1>
            
            <section id="overview">
                <p style={{ ...pStyle, fontSize: '1.15rem' }}>
                    People often ask us what happens at X Foundary. Here is an overview of how we discover the most promising startups that the world is currently overlooking.
                </p>
                <p style={pStyle}>
                    X Foundary (XF) is a platform dedicated to Indian startups, early-stage builders, and founders who didn’t get access to traditional elite platforms. Our goal is simple: <strong>Find the best — before everyone else does.</strong>
                </p>
            </section>

            <section id="what-we-do">
                <h2 style={h2Style}>What We Do</h2>
                
                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>1. Curate High-Potential Startups</h3>
                    <p style={pStyle}>We actively search for startups with real potential — not just hype. Every startup listed on XF is carefully reviewed and selected based on vision, execution, and scalability.</p>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>2. Give Founders Visibility</h3>
                    <p style={pStyle}>Many great founders never get noticed. XF helps them get discovered, showcase their products, and tell their stories to the right audience.</p>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>3. Connect Startups with Investors</h3>
                    <p style={pStyle}>We bridge the gap between underrated founders and investors looking for the next big thing. We make it easier for VCs, Angel investors, and early backers to discover high-quality startups early.</p>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>4. Build a Trusted Startup Directory</h3>
                    <p style={pStyle}>XF is building a high-signal startup directory where quality matters more than quantity. Every listing counts, and investors can explore with confidence.</p>
                </div>
            </section>

            <section id="why-xf">
                <h2 style={h2Style}>Why XF Exists</h2>
                <p style={pStyle}>Right now, the system is broken. Great startups often get ignored because they don’t have the right network or didn’t get into top accelerators. XF exists to fix this gap and reveal hidden opportunities.</p>
            </section>

            <section id="who-for">
                <h2 style={h2Style}>Who It’s For</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                    <div>
                        <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Founders</h3>
                        <p style={{ ...pStyle, fontSize: '15px' }}>If you’re building something real but not getting attention — XF is for you.</p>
                    </div>
                    <div>
                        <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Investors</h3>
                        <p style={{ ...pStyle, fontSize: '15px' }}>If you want access to startups before they blow up — XF is for you.</p>
                    </div>
                </div>
            </section>

            <section id="vision">
                <h2 style={h2Style}>The Vision</h2>
                <p style={{ ...pStyle, fontWeight: '500' }}>We want XF to become the place where the next generation of great startups are discovered first.</p>
                
                <div style={{ marginTop: '4rem', padding: '2.5rem', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px' }}>
                    <h3 style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: '1.5rem', marginBottom: '1rem' }}>Built by a Founder, for Founders</h3>
                    <p style={{ ...pStyle, fontSize: '16px', marginBottom: 0 }}>
                        XF is being built by a student founder who understands how hard it is to get noticed, how unfair access can be, and how much talent goes unseen. This platform exists to change that.
                    </p>
                </div>
            </section>
        </div>
      </div>
    </div>
  );
};

export default WhatHappens;
