import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db, functions, storage } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const Settings = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [modal, setModal] = useState({ visible: false, message: '', type: 'info' });
  const navigate = useNavigate();

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [twitter, setTwitter] = useState('');
  const [instagram, setInstagram] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Email Change States
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [isAwaitingEmailOTP, setIsAwaitingEmailOTP] = useState(false);
  const [emailOTP, setEmailOTP] = useState('');
  const [emailChangeError, setEmailChangeError] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isResetSent, setIsResetSent] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

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
          setUsername(data.username || '');
          setLinkedin(data.linkedin || '');
          setTwitter(data.twitter || '');
          setInstagram(data.instagram || '');
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

  const showAlert = (message, type = 'info') => {
    setModal({ visible: true, message, type });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let finalProfilePic = profilePic;

      // If a new file was selected, upload it to Firebase Storage
      if (selectedFile) {
        const storageRef = ref(storage, `profile_images/${user.uid}`);
        await uploadBytes(storageRef, selectedFile);
        finalProfilePic = await getDownloadURL(storageRef);
        setProfilePic(finalProfilePic);
        setSelectedFile(null);
      }

      await setDoc(doc(db, 'users', user.uid), {
        firstName,
        lastName,
        username,
        linkedin,
        twitter,
        instagram,
        profilePic: finalProfilePic,
        email: user.email,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Error saving profile:", error);
      showAlert("Error saving profile. Please try again.", 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestEmailChange = async () => {
    if (!newEmailInput || newEmailInput === user?.email) return;
    setIsChangingEmail(true);
    setEmailChangeError('');
    try {
      const requestOtp = httpsCallable(functions, 'requestEmailChangeOTP');
      await requestOtp({ newEmail: newEmailInput });
      setIsAwaitingEmailOTP(true);
      setShowToast(true);
      // Hack to show specific message in toast (if toast is simple boolean currently, we'll keep it simple)
    } catch (err) {
      setEmailChangeError(err.message);
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleVerifyEmailChange = async () => {
    if (!emailOTP || emailOTP.length !== 6) {
      setEmailChangeError('Please enter a valid 6-digit code.');
      return;
    }
    setIsChangingEmail(true);
    setEmailChangeError('');
    try {
      const verifyOtp = httpsCallable(functions, 'verifyEmailChangeOTP');
      const res = await verifyOtp({ otp: emailOTP });
      if (res.data.success) {
        setIsEditingEmail(false);
        setIsAwaitingEmailOTP(false);
        setNewEmailInput('');
        setEmailOTP('');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        // Force reload to get new email in auth state
        window.location.reload();
      }
    } catch (err) {
      setEmailChangeError(err.message);
    } finally {
      setIsChangingEmail(false);
    }
  };

  const cancelEmailChange = () => {
    setIsEditingEmail(false);
    setIsAwaitingEmailOTP(false);
    setNewEmailInput('');
    setEmailOTP('');
    setEmailChangeError('');
  };

  const handleChangePassword = async () => {
    if (user?.email) {
      setIsSendingReset(true);
      try {
        const resetFn = httpsCallable(functions, 'sendPasswordResetEmailCustom');
        await resetFn({ email: user.email });
        setIsResetSent(true);
        showAlert('Password reset email sent!', 'success');
        setTimeout(() => {
          setIsResetSent(false);
          setIsSendingReset(false);
        }, 3000);
      } catch (error) {
        showAlert('Error sending reset email: ' + error.message, 'error');
        setIsSendingReset(false);
      }
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const [activeSection, setActiveSection] = useState('profile');

  if (loading) return null;

  const sidebarItemStyle = (section) => ({
    padding: '12px 20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: activeSection === section ? '700' : '500',
    color: activeSection === section ? '#6300dd' : '#666',
    backgroundColor: activeSection === section ? 'rgba(99, 0, 221, 0.05)' : 'transparent',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  });

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#fff',
    fontSize: '14px',
    color: '#333',
    outline: 'none',
    marginBottom: '20px',
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.2s ease'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#111',
    marginBottom: '8px',
    fontFamily: 'Inter, sans-serif'
  };

  const sectionHeaderStyle = {
    fontSize: '24px',
    fontWeight: '800',
    marginBottom: '8px',
    color: '#000'
  };

  const sectionSubheaderStyle = {
    fontSize: '14px',
    color: '#666',
    marginBottom: '2.5rem'
  };

  return (
    <div style={{ backgroundColor: '#f5f5ee', minHeight: '100vh', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <nav style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        padding: '0.75rem 2.5rem', 
        backgroundColor: '#f5f5ee',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => navigate(-1)} 
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '8px',
              borderRadius: '8px',
              color: '#666',
              transition: 'all 0.2s ease',
              marginRight: '0.5rem'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
          <Link to="/" style={{ backgroundColor: '#6300dd', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '18px', textDecoration: 'none' }}>X</Link>
          <span style={{ fontWeight: '700', fontSize: '18px' }}>Settings</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            <span>{firstName} {lastName}</span>
          </div>
          <span style={{ color: '#eee' }}>|</span>
          <Link to="/" onClick={() => auth.signOut()} style={{ textDecoration: 'none', color: '#666', fontWeight: '500', fontSize: '14px' }}>Log out</Link>
        </div>
      </nav>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <aside style={{ width: '280px', borderRight: '1px solid rgba(0,0,0,0.05)', padding: '2rem 1.5rem', position: 'sticky', top: '57px', height: 'calc(100vh - 57px)', backgroundColor: '#f5f5ee' }}>
          <div style={sidebarItemStyle('profile')} onClick={() => setActiveSection('profile')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            Profile
          </div>
          <div style={sidebarItemStyle('account')} onClick={() => setActiveSection('account')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            Account
          </div>
          <div style={sidebarItemStyle('security')} onClick={() => setActiveSection('security')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Security
          </div>
        </aside>

        {/* Content Area */}
        <main style={{ flex: 1, padding: '3rem 5rem', maxWidth: '900px' }}>
          {activeSection === 'profile' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <h1 style={sectionHeaderStyle}>Public Profile</h1>
              <p style={sectionSubheaderStyle}>Manage how you appear to others on X Foundary.</p>
              
              <div style={{ display: 'flex', gap: '3rem', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
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
                    <label style={labelStyle}>Username</label>
                    <input type="text" style={inputStyle} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a unique username" />
                  </div>

                  <div>
                    <label style={labelStyle}>LinkedIn Profile URL</label>
                    <input type="text" style={inputStyle} value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
                  </div>

                  <div>
                    <label style={labelStyle}>Twitter Handle</label>
                    <input type="text" style={inputStyle} value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="@username" />
                  </div>

                  <div>
                    <label style={labelStyle}>Instagram Handle</label>
                    <input type="text" style={inputStyle} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@username" />
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <button 
                      onClick={handleSave} 
                      disabled={saving}
                      style={{ backgroundColor: '#6300dd', color: '#fff', border: 'none', padding: '12px 32px', borderRadius: '8px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '15px', opacity: saving ? 0.7 : 1 }}
                    >
                      {saving ? 'Saving...' : 'Update Profile'}
                    </button>
                  </div>
                </div>

                <div style={{ width: '200px', textAlign: 'center' }}>
                  <label style={labelStyle}>Profile Picture</label>
                  <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 1.5rem' }}>
                    <div style={{ width: '100%', height: '100%', backgroundColor: '#f3f3f3', borderRadius: '50%', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {profilePic ? (
                        <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      )}
                    </div>
                    <label htmlFor="profile-upload" style={{ position: 'absolute', bottom: '0', right: '0', backgroundColor: '#6300dd', padding: '8px', borderRadius: '50%', boxShadow: '0 4px 10px rgba(99, 0, 221, 0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </label>
                    <input id="profile-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                  </div>
                  <p style={{ fontSize: '12px', color: '#999' }}>JPG or PNG. Max size 800KB.</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'account' && (
            <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: '500px' }}>
              <h1 style={sectionHeaderStyle}>Account Settings</h1>
              <p style={sectionSubheaderStyle}>Update your email address and primary account details.</p>
              
              <label style={labelStyle}>Email Address</label>
              {!isEditingEmail ? (
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', backgroundColor: '#f9f9f9', padding: '12px 16px', borderRadius: '8px', border: '1px solid #eee' }}>
                  <span style={{ fontSize: '14px', color: '#333', flex: 1 }}>{user?.email}</span>
                  <button onClick={() => setIsEditingEmail(true)} style={{ background: 'none', border: 'none', color: '#6300dd', fontSize: '13px', fontWeight: '700', cursor: 'pointer', padding: '0' }}>Change Email</button>
                </div>
              ) : (
                <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '12px', border: '1px solid #6300dd' }}>
                  {!isAwaitingEmailOTP ? (
                    <>
                      <input type="email" style={{ ...inputStyle, marginBottom: '15px' }} placeholder="Enter new email address" value={newEmailInput} onChange={(e) => setNewEmailInput(e.target.value)} />
                      {emailChangeError && <p style={{ color: '#ff4d4f', fontSize: '12px', margin: '0 0 15px 0' }}>{emailChangeError}</p>}
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={handleRequestEmailChange} disabled={isChangingEmail} style={{ backgroundColor: '#6300dd', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontSize: '14px', fontWeight: '700', cursor: isChangingEmail ? 'not-allowed' : 'pointer' }}>
                          {isChangingEmail ? 'Sending...' : 'Send Verification Code'}
                        </button>
                        <button onClick={cancelEmailChange} style={{ background: 'none', border: 'none', color: '#666', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: '14px', color: '#333', margin: '0 0 15px 0', fontWeight: '500' }}>Enter the 6-digit code sent to <strong>{newEmailInput}</strong></p>
                      <input type="text" maxLength="6" style={{ ...inputStyle, marginBottom: '15px', letterSpacing: '8px', fontSize: '20px', fontWeight: '800', textAlign: 'center' }} placeholder="000000" value={emailOTP} onChange={(e) => setEmailOTP(e.target.value)} />
                      {emailChangeError && <p style={{ color: '#ff4d4f', fontSize: '12px', margin: '0 0 15px 0' }}>{emailChangeError}</p>}
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={handleVerifyEmailChange} disabled={isChangingEmail} style={{ backgroundColor: '#6300dd', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontSize: '14px', fontWeight: '700', cursor: isChangingEmail ? 'not-allowed' : 'pointer' }}>
                          {isChangingEmail ? 'Verifying...' : 'Verify & Update'}
                        </button>
                        <button onClick={cancelEmailChange} style={{ background: 'none', border: 'none', color: '#666', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {activeSection === 'security' && (
            <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: '500px' }}>
              <h1 style={sectionHeaderStyle}>Security</h1>
              <p style={sectionSubheaderStyle}>Manage your password and account security.</p>
              
              <div style={{ padding: '24px', backgroundColor: '#f9f9f9', borderRadius: '12px', border: '1px solid #eee' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>Reset Password</h4>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                  We'll send you an email with a link to reset your password. You'll be logged out of all other sessions.
                </p>
                <button 
                  onClick={handleChangePassword} 
                  disabled={isSendingReset || isResetSent}
                  style={{ 
                    backgroundColor: isResetSent ? '#ccc' : '#000', 
                    color: '#fff', 
                    border: 'none', 
                    padding: '12px 24px', 
                    borderRadius: '8px', 
                    fontWeight: '700', 
                    cursor: (isSendingReset || isResetSent) ? 'not-allowed' : 'pointer', 
                    fontSize: '14px',
                    transition: 'all 0.3s'
                  }}
                >
                  {isResetSent ? 'Sent' : (isSendingReset ? 'Sending...' : 'Request Password Reset')}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div style={{ 
          position: 'fixed', 
          bottom: '40px', 
          right: '40px', 
          backgroundColor: '#000', 
          color: '#fff',
          padding: '12px 24px', 
          borderRadius: '12px', 
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 2000,
          animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span style={{ fontSize: '14px', fontWeight: 700 }}>Changes applied successfully</span>
        </div>
      )}

      {/* Custom Modal */}
      {modal.visible && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          backgroundColor: 'rgba(0,0,0,0.4)', 
          backdropFilter: 'blur(4px)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 3000,
          animation: 'fadeInOverlay 0.2s ease'
        }}>
          <div style={{ 
            backgroundColor: '#fff', 
            padding: '2rem', 
            borderRadius: '16px', 
            width: '100%', 
            maxWidth: '400px', 
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            textAlign: 'center',
            animation: 'modalScale 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '50%', 
              backgroundColor: modal.type === 'error' ? '#fff1f0' : '#f0f7ff', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 1.5rem' 
            }}>
              {modal.type === 'error' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff4d4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6300dd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              )}
            </div>
            <p style={{ fontSize: '15px', color: '#111', fontWeight: '500', marginBottom: '1.5rem', lineHeight: '1.6' }}>{modal.message}</p>
            <button 
              onClick={() => setModal({ ...modal, visible: false })}
              style={{ 
                backgroundColor: '#000', 
                color: '#fff', 
                border: 'none', 
                padding: '10px 32px', 
                borderRadius: '30px', 
                fontWeight: '700', 
                cursor: 'pointer', 
                fontSize: '14px',
                width: '100%'
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalScale {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default Settings;
