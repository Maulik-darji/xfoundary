import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const Hero = ({ userRole }) => (
  <section className="hero">
    <h1>
      XF Helps founders<br/>
      <em>feature their startup<br/>globally</em>
    </h1>
    <p>Four times a year we invest in a large number of startups.</p>
    {(!userRole || userRole === 'user') && (
      <div className="hero-actions">
        <button className="btn-primary-large">
          Apply for Summer 2026 by May 4
        </button>
      </div>
    )}
  </section>
);

const Facts = () => {
  const facts = [
    { story: "Brian, Joe, and Nate did YC in W09.", outcome: "Airbnb went public in 2020 at an over $100B valuation." },
    { story: "Sam was part of YC's inaugural batch in S05 and founded OpenAI as YC Research in 2015.", outcome: "Sam built OpenAI into a $500B company." },
    { story: "The Collison brothers did YC twice—first in W07 and then in S09, when they started Stripe.", outcome: "Stripe is now the internet’s $107B payments backbone." },
    { story: "Fred and Brian met on Reddit and did YC in S12.", outcome: "Coinbase went public in 2021 at a $86B valuation." },
    { story: "Andy, Stanley, Tony, and Evan did YC in S13.", outcome: "DoorDash went public in 2020 at a valuation of $39B." },
    { story: "Arash and Drew started Dropbox at MIT and did YC in S07.", outcome: "Dropbox had the biggest tech IPO of 2018 at a $9B valuation." },
    { story: "Alexis and Steve were in the inaugural YC batch in S05.", outcome: "Reddit went public in 2024 at a $6.4B valuation." },
  ];

  return (
    <section className="facts-section">
      {facts.map((fact, index) => (
        <div key={index} className="fact-item">
          <p className="fact-story">{fact.story}</p>
          <p className="fact-outcome">{fact.outcome}</p>
        </div>
      ))}
      <a href="#" className="all-companies-link">All companies →</a>
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
      <Facts />
      <FundingDetails />
    </main>
  );
};

export default Home;
