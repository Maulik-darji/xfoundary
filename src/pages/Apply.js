import React from 'react';
import { Link } from 'react-router-dom';

const Apply = () => {
  return (
    <div className="apply-page" style={{ padding: '8rem 2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '4rem', fontWeight: 500, marginBottom: '2rem' }}>
        Apply to X foundary
      </h1>
      <p style={{ fontSize: '1.25rem', lineHeight: '1.6', color: '#444', marginBottom: '3rem' }}>
        XF is a startup accelerator that has helped over 5,000 companies launch and grow. 
        We invest $500k in every company we work with. 
        Applications are now open for the Summer 2026 batch.
      </p>
      
      <div style={{ background: 'white', padding: '3rem', borderRadius: '4px', border: '1px solid #e5e4df' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Ready to start your application?</h2>
        <p style={{ marginBottom: '2rem', color: '#666' }}>You'll need an XF account to apply. If you already have one, please log in.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <Link to="/signup" className="btn-primary-large" style={{ textDecoration: 'none' }}>Create an Account</Link>
          <Link to="/login" className="btn-apply" style={{ padding: '1rem 2rem', fontSize: '1.125rem', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Log In</Link>
        </div>
      </div>
      
      <div style={{ marginTop: '4rem', textAlign: 'left' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Application Deadline</h3>
        <p style={{ color: '#666' }}>The deadline for the Summer 2026 batch is May 4, 2026 at 8:00 PM PT.</p>
      </div>
    </div>
  );
};

export default Apply;
