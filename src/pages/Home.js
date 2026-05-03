import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const Hero = ({ userRole }) => {
  return (
    <section className="hero">
      <h1>
        XF Helps founders <em>feature their startup globally</em>
      </h1>
      <p>Four times a year we invest in a large number of startups.</p>
      <div className="hero-footer">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
        </svg>
      </div>
    </section>
  );
};

const FundingDetails = () => (
  <section className="funding-details">
    <div className="funding-details-content">
      <p>XF helps startups reach the world.
<br/><br/>
We help founders gain global visibility, connect with the right audience, and grow beyond borders.
<br/><br/>
And we don’t stop there—
XF continues to support startups as they scale worldwide.</p>
      </div>
  </section>
);

const Home = () => {
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
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

  return (
    <main>
      <Hero userRole={userRole} />
      <FundingDetails />
    </main>
  );
};

export default Home;
