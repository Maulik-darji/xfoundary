import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const Apply = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check if user has applied before (new collection)
        const appsQuery = query(collection(db, 'applications'), where('founderId', '==', currentUser.uid));
        const appsSnap = await getDocs(appsQuery);
        
        // Check legacy field in user doc
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const hasLegacyApp = userDoc.exists() && userDoc.data().application;

        setApplied(!appsSnap.empty || hasLegacyApp);
      }
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
        Apply to X
      </h1>
      <p style={{ fontSize: '1.25rem', lineHeight: '1.6', color: '#444', marginBottom: '3rem' }}>
        X is a global platform that helps startups gain visibility, reach a worldwide audience, and grow beyond borders.
      </p>
      
      {!loading && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={handleApplyClick}
            className="btn-primary-large" 
            style={{ 
              border: 'none', 
              cursor: 'pointer',
              backgroundColor: '#6300dd'
            }}
          >
            {loading ? '...' : (applied ? 'Apply Again' : 'Apply')}
          </button>
        </div>
      )}
    </div>
  );
};

export default Apply;
