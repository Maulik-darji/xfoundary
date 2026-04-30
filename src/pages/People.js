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
    <div style={{ backgroundColor: '#f6f6ef', minHeight: '100vh', paddingBottom: '10rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '10rem 2rem 0 2rem' }}>
        <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '4.5rem', fontWeight: '500', fontStyle: 'italic', marginBottom: '5rem', textAlign: 'center', letterSpacing: '-0.02em' }}>People</h1>
        
        <h2 style={sectionHeaderStyle}>President & Founder</h2>
        <div style={personStyle}>
            <div style={imageContainerStyle}>
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6300dd', color: 'white', fontSize: '3rem', fontWeight: 'bold' }}>M</div>
            </div>
            <div>
                <p style={nameStyle}>Maulik Darji</p>
                <p style={titleStyle}>President & Founder</p>
                <p style={bioStyle}>
                    Founder of X Foundary.
                </p>
            </div>
        </div>

        <h2 style={sectionHeaderStyle}>Partners</h2>
        <div style={personStyle}>
            <div style={imageContainerStyle}>
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee', color: '#999', fontSize: '14px', textAlign: 'center', padding: '10px' }}>Photo coming soon</div>
            </div>
            <div>
                <p style={nameStyle}>Join XF</p>
                <p style={titleStyle}>Partner / Advisor</p>
                <p style={bioStyle}>
                    We are always looking for passionate individuals to help us discover and support the next generation of great startups. If you believe in our mission, reach out to us.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default People;
