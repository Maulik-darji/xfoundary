import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AccountSettings = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        navigate('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  if (loading) return null;

  const inputStyle = {
    width: '100%',
    padding: '8px 0',
    border: 'none',
    borderBottom: '1px solid #ddd',
    backgroundColor: 'transparent',
    fontSize: '14px',
    color: '#333',
    outline: 'none',
    marginBottom: '20px'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    color: '#999',
    marginBottom: '4px'
  };

  return (
    <div style={{ backgroundColor: '#f6f6ef', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* Top Navbar */}
      <nav style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        padding: '1.25rem 2.5rem', 
        backgroundColor: '#f6f6ef',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/home" style={{ backgroundColor: '#6300dd', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '18px', textDecoration: 'none' }}>X</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
            <span>{user?.displayName || user?.email?.split('@')[0]}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#999' }}><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </div>
          <span style={{ color: '#ccc' }}>|</span>
          <Link to="/" onClick={() => auth.signOut()} style={{ textDecoration: 'none', color: '#000', fontWeight: 'bold' }}>Log out</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '600px', margin: '4rem auto', backgroundColor: '#fff', padding: '3rem', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '3rem' }}>
          {/* Profile Picture */}
          <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
            <div style={{ width: '100%', height: '100%', backgroundColor: '#eee', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <div style={{ position: 'absolute', bottom: '-8px', right: '-8px', backgroundColor: '#fff', padding: '4px', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6300dd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </div>
          </div>

          {/* Fields */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>First Name</label>
                <input type="text" style={inputStyle} defaultValue={user?.displayName?.split(' ')[0] || ''} />
              </div>
              <div>
                <label style={labelStyle}>Last Name</label>
                <input type="text" style={inputStyle} defaultValue={user?.displayName?.split(' ')[1] || ''} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" style={{ ...inputStyle, color: '#ccc' }} value={user?.email || ''} readOnly />
            </div>
            <div>
              <label style={labelStyle}>Your LinkedIn Profile URL</label>
              <input type="text" style={inputStyle} placeholder="https://www.linkedin.com/in/..." />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '1.5rem' }}>
              <button style={{ backgroundColor: '#6300dd', color: '#fff', border: 'none', padding: '11px 32px', borderRadius: '30px', fontWeight: '600', fontSize: '16px', cursor: 'pointer', fontFamily: 'Newsreader, serif', fontStyle: 'italic' }}>Save</button>
              <button onClick={() => navigate(-1)} style={{ backgroundColor: 'transparent', color: '#6300dd', border: 'none', padding: '0', fontWeight: '600', fontSize: '16px', cursor: 'pointer', fontFamily: 'Newsreader, serif', fontStyle: 'italic' }}>Cancel</button>
            </div>
          </div>
        </div>

        {/* Change Password Section */}
        <div style={{ borderTop: '1px solid #eee', paddingTop: '2rem' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>Change Password</h3>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '1.5rem' }}>Click the button below to receive a password reset email.</p>
          <button style={{ backgroundColor: '#6300dd', color: '#fff', border: 'none', padding: '11px 32px', borderRadius: '30px', fontWeight: '600', fontSize: '16px', cursor: 'pointer', fontFamily: 'Newsreader, serif', fontStyle: 'italic' }}>Change</button>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
