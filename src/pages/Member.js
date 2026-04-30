import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Blog from './Blog';
import Directory from './Directory';

const ToastNotification = ({ message }) => {
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      backgroundColor: '#333',
      color: '#fff',
      padding: '16px 24px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 9999,
      fontSize: '14px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      <div style={{ backgroundColor: '#52c41a', width: '8px', height: '8px', borderRadius: '50%' }}></div>
      {message}
    </div>
  );
};

const Member = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Auth & Security State
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(sessionStorage.getItem('xf_member_authorized') === 'true');
  
  const [userPin, setUserPin] = useState('000000');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPin, setShowPin] = useState(false);
  
  const [activeTab, setActiveTab] = useState(localStorage.getItem('xf_member_active_tab') || 'Applications');
  const [applications, setApplications] = useState([]);
  const [profile, setProfile] = useState({ name: '', role: 'Team Member' });
  const [myBlogs, setMyBlogs] = useState([]);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [profileForm, setProfileForm] = useState({ name: '', role: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [hoveredAppId, setHoveredAppId] = useState(null);
  const [remarkModal, setRemarkModal] = useState(null); // { appId, action, founderName, companyName }
  const [remarkText, setRemarkText] = useState('');
  const [revertModal, setRevertModal] = useState(null); // { appId, founderName, companyName }
  const [deleteModal, setDeleteModal] = useState(null); // { blogId, blogTitle }
  const [selectedProfileFile, setSelectedProfileFile] = useState(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const profileImageInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('xf_member_active_tab', activeTab);
  }, [activeTab]);

  // PIN Change & OTP state
  const [newPin, setNewPin] = useState('');
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Application state
  const [appStatus, setAppStatus] = useState(null);
  const [appData, setAppData] = useState({ name: '', reason: '', experience: '' });
  const [selectedApp, setSelectedApp] = useState(null);

  const navigate = useNavigate();

  const showToast = (msg) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(''), 4000);
  };

  useEffect(() => {
    document.title = "XF Team Portal";
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
          // 1. Check if they are already an Admin (Strict Gate)
          const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
          if (adminDoc.exists()) {
              setError("Admin accounts cannot access the Team Portal.");
              setUser(null);
              setLoading(false);
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
              const p = data.profile || { name: currentUser.email.split('@')[0], role: 'Team Member' };
              setProfile(p);
              setProfileForm({ name: p.name || '', role: p.role || 'Team Member' });
              setProfileImageUrl(data.profileImage || '');
              setUserPin(data.pin || '000000');
              setAppStatus('approved');
              if (isAuthorized) { await fetchDashboardData(); await fetchMyBlogs(currentUser.uid); }
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
            showToast("Account created! You can now apply for membership.");
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
        if (data.application) appsList.push({ 
            id: doc.id, 
            ...data.application, 
            userEmail: data.email, 
            userName: data.profile?.name || 'Founder',
            profileData: data.profile || {}
        });
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

  const fetchMyBlogs = async (uid) => {
    try {
      const snap = await getDocs(collection(db, 'blog'));
      const mine = [];
      snap.forEach(d => { const b = d.data(); if (b.userId === uid) mine.push({ id: d.id, ...b }); });
      mine.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setMyBlogs(mine);
    } catch (e) { console.error(e); }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const updatedProfile = { ...profile, ...profileForm };
      await updateDoc(doc(db, 'members', user.uid), { 
        profile: updatedProfile,
        profileImage: profileImageUrl 
      });
      setProfile(updatedProfile);
      showToast('Profile saved!');
    } catch (e) { showToast(e.message); }
    finally { setSavingProfile(false); }
  };

  const handleMemberApply = async (e) => {
    e.preventDefault();
    try {
        await setDoc(doc(db, 'memberApplications', user.uid), { ...appData, email: user.email, status: 'pending', date: new Date().toISOString() });
        setAppStatus('pending');
        showToast("Application submitted!");
    } catch (e) { showToast(e.message); }
  };

  const handleWithdraw = async () => {
      if (window.confirm("Are you sure you want to withdraw your application?")) {
          try {
              await updateDoc(doc(db, 'memberApplications', user.uid), { status: 'withdrawn' });
              setAppStatus(null);
              showToast("Application withdrawn.");
          } catch (e) { showToast(e.message); }
      }
  };

  const handleMemberAppStatus = async (appId, newStatus, remark) => {
    try {
        await updateDoc(doc(db, 'users', appId), { 'application.status': newStatus });
        // Write to action log
        await addDoc(collection(db, 'applicationLogs'), {
            userId: appId,
            action: newStatus,
            actionBy: profile.name || user.email,
            actionByUid: user.uid,
            reason: remark || '',
            timestamp: new Date().toISOString(),
            founderName: applications.find(a => a.id === appId)?.userName || '',
            companyName: applications.find(a => a.id === appId)?.companyName || ''
        });
        showToast(`Application marked as ${newStatus}!`);
        setRemarkModal(null);
        setRemarkText('');
        await fetchDashboardData();
    } catch (e) { showToast(e.message); }
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
              showToast("PIN updated!");
          } catch (e) { showToast(e.message); }
          finally { setVerifying(false); }
      } else showToast("Invalid OTP");
  };

  const handleProfileImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setSelectedProfileFile(file);
    const reader = new FileReader();
    reader.onload = () => {
        setProfilePreviewUrl(reader.result);
        setShowPreviewModal(true);
    };
    reader.readAsDataURL(file);
  };

  const confirmProfileUpload = async () => {
    if (!selectedProfileFile && !profilePreviewUrl) return;
    
    console.log("Starting profile upload...");
    setIsUploadingImage(true);
    setShowPreviewModal(false);
    setShowCropModal(false);
    
    try {
        let fileToUpload = selectedProfileFile;
        
        // If it's a dataURL (from crop), convert to blob manually for better compatibility
        if (profilePreviewUrl && profilePreviewUrl.startsWith('data:')) {
            console.log("Converting dataURL to blob...");
            const parts = profilePreviewUrl.split(',');
            const byteString = atob(parts[1]);
            const mimeString = parts[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            fileToUpload = new Blob([ab], { type: mimeString });
        }

        if (!fileToUpload) throw new Error("No file selected for upload.");

        const fileName = selectedProfileFile?.name || `profile_${Date.now()}.png`;
        const fileRef = ref(storage, `profiles/${user.uid}/${Date.now()}-${fileName}`);
        
        console.log("Uploading to path:", fileRef.fullPath);
        const uploadResult = await uploadBytes(fileRef, fileToUpload);
        console.log("Upload successful:", uploadResult);
        
        const url = await getDownloadURL(fileRef);
        console.log("Download URL obtained:", url);
        
        setProfileImageUrl(url);
        showToast("Image uploaded! Click Save Profile to finish.");
        setProfilePreviewUrl(null);
        setSelectedProfileFile(null);
    } catch (e) { 
        console.error("Profile upload error:", e);
        showToast(`Upload failed: ${e.message}`); 
    }
    finally { 
        setIsUploadingImage(false); 
        console.log("Upload process finished.");
    }
  };

  const handleDeleteBlog = async (blogId, blogTitle) => {
    try {
        await deleteDoc(doc(db, 'blog', blogId));
        showToast("Blog post deleted!");
        await fetchMyBlogs(user.uid);
        setDeleteModal(null);
    } catch (e) { showToast(e.message); }
  };

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f6ef' }}>Verifying...</div>;

  // VIEW 1: Member Auth Gate
  if (!user) return (
    <>
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f6ef' }}>
        <div style={{ width: '400px', backgroundColor: '#fff', padding: '3rem', borderRadius: '12px', border: '1px solid #eee' }}>
            <div style={{ backgroundColor: '#6300dd', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', borderRadius: '8px', margin: '0 auto 2rem', fontSize: '24px' }}>X</div>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Team {authMode === 'login' ? 'Login' : 'Signup'}</h2>
            {error && <p style={{ color: '#ff4d4f', fontSize: '13px', textAlign: 'center', marginBottom: '1.5rem' }}>{error}</p>}
            <form onSubmit={handleMemberAuth}>
                {authMode === 'signup' && (
                    <>
                        <input name="name" placeholder="Full Name" required style={{ width: '100%', padding: '12px', marginBottom: '1rem', borderRadius: '6px', border: '1px solid #ddd' }} />
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
    <ToastNotification message={toastMessage} />
    </>
  );

  if (appStatus !== 'approved') {
      return (
        <>
        <div style={{ backgroundColor: '#f6f6ef', minHeight: '100vh', padding: '10rem 2rem' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#fff', padding: '3rem', borderRadius: '12px', border: '1px solid #eee' }}>
                <h2 style={{ marginBottom: '1rem' }}>Team Portal</h2>
                {appStatus === 'pending' ? (
                    <div>
                        <p style={{ marginBottom: '2rem', color: '#666' }}>Reviewing your application...</p>
                        <button onClick={handleWithdraw} style={{ width: '100%', padding: '12px', backgroundColor: '#fff', color: '#ff4d4f', border: '1px solid #ff4d4f', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Withdraw Application</button>
                    </div>
                ) : (
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
        <ToastNotification message={toastMessage} />
        </>
      );
  }

  if (!isAuthorized) return (
    <>
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
    <ToastNotification message={toastMessage} />
    </>
  );

  return (
    <div style={{ backgroundColor: '#f6f6ef', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '1.25rem 2.5rem', backgroundColor: '#fff', alignItems: 'center', borderBottom: '1px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><div style={{ backgroundColor: '#6300dd', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', borderRadius: '4px' }}>X</div><span>Team Portal</span></div>
        <div style={{ display: 'flex', gap: '2rem' }}>
            {['Applications', 'Manage Blog', 'My Blog', 'Startup Directory', 'Settings'].map(tab => (
                <span key={tab} onClick={() => setActiveTab(tab)} style={{ fontSize: '14px', fontWeight: '600', textShadow: activeTab === tab ? '0 0 0.5px #6300dd' : 'none', color: activeTab === tab ? '#6300dd' : '#666', cursor: 'pointer', transition: 'color 0.2s' }}>{tab}</span>
            ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}><span style={{ fontSize: '14px', color: '#666' }}>{profile.name || user.email}</span><button onClick={() => auth.signOut()} style={{ background: 'none', border: 'none', color: '#ff4d4f', fontWeight: '600', cursor: 'pointer' }}>Log out</button></div>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 2rem' }}>
        {activeTab === 'Applications' && (
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #eee', overflow: 'visible' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#fafafa' }}><tr>
                        <th style={{ padding: '1.25rem', fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>FOUNDER</th>
                        <th style={{ padding: '1.25rem', fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>COMPANY</th>
                        <th style={{ padding: '1.25rem', fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>STATUS</th>
                        <th style={{ padding: '1.25rem', fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>ACTIONS</th>
                    </tr></thead>
                    <tbody>
                        {applications.map(app => {
                            const isPending = !app.status || app.status === 'pending';
                            const statusColors = {
                                pending: { color: '#ff9500', bg: 'rgba(255,149,0,0.08)', label: 'Pending Review' },
                                approved: { color: '#34c759', bg: 'rgba(52,199,89,0.08)', label: 'Approved' },
                                hold: { color: '#007aff', bg: 'rgba(0,122,255,0.08)', label: 'On Hold' },
                                rejected: { color: '#ff3b30', bg: 'rgba(255,59,48,0.08)', label: 'Rejected' },
                            };
                            const sc = statusColors[app.status] || statusColors.pending;
                            const isHovered = hoveredAppId === app.id;
                            return (
                                <tr key={app.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                    <td style={{ padding: '1.25rem' }}>{app.userName}</td>
                                    <td style={{ padding: '1.25rem', fontWeight: '600' }}>{app.companyName || 'N/A'}</td>
                                    <td style={{ padding: '1.25rem' }}>
                                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
                                    </td>
                                    <td style={{ padding: '1.25rem', position: 'relative' }}>
                                        <div
                                            style={{ display: 'inline-block', position: 'relative' }}
                                            onMouseEnter={() => setHoveredAppId(app.id)}
                                            onMouseLeave={() => setHoveredAppId(null)}
                                        >
                                            <button
                                                onClick={() => setSelectedApp(app)}
                                                style={{ padding: '7px 16px', backgroundColor: 'rgba(99, 0, 221, 0.08)', color: '#6300dd', border: '1px solid rgba(99, 0, 221, 0.2)', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                            >
                                                View
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                            </button>

                                            {/* Hover Dropdown */}
                                            {isHovered && isPending && (
                                                <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 200, backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #eee', overflow: 'hidden', minWidth: '160px', marginTop: '4px', animation: 'fadeIn 0.15s ease' }}>
                                                    <div
                                                        onClick={() => { setRemarkModal({ appId: app.id, action: 'approved', founderName: app.userName, companyName: app.companyName }); setHoveredAppId(null); }}
                                                        style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#34c759', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.15s' }}
                                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(52,199,89,0.08)'}
                                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                                        Approve
                                                    </div>
                                                    <div
                                                        onClick={() => { setRemarkModal({ appId: app.id, action: 'hold', founderName: app.userName, companyName: app.companyName }); setHoveredAppId(null); }}
                                                        style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#007aff', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.15s' }}
                                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,122,255,0.08)'}
                                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                                        Hold
                                                    </div>
                                                    <div
                                                        onClick={() => { setRemarkModal({ appId: app.id, action: 'rejected', founderName: app.userName, companyName: app.companyName }); setHoveredAppId(null); }}
                                                        style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#ff3b30', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.15s' }}
                                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,59,48,0.08)'}
                                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                                                        Reject
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {!isPending && app.status !== 'approved' && (
                                            <button
                                                onClick={() => {
                                                    setRevertModal({ appId: app.id, founderName: app.userName, companyName: app.companyName });
                                                }}
                                                style={{ padding: '7px 16px', backgroundColor: 'rgba(100, 100, 100, 0.08)', color: '#555', border: '1px solid rgba(100, 100, 100, 0.2)', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}
                                            >
                                                Revert
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}

        {/* Remark Modal */}
        {remarkModal && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
                <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '2rem', width: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', animation: 'fadeInUp 0.2s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>
                                {remarkModal.action === 'approved' ? '✅ Approve' : remarkModal.action === 'hold' ? '⏸ Hold' : '❌ Reject'} Application
                            </h3>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#888' }}>{remarkModal.founderName} — {remarkModal.companyName}</p>
                        </div>
                        <button onClick={() => { setRemarkModal(null); setRemarkText(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '20px', lineHeight: 1 }}>×</button>
                    </div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason / Remark</label>
                    <textarea
                        autoFocus
                        value={remarkText}
                        onChange={e => setRemarkText(e.target.value)}
                        placeholder={`Add a reason for ${remarkModal.action === 'approved' ? 'approving' : remarkModal.action === 'hold' ? 'holding' : 'rejecting'} this application...`}
                        style={{ width: '100%', marginTop: '8px', padding: '12px', border: '1px solid #eee', borderRadius: '10px', fontSize: '14px', lineHeight: '1.6', resize: 'none', minHeight: '100px', outline: 'none', fontFamily: 'Inter, sans-serif' }}
                    />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '1.25rem' }}>
                        <button
                            onClick={() => { setRemarkModal(null); setRemarkText(''); }}
                            style={{ flex: 1, padding: '11px', border: '1px solid #eee', borderRadius: '8px', background: 'none', cursor: 'pointer', fontWeight: '600', color: '#666' }}
                        >Cancel</button>
                        <button
                            onClick={() => handleMemberAppStatus(remarkModal.appId, remarkModal.action, remarkText)}
                            style={{
                                flex: 2, padding: '11px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', color: '#fff',
                                backgroundColor: remarkModal.action === 'approved' ? '#34c759' : remarkModal.action === 'hold' ? '#007aff' : '#ff3b30'
                            }}
                        >
                            Confirm {remarkModal.action === 'approved' ? 'Approval' : remarkModal.action === 'hold' ? 'Hold' : 'Rejection'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Revert Modal */}
        {revertModal && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
                <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '2rem', width: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', animation: 'fadeInUp 0.2s ease', textAlign: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(255, 149, 0, 0.1)', color: '#ff9500', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                    </div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: '800', color: '#111' }}>Revert to Pending?</h3>
                    <p style={{ margin: 0, fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
                        Are you sure you want to revert the application for <strong>{revertModal.companyName}</strong> by {revertModal.founderName}? They will be placed back into the pending review queue.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '2rem' }}>
                        <button
                            onClick={() => setRevertModal(null)}
                            style={{ flex: 1, padding: '11px', border: '1px solid #eee', borderRadius: '8px', background: 'none', cursor: 'pointer', fontWeight: '600', color: '#666' }}
                        >Cancel</button>
                        <button
                            onClick={() => {
                                handleMemberAppStatus(revertModal.appId, 'pending', 'Reverted to pending');
                                setRevertModal(null);
                            }}
                            style={{
                                flex: 1, padding: '11px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', color: '#fff', backgroundColor: '#111'
                            }}
                        >
                            Yes, Revert
                        </button>
                    </div>
                </div>
            </div>
        )}


        {selectedApp && (() => {
            const appData = selectedApp;
            const profileData = selectedApp.profileData || {};
            const isProfileComplete = profileData.name && profileData.email && profileData.city && profileData.title; // simplified check
            
            const sections = [
              {
                title: "Founders",
                questions: [
                  { 
                      q: profileData.name || selectedApp.userName || "Founder", 
                      type: "profile", 
                      status: isProfileComplete ? "Profile complete" : "Profile incomplete" 
                  },
                  { q: "Who writes code, or does other technical work on your product? Was any of it done by a non-founder? Please explain.", a: appData.technicalWork },
                  { q: "Are you looking for a cofounder?", a: appData.lookingForCofounder }
                ]
              },
              {
                title: "Founder Video",
                questions: [
                  { q: "Founder Video Link", a: appData.founderVideoUrl, type: "status", status: appData.founderVideoUrl ? "Video uploaded" : "No video uploaded" }
                ]
              },
              {
                title: "Company",
                questions: [
                  { q: "Company name", a: appData.companyName },
                  { q: "Describe what your company does in 50 characters or less.", a: appData.companyDescription },
                  { q: "Company URL, if any", a: appData.companyUrl },
                  { q: "Demo Video", a: appData.demoUrl, type: "status", status: appData.demoUrl ? "Video uploaded" : "No video uploaded" },
                  { q: "Please provide a link to the product, if any.", a: appData.productUrl },
                  { q: "What is your company going to make? Please describe your product and what it does or will do.", a: appData.whatMaking },
                  { q: "Where do you live now, and where would the company be based after YC?", a: appData.liveNowLocation },
                  { q: "Explain your decision regarding location.", a: appData.locationDecision }
                ]
              },
              {
                title: "Progress",
                questions: [
                  { q: "How far along are you?", a: appData.howFar },
                  { q: "How long have each of you been working on this? How much of that has been full-time? Please explain.", a: appData.howLongWork },
                  { q: "What tech stack are you using, or planning to use, to build this product? Include AI models and AI coding tools you use.", a: appData.techStack },
                  { q: "Optional: attach a coding agent session you're particularly proud of.", a: "Check attached file" },
                  { q: "Are people using your product?", a: appData.usersRadio },
                  { q: "Do you have revenue?", a: appData.revenueRadio },
                  { q: "If you are applying with the same idea as a previous batch, did anything change? If you applied with a different idea, why did you pivot and what did you learn from the last idea?", a: appData.pivotExplanation },
                  { q: "If you have already participated or committed to participate in an incubator, \"accelerator\" or \"pre-accelerator\" program, please tell us about it.", a: appData.incubatorExplanation }
                ]
              },
              {
                title: "Idea",
                questions: [
                  { q: "Why did you pick this idea to work on? Do you have domain expertise in this area? How do you know people need what you're making?", a: appData.whyIdea },
                  { q: "Who are your competitors? What do you understand about your business that they don't?", a: appData.competitors },
                  { q: "How do or will you make money? How much could you make?", a: appData.monetization },
                  { q: "Which category best applies to your company?", a: appData.category },
                  { q: "If you had any other ideas you considered applying with, please list them.", a: appData.otherIdeas }
                ]
              },
              {
                  title: "Equity",
                  questions: [
                      { q: "Have you formed ANY legal entity yet?", a: appData.legalEntityRadio },
                      { q: "Have you taken any investment yet?", a: appData.investmentRadio },
                      { q: "Are you currently fundraising?", a: appData.fundraisingRadio }
                  ]
              }
            ];

            return (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f6f6ef', zIndex: 1000, overflowY: 'auto' }}>
                <div style={{ padding: '2rem 1rem' }}>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div style={{ backgroundColor: '#6300dd', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px', borderRadius: '4px' }}>X</div>
                            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '13px' }}>
                                <span style={{ fontWeight: 'bold' }}>{user.email}</span>
                                <span style={{ color: '#ccc' }}>|</span>
                                <button onClick={() => setSelectedApp(null)} style={{ background: 'none', border: 'none', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>Close Preview</button>
                            </div>
                        </div>

                        <button onClick={() => setSelectedApp(null)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666', fontSize: '13px', marginBottom: '1rem', cursor: 'pointer', padding: 0 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            Back
                        </button>

                        <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '3rem', fontWeight: 500, color: '#111', margin: '0 0 0.5rem 0' }}>{appData.companyName || "Untitled"}</h1>
                        <p style={{ color: '#888', margin: '0 0 3rem 0', fontSize: '14px' }}>{appData.batch || "Summer 2026"}</p>

                        {sections.map((section, idx) => (
                        <div key={idx} style={{ marginBottom: '4rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>{section.title}</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {section.questions.map((item, qIdx) => (
                                <div key={qIdx}>
                                {item.type === "profile" ? (
                                    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{ fontWeight: 'bold' }}>{item.q}</span>
                                        <span style={{ 
                                            backgroundColor: isProfileComplete ? '#00bf8e' : '#ff4d4f', 
                                            color: 'white', 
                                            fontSize: '11px', 
                                            padding: '2px 8px', 
                                            borderRadius: '10px', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '4px' 
                                        }}>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            {isProfileComplete ? (
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            ) : (
                                                <><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></>
                                            )}
                                        </svg>
                                        {item.status}
                                        </span>
                                    </div>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                    </div>
                                ) : item.type === "status" ? (
                                    <div>
                                    <p style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '0.5rem', color: '#111' }}>{item.q}</p>
                                    {item.a ? (
                                        <p style={{ color: '#6300dd', fontSize: '14px', margin: 0, textDecoration: 'underline' }}>{item.a}</p>
                                    ) : (
                                        <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>{item.status}</p>
                                    )}
                                    </div>
                                ) : (
                                    <div>
                                    <p style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '0.5rem', color: '#111', lineHeight: '1.4' }}>{item.q}</p>
                                    {item.a ? (
                                        <p style={{ margin: 0, fontSize: '14px', color: '#444', whiteSpace: 'pre-wrap' }}>{item.a}</p>
                                    ) : (
                                        <p style={{ margin: 0, fontSize: '14px', color: '#ff4d4f' }}>Unanswered</p>
                                    )}
                                    </div>
                                )}
                                </div>
                            ))}
                            </div>
                        </div>
                        ))}
                    </div>
                </div>
              </div>
            );
        })()}

        {activeTab === 'Manage Blog' && (
            <div style={{ margin: '-3rem -2rem 0 -2rem', position: 'relative' }}>
                <Blog />
                
                {/* Floating Plus Button */}
                <button 
                    onClick={() => navigate('/create-blog')}
                    style={{
                        position: 'fixed',
                        bottom: '40px',
                        right: '40px',
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: '#6300dd',
                        color: '#fff',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(99, 0, 221, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 1000,
                        transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 0, 221, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 0, 221, 0.3)';
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
            </div>
        )}

        {activeTab === 'Startup Directory' && (
            <div style={{ margin: '-3rem -2rem 0 -2rem' }}>
                <Directory />
            </div>
        )}

        {activeTab === 'My Blog' && (
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>My Blog Posts</h2>
                    <button
                        onClick={() => navigate('/create-blog')}
                        style={{ backgroundColor: '#6300dd', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        New Post
                    </button>
                </div>

                {myBlogs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #eee' }}>
                        <div style={{ marginBottom: '1.5rem', opacity: 0.8, display: 'flex', justifyContent: 'center' }}>
                            <div style={{ backgroundColor: 'rgba(99, 0, 221, 0.05)', padding: '24px', borderRadius: '50%' }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6300dd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 20h9"></path>
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                </svg>
                            </div>
                        </div>
                        <h3 style={{ color: '#666', fontWeight: '500' }}>No posts yet</h3>
                        <p style={{ color: '#999', fontSize: '14px' }}>Create your first blog post for review.</p>
                        <button onClick={() => navigate('/create-blog')} style={{ marginTop: '1rem', backgroundColor: '#6300dd', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Write a Post</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {myBlogs.map(blog => {
                            const statusConfig = {
                                pending: { label: 'In Review', color: '#ff9500', bg: 'rgba(255,149,0,0.1)', border: 'rgba(255,149,0,0.2)' },
                                approved: { label: 'Published', color: '#34c759', bg: 'rgba(52,199,89,0.1)', border: 'rgba(52,199,89,0.2)' },
                                rejected: { label: 'Rejected', color: '#ff3b30', bg: 'rgba(255,59,48,0.1)', border: 'rgba(255,59,48,0.2)' },
                            };
                            const s = statusConfig[blog.status] || statusConfig.pending;
                            return (
                                <div key={blog.id} style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #eee', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '700' }}>{blog.title || 'Untitled'}</h3>
                                        <p style={{ margin: '0 0 0.75rem 0', color: '#666', fontSize: '14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{blog.content}</p>
                                        <div style={{ fontSize: '12px', color: '#999' }}>{blog.category || 'General'} &bull; {new Date(blog.createdAt || blog.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                    </div>
                                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ padding: '5px 12px', backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                                            {s.label}
                                        </div>
                                        <button 
                                            onClick={() => setDeleteModal({ blogId: blog.id, blogTitle: blog.title })}
                                            title="Delete Post"
                                            style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        )}

        {activeTab === 'Settings' && (
            <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Profile Section */}
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #eee', padding: '2rem' }}>
                    <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', fontWeight: '700' }}>Profile</h2>
                    {/* Avatar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                            {profileImageUrl ? (
                                <img src={profileImageUrl} alt="avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #eee' }} />
                            ) : (
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#6300dd', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '2rem', fontWeight: '700' }}>
                                    {(profileForm.name || user?.email || 'M').charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>Profile Photo</label>
                            <button
                                onClick={() => profileImageInputRef.current.click()}
                                disabled={isUploadingImage}
                                style={{ width: '100%', padding: '10px 15px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: isUploadingImage ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#6300dd'}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#ddd'}
                            >
                                {isUploadingImage ? 'Uploading...' : 'Change Photo'}
                            </button>
                            <input type="file" ref={profileImageInputRef} hidden accept="image/*" onChange={handleProfileImageUpload} />
                        </div>
                    </div>
                    {/* Name */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '6px' }}>Display Name</label>
                        <input
                            type="text"
                            value={profileForm.name}
                            onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                            placeholder="Your full name"
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                        />
                    </div>
                    {/* Role */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '6px' }}>Role / Title</label>
                        <input
                            type="text"
                            value={profileForm.role}
                            onChange={e => setProfileForm(p => ({ ...p, role: e.target.value }))}
                            placeholder="e.g. Operations Lead"
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                        />
                    </div>
                    {/* Email (read-only) */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '6px' }}>Email Address</label>
                        <div style={{ padding: '10px 12px', backgroundColor: '#f9f9f9', border: '1px solid #eee', borderRadius: '8px', fontSize: '14px', color: '#888' }}>{user?.email}</div>
                    </div>
                    <button
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        style={{ width: '100%', padding: '12px', backgroundColor: savingProfile ? '#999' : '#6300dd', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: savingProfile ? 'not-allowed' : 'pointer', fontSize: '15px', transition: 'background 0.2s' }}
                    >
                        {savingProfile ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>

                {/* Security Section */}
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #eee', padding: '2rem' }}>
                    <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', fontWeight: '700' }}>Security</h2>
                    {!showOtpScreen ? (
                        <>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '6px' }}>New Access PIN (6 digits)</label>
                            <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="••••••" maxLength={6} style={{ width: '100%', padding: '12px', marginBottom: '1rem', textAlign: 'center', fontSize: '20px', letterSpacing: '6px', border: '1px solid #ddd', borderRadius: '8px' }} />
                            <button onClick={startPinChange} style={{ width: '100%', backgroundColor: '#000', color: '#fff', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Change Access PIN</button>
                        </>
                    ) : (
                        <div>
                            <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>Enter the OTP sent to your console (check terminal).</p>
                            <input type="text" value={otpInput} onChange={e => setOtpInput(e.target.value)} placeholder="OTP Code" maxLength={6} style={{ width: '100%', padding: '12px', textAlign: 'center', fontSize: '20px', letterSpacing: '6px', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '8px' }} />
                            <button onClick={verifyOtp} style={{ width: '100%', backgroundColor: '#52c41a', color: '#fff', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Verify & Update PIN</button>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

        {/* Delete Confirmation Modal */}
        {deleteModal && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(255, 255, 255, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(10px)' }}>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', borderRadius: '16px', padding: '2rem', width: '400px', boxShadow: '0 8px 32px rgba(99, 0, 221, 0.1)', textAlign: 'center', animation: 'fadeInUp 0.2s ease', border: '1px solid rgba(255, 255, 255, 0.5)' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: '800', color: '#111' }}>Delete Post?</h3>
                    <p style={{ margin: 0, fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
                        Are you sure you want to delete <strong>"{deleteModal.blogTitle || 'this post'}"</strong>? This action cannot be undone.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '2rem' }}>
                        <button
                            onClick={() => setDeleteModal(null)}
                            style={{ flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '10px', background: 'rgba(0,0,0,0.05)', cursor: 'pointer', fontWeight: '600', color: '#666' }}
                        >Cancel</button>
                        <button
                            onClick={() => handleDeleteBlog(deleteModal.blogId, deleteModal.blogTitle)}
                            style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '10px', backgroundColor: '#ff3b30', color: '#fff', cursor: 'pointer', fontWeight: '700' }}
                        >Yes, Delete</button>
                    </div>
                </div>
            </div>
        )}
        {/* Profile Icon Preview Modal */}
        {showPreviewModal && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(255, 255, 255, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, backdropFilter: 'blur(12px)' }}>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', borderRadius: '12px', width: '420px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)', border: '1px solid rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)' }}>
                    <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, color: '#111', fontSize: '1.1rem', fontWeight: '600' }}>Profile Icon Preview</h3>
                        <button onClick={() => setShowPreviewModal(false)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '20px' }}>×</button>
                    </div>
                    <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                        <div style={{ width: '160px', height: '160px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 1.5rem', border: '4px solid #fff', backgroundColor: '#fff', boxShadow: '0 0 20px rgba(0,0,0,0.1)' }}>
                            <img src={profilePreviewUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <p style={{ margin: '0 0 4px 0', color: '#111', fontSize: '14px', fontWeight: '500' }}>{selectedProfileFile?.name}</p>
                        <p style={{ margin: 0, color: '#666', fontSize: '12px' }}>{(selectedProfileFile?.size / 1024 / 1024).toFixed(2)} MB • {selectedProfileFile?.type}</p>
                    </div>
                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <button onClick={confirmProfileUpload} style={{ width: '100%', padding: '12px', backgroundColor: '#6300dd', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Upload as Profile Icon</button>
                        <button onClick={() => { setShowPreviewModal(false); setShowCropModal(true); }} style={{ width: '100%', padding: '12px', backgroundColor: '#f3f4f6', color: '#111', border: '1px solid #ddd', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Crop Image First</button>
                        <button onClick={() => setShowPreviewModal(false)} style={{ width: '100%', padding: '12px', backgroundColor: 'transparent', color: '#666', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                    </div>
                </div>
            </div>
        )}

        {/* Edit Photo (Crop) Modal */}
        {showCropModal && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(255, 255, 255, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10002, backdropFilter: 'blur(12px)' }}>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '12px', width: '800px', height: '600px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)' }}>
                    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, color: '#111', fontSize: '1.1rem', fontWeight: '600' }}>Edit photo</h3>
                        <button onClick={() => setShowCropModal(false)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '20px' }}>×</button>
                    </div>
                    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                        <div style={{ flex: 1, backgroundColor: '#f6f6ef', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '2rem' }}>
                            <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}>
                                <img id="crop-image" src={profilePreviewUrl} alt="to crop" style={{ maxWidth: '100%', maxHeight: '400px', display: 'block', borderRadius: '8px' }} />
                                <div style={{ position: 'absolute', inset: 0, border: '2px dashed #fff', borderRadius: '50%', boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)', pointerEvents: 'none' }}></div>
                            </div>
                        </div>
                        <div style={{ width: '240px', padding: '1.5rem', backgroundColor: '#fff', borderLeft: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ backgroundColor: '#6300dd', color: '#fff', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', alignSelf: 'flex-start', marginBottom: '1rem' }}>Crop</div>
                            <p style={{ color: '#666', fontSize: '12px', lineHeight: '1.5', margin: 0 }}>Drag the corners or edges to adjust the crop area. The circular frame shows what will be visible in your profile icon.</p>
                            <div style={{ flex: 1 }}></div>
                            <button onClick={confirmProfileUpload} style={{ width: '100%', padding: '12px', backgroundColor: '#6300dd', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Save photo</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

      <ToastNotification message={toastMessage} />
    </div>
  );
};

export default Member;
