import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, addDoc } from 'firebase/firestore';

const Member = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Auth & Security State
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(sessionStorage.getItem('xf_member_authorized') === 'true');
  
  const [userPin, setUserPin] = useState('000000');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPin, setShowPin] = useState(false);
  
  const [activeTab, setActiveTab] = useState('Applications');
  const [applications, setApplications] = useState([]);
  const [profile, setProfile] = useState({ name: '', role: 'Team Member' });

  // PIN Change & OTP state
  const [newPin, setNewPin] = useState('');
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Application state
  const [appStatus, setAppStatus] = useState(null);
  const [appData, setAppData] = useState({ name: '', reason: '', experience: '' });

  const navigate = useNavigate();

  useEffect(() => {
    document.title = "XF Team Portal";
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
          // 1. Check if they are already an Admin (Strict Gate)
          const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
          if (adminDoc.exists()) {
              await auth.signOut();
              setError("Admin accounts cannot access the Team Portal.");
              setUser(null);
              return;
          }

          // 2. Check if they are a regular Founder/User
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists() && !userDoc.data().role) { // If they have a user doc but aren't a member yet
              // We allow them to STAY if they are applying, but we check if they are in member collections
          }

          const memberDoc = await getDoc(doc(db, 'members', currentUser.uid));
          if (memberDoc.exists()) {
              const data = memberDoc.data();
              setProfile(data.profile || { name: currentUser.email.split('@')[0], role: 'Team Member' });
              setUserPin(data.pin || '000000');
              setAppStatus('approved');
              if (isAuthorized) await fetchDashboardData();
              setUser(currentUser);
          } else {
              const appDoc = await getDoc(doc(db, 'memberApplications', currentUser.uid));
              if (appDoc.exists()) {
                  setAppStatus(appDoc.data().status);
                  setUser(currentUser);
              } else {
                  // New potential member (or existing User trying to apply)
                  setUser(currentUser);
              }
          }
      } else {
          setUser(null);
          setIsAuthorized(false);
          sessionStorage.removeItem('xf_member_authorized');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate, isAuthorized]);

  const handleMemberAuth = async (e) => {
    e.preventDefault();
    setError('');
    const email = e.target.email.value;
    const password = e.target.password.value;
    
    try {
        if (authMode === 'signup') {
            const res = await createUserWithEmailAndPassword(auth, email, password);
            const name = e.target.name.value;
            // No invitation code check yet, but we store the name
            alert("Account created! You can now apply for membership.");
            setAuthMode('login');
        } else {
            const res = await signInWithEmailAndPassword(auth, email, password);
            // The useEffect will handle the role-based gating and sign-out if invalid
        }
    } catch (err) { setError(err.message); }
  };

  const fetchDashboardData = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const appsList = [];
      usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.application) appsList.push({ id: doc.id, ...data.application, userEmail: data.email, userName: data.profile?.name || 'Founder' });
      });
      setApplications(appsList);
    } catch (e) { 
        console.error("Dashboard fetch error:", e);
        if (e.code === 'permission-denied') {
            setIsAuthorized(false);
            sessionStorage.removeItem('xf_member_authorized');
        }
    }
  };

  const handleMemberApply = async (e) => {
    e.preventDefault();
    try {
        await setDoc(doc(db, 'memberApplications', user.uid), { ...appData, email: user.email, status: 'pending', date: new Date().toISOString() });
        setAppStatus('pending');
        alert("Application submitted!");
    } catch (e) { alert(e.message); }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === userPin) {
        setIsAuthorized(true);
        sessionStorage.setItem('xf_member_authorized', 'true');
    } else { setPinError(true); setTimeout(() => setPinError(false), 2000); }
  };

  const startPinChange = () => {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);
      setShowOtpScreen(true);
      console.log("MEMBER OTP: " + otp);
  };

  const verifyOtp = async () => {
      if (otpInput === generatedOtp) {
          setVerifying(true);
          try {
              await updateDoc(doc(db, 'members', user.uid), { pin: newPin });
              setUserPin(newPin);
              setShowOtpScreen(false);
              setNewPin('');
              setOtpInput('');
              alert("PIN updated!");
          } catch (e) { alert(e.message); }
          finally { setVerifying(false); }
      } else alert("Invalid OTP");
  };

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f6ef' }}>Verifying...</div>;

  // VIEW 1: Member Auth Gate
  if (!user) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f6ef' }}>
        <div style={{ width: '400px', backgroundColor: '#fff', padding: '3rem', borderRadius: '12px', border: '1px solid #eee' }}>
            <div style={{ backgroundColor: '#6300dd', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', borderRadius: '8px', margin: '0 auto 2rem', fontSize: '24px' }}>X</div>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Team {authMode === 'login' ? 'Login' : 'Signup'}</h2>
            {error && <p style={{ color: '#ff4d4f', fontSize: '13px', textAlign: 'center', marginBottom: '1.5rem' }}>{error}</p>}
            <form onSubmit={handleMemberAuth}>
                {authMode === 'signup' && (
                    <>
                        <input name="name" placeholder="Full Name" required style={{ width: '100%', padding: '12px', marginBottom: '1rem', borderRadius: '6px', border: '1px solid #ddd' }} />
                        <input name="invitation" placeholder="Invitation Code (Optional)" style={{ width: '100%', padding: '12px', marginBottom: '1rem', borderRadius: '6px', border: '1px solid #ddd' }} />
                    </>
                )}
                <input name="email" type="email" placeholder="Email" required style={{ width: '100%', padding: '12px', marginBottom: '1rem', borderRadius: '6px', border: '1px solid #ddd' }} />
                <div style={{ position: 'relative', marginBottom: '2rem' }}>
                    <input name="password" type={showPassword ? "text" : "password"} placeholder="Password" required style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#888' }}>
                        {showPassword ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        )}
                    </button>
                </div>
                <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#6300dd', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                    {authMode === 'login' ? 'Sign In' : 'Create Team Account'}
                </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '14px' }}>
                {authMode === 'login' ? "Want to join the team?" : "Already have an account?"} 
                <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} style={{ background: 'none', border: 'none', color: '#6300dd', fontWeight: 'bold', cursor: 'pointer', marginLeft: '5px' }}>
                    {authMode === 'login' ? 'Register' : 'Log In'}
                </button>
            </p>
        </div>
    </div>
  );

  if (appStatus !== 'approved') {
      return (
        <div style={{ backgroundColor: '#f6f6ef', minHeight: '100vh', padding: '10rem 2rem' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#fff', padding: '3rem', borderRadius: '12px', border: '1px solid #eee' }}>
                <h2 style={{ marginBottom: '1rem' }}>Team Portal</h2>
                {appStatus === 'pending' ? <p>Reviewing your application...</p> : (
                    <form onSubmit={handleMemberApply}>
                        <p style={{ marginBottom: '1.5rem', color: '#666' }}>Apply to become an official X Foundary Team Member.</p>
                        <input type="text" placeholder="Full Name" required value={appData.name} onChange={e => setAppData({...appData, name: e.target.value})} style={{ width: '100%', padding: '12px', marginBottom: '1rem', borderRadius: '6px', border: '1px solid #ddd' }} />
                        <textarea placeholder="Why do you want to join?" required value={appData.reason} onChange={e => setAppData({...appData, reason: e.target.value})} style={{ width: '100%', height: '100px', padding: '12px', marginBottom: '1rem', borderRadius: '6px', border: '1px solid #ddd' }} />
                        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#6300dd', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Submit Application</button>
                    </form>
                )}
                <button onClick={() => auth.signOut()} style={{ marginTop: '2rem', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>Sign Out</button>
            </div>
        </div>
      );
  }

  if (!isAuthorized) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f6ef' }}>
        <form onSubmit={handlePinSubmit} style={{ width: '320px', textAlign: 'center' }}>
            <div style={{ backgroundColor: '#6300dd', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', borderRadius: '8px', margin: '0 auto 2rem' }}>X</div>
            <h2 style={{ marginBottom: '1rem' }}>Member Portal</h2>
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                <input type={showPin ? "text" : "password"} value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="••••••" maxLength={6} style={{ width: '100%', padding: '12px', textAlign: 'center', fontSize: '24px', letterSpacing: '8px', borderRadius: '8px', border: '1px solid #ddd' }} />
                <button type="button" onClick={() => setShowPin(!showPin)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#888' }}>
                    {showPin ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    )}
                </button>
            </div>
            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#6300dd', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Unlock</button>
            <button onClick={() => auth.signOut()} style={{ marginTop: '1rem', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>Sign Out</button>
        </form>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#f6f6ef', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '1.25rem 2.5rem', backgroundColor: '#fff', alignItems: 'center', borderBottom: '1px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><div style={{ backgroundColor: '#6300dd', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', borderRadius: '4px' }}>X</div><span>Team Portal</span></div>
        <div style={{ display: 'flex', gap: '2rem' }}>
            {['Applications', 'Manage Blog', 'Settings'].map(tab => (
                <span key={tab} onClick={() => setActiveTab(tab)} style={{ fontSize: '14px', fontWeight: activeTab === tab ? 'bold' : '500', color: activeTab === tab ? '#6300dd' : '#666', cursor: 'pointer' }}>{tab}</span>
            ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}><span style={{ fontSize: '14px', color: '#666' }}>{user.email}</span><button onClick={() => auth.signOut()} style={{ background: 'none', border: 'none', color: '#ff4d4f', fontWeight: '600', cursor: 'pointer' }}>Log out</button></div>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 2rem' }}>
        {activeTab === 'Applications' && (
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#fafafa' }}><tr><th style={{ padding: '1.25rem' }}>FOUNDER</th><th style={{ padding: '1.25rem' }}>COMPANY</th><th style={{ padding: '1.25rem' }}>ACTIONS</th></tr></thead>
                    <tbody>
                        {applications.map(app => (
                            <tr key={app.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                <td style={{ padding: '1.25rem' }}>{app.userName}</td>
                                <td style={{ padding: '1.25rem' }}>{app.basics?.name}</td>
                                <td style={{ padding: '1.25rem' }}>
                                    <button onClick={() => alert(JSON.stringify(app, null, 2))}>View Data</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {activeTab === 'Manage Blog' && (
            <div style={{ backgroundColor: '#fff', padding: '2.5rem', borderRadius: '12px', border: '1px solid #eee' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>Submit Blog for Approval</h2>
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    const title = e.target.title.value;
                    const content = e.target.content.value;
                    const author = profile.name;
                    try {
                        await addDoc(collection(db, 'blog'), {
                            title, content, author, status: 'pending', date: new Date().toISOString()
                        });
                        alert("Blog submitted for approval!");
                        e.target.reset();
                    } catch (err) { alert(err.message); }
                }}>
                    <div style={{ marginBottom: '1rem' }}><label>Title</label><input name="title" required style={{ width: '100%', padding: '12px' }} /></div>
                    <div style={{ marginBottom: '1rem' }}><label>Content</label><textarea name="content" required style={{ width: '100%', height: '200px', padding: '12px' }} /></div>
                    <button type="submit" style={{ backgroundColor: '#6300dd', color: '#fff', padding: '12px 24px', borderRadius: '6px', border: 'none' }}>Submit to Admin</button>
                </form>
            </div>
        )}

        {activeTab === 'Settings' && (
            <div style={{ maxWidth: '600px' }}>
                <h2>Security Settings</h2>
                {!showOtpScreen ? (
                    <>
                        <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="New PIN" maxLength={6} style={{ width: '100%', padding: '12px', marginBottom: '1rem', textAlign: 'center' }} />
                        <button onClick={startPinChange} style={{ width: '100%', backgroundColor: '#000', color: '#fff', padding: '12px' }}>Change Access PIN</button>
                    </>
                ) : (
                    <div>
                        <input type="text" value={otpInput} onChange={e => setOtpInput(e.target.value)} placeholder="OTP Code" maxLength={6} style={{ width: '100%', padding: '12px', textAlign: 'center', marginBottom: '1rem' }} />
                        <button onClick={verifyOtp} style={{ width: '100%', backgroundColor: '#52c41a', color: '#fff', padding: '12px' }}>Verify & Update</button>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default Member;
