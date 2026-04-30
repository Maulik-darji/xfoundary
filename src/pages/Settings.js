import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const Settings = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const navigate = useNavigate();

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [profilePic, setProfilePic] = useState(null);

  useEffect(() => {
    document.title = "Settings";
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser && !loading) {
        navigate('/login');
      }
      setUser(currentUser);
      
      if (currentUser) {
        // Fetch existing profile from Firestore
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFirstName(data.firstName || currentUser.displayName?.split(' ')[0] || '');
          setLastName(data.lastName || currentUser.displayName?.split(' ')[1] || '');
          setLinkedin(data.linkedin || '');
          setProfilePic(data.profilePic || null);
        } else {
            setFirstName(currentUser.displayName?.split(' ')[0] || '');
            setLastName(currentUser.displayName?.split(' ')[1] || '');
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate, loading]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        firstName,
        lastName,
        linkedin,
        profilePic,
        email: user.email,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Error saving profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (user?.email) {
      try {
        await sendPasswordResetEmail(auth, user.email);
        alert('Password reset email sent!');
      } catch (error) {
        alert('Error sending reset email: ' + error.message);
      }
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (Firestore has a 1MB limit for entire document)
      if (file.size > 800000) {
        alert("Image too large. Please select an image under 800KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) return null;

  const inputStyle = {
    width: '100%',
    padding: '8px 0',
    border: 'none',
    borderBottom: '1px solid #111',
    backgroundColor: 'transparent',
    fontSize: '14px',
    color: '#333',
    outline: 'none',
    marginBottom: '20px',
    fontFamily: 'Inter, sans-serif'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    color: '#999',
    marginBottom: '4px',
    fontFamily: 'Inter, sans-serif'
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
          <Link to="/" style={{ backgroundColor: '#6300dd', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '18px', textDecoration: 'none' }}>X</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
            <span>{firstName} {lastName}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#999' }}><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </div>
          <span style={{ color: '#ccc' }}>|</span>
          <Link to="/" onClick={() => auth.signOut()} style={{ textDecoration: 'none', color: '#000', fontWeight: '500', fontStyle: 'italic', fontFamily: 'Newsreader, serif', fontSize: '15px' }}>Log out</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '600px', margin: '4rem auto', backgroundColor: '#fff', padding: '3rem', borderRadius: '4px', border: '1px solid #111' }}>
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '3rem' }}>
          {/* Profile Picture */}
          <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
            <div style={{ width: '100%', height: '100%', backgroundColor: '#eee', borderRadius: '4px', border: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {profilePic ? (
                <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              )}
            </div>
            <label htmlFor="profile-upload" style={{ position: 'absolute', bottom: '-8px', right: '-8px', backgroundColor: '#fff', padding: '4px', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6300dd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </label>
            <input 
              id="profile-upload" 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handleImageChange}
            />
          </div>

          {/* Fields */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>First Name</label>
                <input type="text" style={inputStyle} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Last Name</label>
                <input type="text" style={inputStyle} value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" style={{ ...inputStyle, color: '#ccc' }} value={user?.email || ''} readOnly />
            </div>
            <div>
              <label style={labelStyle}>Your LinkedIn Profile URL</label>
              <input type="text" style={inputStyle} value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '1.5rem' }}>
              <button 
                onClick={handleSave} 
                disabled={saving}
                style={{ backgroundColor: '#000', color: '#fff', border: 'none', padding: '11px 32px', borderRadius: '30px', fontWeight: '500', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '15px', opacity: saving ? 0.7 : 1, fontFamily: 'Newsreader, serif', fontStyle: 'italic' }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => navigate(-1)} style={{ backgroundColor: 'transparent', color: '#000', border: 'none', padding: '0', fontWeight: '500', cursor: 'pointer', fontSize: '15px', fontFamily: 'Newsreader, serif', fontStyle: 'italic' }}>Cancel</button>
            </div>
          </div>
        </div>

        {/* Change Password Section */}
        <div style={{ borderTop: '1px solid #111', paddingTop: '2rem' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>Change Password</h3>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '1.5rem' }}>Click the button below to receive a password reset email.</p>
          <button onClick={handleChangePassword} style={{ backgroundColor: '#000', color: '#fff', border: 'none', padding: '11px 32px', borderRadius: '30px', fontWeight: '500', cursor: 'pointer', fontSize: '15px', fontFamily: 'Newsreader, serif', fontStyle: 'italic' }}>Change</button>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
          <div style={{ 
            position: 'fixed', 
            bottom: '40px', 
            right: '40px', 
            backgroundColor: '#fff', 
            border: '1px solid #eee', 
            padding: '12px 20px', 
            borderRadius: '8px', 
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 2000,
            animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Changes saved</span>
            <span onClick={() => setShowToast(false)} style={{ marginLeft: '10px', color: '#ccc', cursor: 'pointer', fontSize: '20px', lineHeight: 0 }}>×</span>
          </div>
        )}

        <style>{`
          @keyframes slideUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
    </div>
  );
};

export default Settings;
