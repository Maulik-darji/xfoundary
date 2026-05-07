import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

const People = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    document.title = "People - X";
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const sectionHeaderStyle = {
    fontSize: '22px',
    fontWeight: '500',
    color: '#000',
    marginBottom: '2rem',
    marginTop: '3rem',
    fontFamily: 'Inter, sans-serif'
  };

  const personContainerStyle = {
    display: 'flex',
    gap: '1.5rem',
    marginBottom: '3rem',
    alignItems: 'flex-start'
  };

  const imageStyle = {
    width: '100px',
    height: '100px',
    borderRadius: '4px',
    objectFit: 'cover',
    flexShrink: 0
  };

  const infoStyle = {
    flex: 1
  };

  const nameStyle = {
    fontSize: '16px',
    fontWeight: '700',
    color: '#000',
    marginBottom: '4px',
    fontFamily: 'Inter, sans-serif'
  };

  const roleStyle = {
    fontSize: '14px',
    fontWeight: '700',
    color: '#000',
    marginBottom: '12px',
    fontFamily: 'Inter, sans-serif'
  };

  const bioStyle = {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#333',
    fontFamily: 'Inter, sans-serif',
    maxWidth: '750px'
  };

  return (
    <div style={{ backgroundColor: '#f5f5ee', minHeight: '100vh', color: '#111', fontFamily: "'Inter', sans-serif", padding: '4rem 2rem 8rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Centered Title */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 style={{ 
            fontFamily: "'Newsreader', serif", 
            fontSize: '3.5rem', 
            fontStyle: 'italic', 
            fontWeight: '400', 
            margin: 0,
            letterSpacing: '-0.02em'
          }}>People</h1>
        </div>

        {/* President & CEO Section */}
        <div>
          <h2 style={sectionHeaderStyle}>President & CEO</h2>
          
          <div style={personContainerStyle}>
            <div style={{ ...imageStyle, backgroundColor: '#6300dd', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '2rem', fontWeight: '800' }}>M</div>
            <div style={infoStyle}>
              <div style={nameStyle}>Maulik Darji</div>
              <div style={roleStyle}>President & CEO</div>
              <div style={bioStyle}>
                Maulik Darji is President and CEO of X. He is dedicated to discovering the next generation of Indian startups and providing them with the platform they deserve. Maulik leads the platform's vision and ecosystem development, focusing on identifying high-potential founders and bridging the gap between innovative ideas and market-ready ventures.
              </div>
            </div>
          </div>
        </div>

        {/* Partners Section */}
        <div style={{ marginTop: '4rem' }}>
          <h2 style={sectionHeaderStyle}>Partners</h2>
          
          <div style={personContainerStyle}>
            <div style={{ ...imageStyle, backgroundColor: '#eee', border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '10px' }}>
              <span style={{ color: '#999', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>Photo coming soon</span>
            </div>
            <div style={infoStyle}>
              <div style={nameStyle}>Join X</div>
              <div style={roleStyle}>Partner / Advisor</div>
              <div style={bioStyle}>
                We are always looking for passionate individuals to help us discover and support the next generation of great startups. If you believe in our mission and have experience in scaling ventures, reach out to us to join our ecosystem as a partner or advisor.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default People;
