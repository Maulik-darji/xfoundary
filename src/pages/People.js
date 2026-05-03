import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

const People = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    document.title = "People - X Foundary";
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const personStyle = {
    display: 'flex',
    gap: '2.5rem',
    marginBottom: '4rem',
    alignItems: 'flex-start'
  };

  const imageContainerStyle = {
    width: '120px',
    height: '120px',
    backgroundColor: '#ddd',
    flexShrink: 0,
    borderRadius: '4px',
    overflow: 'hidden'
  };

  const nameStyle = {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '0.25rem',
    fontFamily: 'Inter, sans-serif'
  };

  const titleStyle = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111',
    marginBottom: '0.75rem',
    fontFamily: 'Inter, sans-serif'
  };

  const bioStyle = {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#333',
    fontFamily: 'Inter, sans-serif',
    maxWidth: '800px'
  };

  const sectionHeaderStyle = {
    fontSize: '1.75rem',
    fontWeight: '500',
    marginBottom: '2.5rem',
    marginTop: '4rem',
    fontFamily: 'Inter, sans-serif',
    color: '#111'
  };

  return (
    <div style={{ backgroundColor: '#f6f6ef', minHeight: '100vh', color: '#111', fontFamily: "'Inter', sans-serif", paddingBottom: '8rem' }}>
      <div className="page-container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '4rem 2rem' }}>
        <h1 style={{ 
          fontFamily: "'Newsreader', serif", 
          fontSize: '4.5rem', 
          fontStyle: 'italic', 
          fontWeight: '400', 
          textAlign: 'center', 
          marginBottom: '5rem', 
          marginTop: '3rem',
          letterSpacing: '-0.03em'
        }}>People</h1>
        
        <div style={{ marginBottom: '6rem' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '2.5rem', fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>President & Founder</h2>
          <div className="person-row" style={{ display: 'flex', gap: '3rem', marginBottom: '4rem', alignItems: 'flex-start' }}>
              <div style={{ width: '120px', height: '120px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6300dd', color: 'white', fontSize: '2.5rem', fontWeight: '700' }}>M</div>
              </div>
              <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.4rem', fontFamily: "'Outfit', sans-serif" }}>Maulik Darji</h3>
                  <p style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.2rem', color: '#000', opacity: 0.8 }}>President & Founder</p>
                  <p style={{ fontSize: '1.05rem', lineHeight: '1.7', color: '#333', maxWidth: '800px' }}>
                      Founder of X Foundary. Maulik is dedicated to discovering the next generation of Indian startups and providing them with the platform they deserve.
                  </p>
              </div>
          </div>
        </div>

        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '2.5rem', fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>Partners</h2>
          <div className="person-row" style={{ display: 'flex', gap: '3rem', marginBottom: '4rem', alignItems: 'flex-start' }}>
              <div style={{ width: '120px', height: '120px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee', color: '#999', fontSize: '12px', textAlign: 'center', padding: '10px', fontWeight: '600' }}>Photo coming soon</div>
              </div>
              <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.4rem', fontFamily: "'Outfit', sans-serif" }}>Join XF</h3>
                  <p style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.2rem', color: '#000', opacity: 0.8 }}>Partner / Advisor</p>
                  <p style={{ fontSize: '1.05rem', lineHeight: '1.7', color: '#333', maxWidth: '800px' }}>
                      We are always looking for passionate individuals to help us discover and support the next generation of great startups. If you believe in our mission, reach out to us to join our ecosystem.
                  </p>
              </div>
          </div>
        </div>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@1,6..72,400&display=swap');
        @media (max-width: 768px) {
            .person-row { flex-direction: column; gap: 1.5rem !important; }
            h1 { font-size: 3.2rem !important; }
            .page-container { padding: 2rem 1.5rem !important; }
        }
      `}</style>
    </div>
  );
};

export default People;
