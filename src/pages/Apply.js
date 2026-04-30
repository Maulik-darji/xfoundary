import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

const Apply = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [applied, setApplied] = useState(false);

  const handleApplyClick = () => {
    if (!user) {
      navigate('/login?context=apply');
    } else {
      navigate('/home');
    }
  };

  return (
    <div className="apply-page" style={{ padding: '8rem 2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '4rem', fontWeight: 500, marginBottom: '2rem' }}>
        Apply to X foundary
      </h1>
      <p style={{ fontSize: '1.25rem', lineHeight: '1.6', color: '#444', marginBottom: '3rem' }}>
        XF is a global platform that helps startups gain visibility, reach a worldwide audience, and grow beyond borders.
      </p>
      
      {!loading && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={handleApplyClick}
            disabled={applied}
            className="btn-primary-large" 
            style={{ 
              border: 'none', 
              cursor: applied ? 'not-allowed' : 'pointer',
              opacity: applied ? 0.7 : 1
            }}
          >
            {applied ? 'Applying...' : 'Apply'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Apply;
