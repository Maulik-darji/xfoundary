import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAuth as auth, adminDb as db } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, writeBatch, addDoc, deleteDoc } from 'firebase/firestore';
import Blog from './Blog';

const Admin = () => {
  const [activeTab, setActiveTab] = useState(localStorage.getItem('xf_admin_active_tab') || 'Overview');
  const [applications, setApplications] = useState([]);
  const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [memberApps, setMemberApps] = useState([]);
  const [applicationLogs, setApplicationLogs] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalApps: 0, pending: 0, approved: 0, pendingBlogs: 0, pendingMembers: 0, withdrawnApps: 0, totalAdmins: 0, totalMembers: 0, adminsList: [] });
  const [loading, setLoading] = useState(true);
  
  const [user, setUser] = useState(null);
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(sessionStorage.getItem('xf_admin_authorized') === 'true');
  const [authMode, setAuthMode] = useState('login'); 
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const [pinInput, setPinInput] = useState('');
  const [profile, setProfile] = useState({ name: 'Admin', pin: '000000' });
  const [appFilter, setAppFilter] = useState('approved');
  const [founderLimit, setFounderLimit] = useState(30);

  const navigate = useNavigate();
  const MASTER_SECRET_CODE = "XF-ADMIN-ACCESS-2024";

  useEffect(() => {
    document.title = "XF Admin Dashboard";
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
        if (adminDoc.exists()) {
            setUser(currentUser);
            setIsAdminAuth(true);
            setProfile(adminDoc.data().profile || { name: 'Admin', pin: '000000' });
            if (isAuthorized) fetchData();
        } else {
            setUser(null);
            setIsAdminAuth(false);
        }
      } else {
        setUser(null);
        setIsAdminAuth(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate, isAuthorized]);

  useEffect(() => {
    localStorage.setItem('xf_admin_active_tab', activeTab);
  }, [activeTab]);

  const handleAdminAuth = async (e) => {
    e.preventDefault();
    setError('');
    const email = e.target.email.value;
    const password = e.target.password.value;
    
    try {
        if (authMode === 'signup') {
            const secret = e.target.secret.value;
            const name = e.target.name.value;
            if (secret !== MASTER_SECRET_CODE) {
                setError("Invalid Master Secret Code.");
                return;
            }
            const res = await createUserWithEmailAndPassword(auth, email, password);
            const initialProfile = { name, pin: '000000' };
            await setDoc(doc(db, 'admins', res.user.uid), {
                email, profile: initialProfile, role: 'admin', createdAt: new Date().toISOString()
            });
            alert("Admin account created! Please log in.");
            setAuthMode('login');
        } else {
            const res = await signInWithEmailAndPassword(auth, email, password);
            const adminDoc = await getDoc(doc(db, 'admins', res.user.uid));
            if (!adminDoc.exists()) {
                await auth.signOut();
                setError("This account is not registered as an administrator.");
            }
        }
    } catch (err) { setError(err.message); }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === (profile.pin || '000000')) {
        setIsAuthorized(true);
        sessionStorage.setItem('xf_admin_authorized', 'true');
        fetchData();
    } else alert("Incorrect PIN");
  };

  const fetchData = async () => {
    try {
      const uSnap = await getDocs(collection(db, 'users'));
      const uList = []; const aList = []; let p = 0; let apprv = 0; let wdrw = 0;
      uSnap.forEach(d => {
          const data = d.data(); uList.push({ id: d.id, ...data });
          if (data.application) {
              const app = { id: d.id, ...data.application, userEmail: data.email, userName: data.profile?.name || 'Founder' };
              aList.push(app);
              if (app.status === 'pending' || !app.status) p++;
              if (app.status === 'approved') apprv++;
              if (app.status === 'withdrawn') wdrw++;
          }
      });
      const mSnap = await getDocs(collection(db, 'members'));
      const mList = []; mSnap.forEach(d => mList.push({ id: d.id, ...d.data() }));
      const bSnap = await getDocs(collection(db, 'blog'));
      const bList = []; let pb = 0;
      bSnap.forEach(d => { const b = { id: d.id, ...d.data() }; bList.push(b); if (b.status === 'pending') pb++; });
      const maSnap = await getDocs(collection(db, 'memberApplications'));
      const maList = []; let pm = 0;
      maSnap.forEach(d => { const a = { id: d.id, ...d.data() }; maList.push(a); if (a.status === 'pending') pm++; });

      const adminsSnap = await getDocs(collection(db, 'admins'));
      const adminsList = [];
      adminsSnap.forEach(d => adminsList.push({ id: d.id, ...d.data() }));

      const logsSnap = await getDocs(collection(db, 'applicationLogs'));
      const logsList = [];
      logsSnap.forEach(d => logsList.push({ id: d.id, ...d.data() }));
      logsList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setUsers(uList); setMembers(mList); setApplications(aList); setBlogs(bList); setMemberApps(maList); setApplicationLogs(logsList);
      setStats({ 
        totalUsers: uList.length, 
        totalApps: aList.length, 
        pending: p, 
        approved: apprv,
        pendingBlogs: pb, 
        pendingMembers: pm,
        withdrawnApps: wdrw,
        totalAdmins: adminsSnap.size,
        totalMembers: mList.length,
        adminsList
      });
    } catch (e) { console.error(e); }
  };

  const handleAppStatus = async (uid, newStatus) => {
    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data() || {};
        
        await updateDoc(userRef, { 'application.status': newStatus });

        const companyName = userData.application?.companyName || 'your startup';
        await addDoc(collection(db, 'applicationLogs'), {
            userId: uid,
            action: newStatus,
            actionBy: profile.name || 'Admin',
            actionByUid: user?.uid || 'admin',
            reason: 'Action taken by Admin',
            timestamp: new Date().toISOString(),
            founderName: userData.profile?.name || userData.email || 'Founder',
            companyName: companyName
        });

        // Dispatch Email immediately
        const email = userData.email;
        if (email && newStatus !== 'pending') {
            const name = userData.profile?.name || email.split('@')[0] || 'Founder';
            const companyName = userData.application?.companyName || 'your startup';
            const batch = userData.application?.batch || 'Summer 2026';
            let mailData = null;

            if (newStatus === 'approved') {
                mailData = {
                    subject: `Congratulations! Your application for ${companyName} has been accepted`,
                    html: `<div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eee; padding: 40px; border-radius: 12px; color: #111; line-height: 1.6;"><div style="text-align: center; margin-bottom: 30px;"><div style="background-color: #000; width: 42px; height: 42px; line-height: 42px; display: inline-block; border-radius: 4px; color: white; font-weight: 800; font-size: 16px; text-align: center;">XF</div><h2 style="margin-top: 20px; color: #111;">Welcome to X Foundary!</h2></div><p>Hello ${name},</p><p>We have great news! We've reviewed your application and are incredibly excited to invite <strong>${companyName}</strong> to join the <strong>X Foundary ${batch}</strong> batch.</p><p>We were very impressed with your vision and look forward to helping you grow.</p><div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #dcfce7;"><p style="margin: 0; font-size: 14px; color: #166534;"><strong>What's next?</strong><br/>Log in to your dashboard to see the next steps and join the founder community.</p></div><div style="text-align: center; margin-top: 30px;"><a href="https://xfoundaryapp.web.app/home" style="background-color: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Go to Dashboard</a></div><p style="font-size: 12px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">Welcome to the family!<br/>— The X Foundary Team</p></div>`
                };
            } else if (newStatus === 'hold') {
                mailData = {
                    subject: `Update on your ${companyName} application - X Foundary`,
                    html: `<div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eee; padding: 40px; border-radius: 12px; color: #111; line-height: 1.6;"><div style="text-align: center; margin-bottom: 30px;"><div style="background-color: #000; width: 42px; height: 42px; line-height: 42px; display: inline-block; border-radius: 4px; color: white; font-weight: 800; font-size: 16px; text-align: center;">XF</div><h2 style="margin-top: 20px; color: #111;">Application Update</h2></div><p>Hello ${name},</p><p>Thank you for your patience as we review applications for the <strong>${batch}</strong> batch.</p><p>We wanted to let you know that your application for <strong>${companyName}</strong> looks very promising! Our team would like a bit more time to carefully review your materials.</p><div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #92400e;"><p style="margin: 0; font-size: 14px; color: #92400e;"><strong>What this means:</strong><br/>We haven't made a final decision yet. We are doing a deeper dive into your vision and will revert back to you soon with an update.</p></div><p style="font-size: 12px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">Thank you for being part of X Foundary.<br/>— The X Foundary Team</p></div>`
                };
            } else if (newStatus === 'rejected') {
                mailData = {
                    subject: `Your X Foundary Application`,
                    html: `<div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #111; line-height: 1.6;"><p>Hi ${name},</p><p>Thanks for applying to X Foundary. We're sorry to say that your startup was not selected for an interview. We carefully reviewed thousands of applications, and with so many strong submissions, we had to make difficult decisions. Unfortunately, this meant turning away many promising companies.</p><p>Unfortunately we can't give you individual feedback about your application. <a href="https://xfoundaryapp.web.app/faq" style="color: #000; text-decoration: underline;">This page explains why.</a></p><p>We hope you apply again in the future as you continue to make progress. In fact, we encourage it. Applying multiple times does not count against you and a surprisingly large number of companies are funded after applying more than once. Over 50% of the startups we accept are repeat applicants.</p><p>Best of luck,</p><p style="margin-top: 30px; font-weight: bold;">—XF</p></div>`
                };
            }

            if (mailData) {
                await addDoc(collection(db, 'mail'), {
                    to: email,
                    message: mailData
                });
            }
        }

        setToastMessage(`Application ${newStatus}! Email sent to founder.`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        fetchData();
    } catch (e) { alert(e.message); }
  };

  const handleMemberApproval = async (uid, newStatus) => {
    try {
        if (newStatus === 'approved') {
            const appDoc = await getDoc(doc(db, 'memberApplications', uid));
            const appData = appDoc.exists() ? appDoc.data() : {};
            
            const userDoc = await getDoc(doc(db, 'users', uid));
            const userData = userDoc.exists() ? userDoc.data() : {};
            
            const batch = writeBatch(db);
            batch.set(doc(db, 'members', uid), { 
                ...userData, 
                ...appData,
                role: 'member', 
                approvedAt: new Date().toISOString() 
            });
            
            if (userDoc.exists()) {
                batch.delete(doc(db, 'users', uid));
            }
            
            batch.update(doc(db, 'memberApplications', uid), { status: 'approved' });
            await batch.commit();
        } else {
            await updateDoc(doc(db, 'memberApplications', uid), { status: 'rejected' });
        }
        alert("Action completed"); fetchData();
    } catch (e) { alert(e.message); }
  };

  const handleRemoveMember = async (uid) => {
      if (window.confirm("Are you sure you want to remove this user from the team?")) {
          try {
              const batch = writeBatch(db);
              batch.delete(doc(db, 'members', uid));
              batch.update(doc(db, 'memberApplications', uid), { status: 'removed' });
              await batch.commit();
              setToastMessage("Member removed successfully.");
              setShowToast(true);
              setTimeout(() => setShowToast(false), 3000);
              fetchData();
          } catch (e) { alert(e.message); }
      }
  };

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Admin Portal...</div>;

  if (!isAdminAuth) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f6ef' }}>
        <div style={{ width: '400px', backgroundColor: '#fff', padding: '3rem', borderRadius: '12px', border: '1px solid #eee' }}>
            <div style={{ backgroundColor: '#6300dd', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', borderRadius: '8px', margin: '0 auto 2rem', fontSize: '24px' }}>X</div>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Admin {authMode === 'login' ? 'Login' : 'Signup'}</h2>
            {error && <p style={{ color: '#ff4d4f', fontSize: '13px', textAlign: 'center', marginBottom: '1.5rem' }}>{error}</p>}
            <form onSubmit={handleAdminAuth}>
                {authMode === 'signup' && (
                    <>
                        <input name="name" placeholder="Full Name" required style={{ width: '100%', padding: '12px', marginBottom: '1rem' }} />
                        <input name="secret" placeholder="Master Secret Code" required style={{ width: '100%', padding: '12px', marginBottom: '1rem' }} />
                    </>
                )}
                <input name="email" type="email" placeholder="Admin Email" required style={{ width: '100%', padding: '12px', marginBottom: '1rem', borderRadius: '6px', border: '1px solid #ddd' }} />
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
                <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                    {authMode === 'login' ? 'Sign In' : 'Create Admin Account'}
                </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '14px' }}>
                {authMode === 'login' ? "Need an account?" : "Already have an account?"} 
                <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} style={{ background: 'none', border: 'none', color: '#000', fontWeight: 'bold', cursor: 'pointer', marginLeft: '5px' }}>
                    {authMode === 'login' ? 'Register' : 'Log In'}
                </button>
            </p>
        </div>
    </div>
  );

  if (!isAuthorized) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f6ef' }}>
        <form onSubmit={handlePinSubmit} style={{ width: '320px', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '1rem' }}>Welcome, {profile.name}</h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '2rem' }}>Enter master PIN to unlock system.</p>
            <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="••••••" maxLength={6} style={{ width: '100%', padding: '12px', textAlign: 'center', fontSize: '24px', letterSpacing: '8px', marginBottom: '1.5rem' }} />
            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Unlock Panel</button>
            <button onClick={() => auth.signOut()} style={{ marginTop: '1rem', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>Sign Out</button>
        </form>
    </div>
  );

  const TABS = ['Overview', 'Pending Apps', 'Applications', 'Founders', 'Admins', 'Members', 'Blog Approvals', 'XF Blog', 'Member Requests', 'Withdrawn Apps', 'Settings'];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'Inter, sans-serif', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'fixed', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(99, 0, 221, 0.08) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: 0, animation: 'move 20s infinite alternate' }}></div>
      <div style={{ position: 'fixed', bottom: '-10%', right: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(99, 0, 221, 0.05) 0%, transparent 70%)', filter: 'blur(80px)', zIndex: 0, animation: 'move 25s infinite alternate-reverse' }}></div>

      <style>{`
        @keyframes move { from { transform: translate(0, 0); } to { transform: translate(10%, 10%); } }
        @keyframes glassShine {
            0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
            100% { transform: translateX(200%) translateY(200%) rotate(45deg); }
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .liquid-glass-active {
            position: absolute;
            left: 8px;
            right: 8px;
            height: 40px;
            background: rgba(255, 255, 255, 0.5);
            backdrop-filter: blur(15px) saturate(200%);
            -webkit-backdrop-filter: blur(15px) saturate(200%);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.4);
            box-shadow: 
                0 8px 32px rgba(99, 0, 221, 0.1),
                inset 0 0 0 1px rgba(255,255,255,0.5);
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 0;
            overflow: hidden;
            pointer-events: none;
        }
        .liquid-glass-active::after {
            content: '';
            position: absolute;
            top: -50%; left: -50%; width: 200%; height: 200%;
            background: linear-gradient(
                45deg,
                transparent 0%,
                rgba(255, 255, 255, 0.1) 45%,
                rgba(255, 255, 255, 0.6) 50%,
                rgba(255, 255, 255, 0.1) 55%,
                transparent 100%
            );
            animation: glassShine 3s infinite linear;
        }
        .glass-card {
            background: rgba(255, 255, 255, 0.7) !important;
            backdrop-filter: blur(20px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
            border: 1px solid rgba(255, 255, 255, 0.5) !important;
            box-shadow: 0 8px 32px rgba(0,0,0,0.03) !important;
            transition: all 0.3s ease !important;
        }
        .glass-card:hover {
            background: rgba(255, 255, 255, 0.85) !important;
            box-shadow: 0 12px 40px rgba(99, 0, 221, 0.06) !important;
        }
        .profile-glass {
            background: rgba(255, 255, 255, 0.5) !important;
            backdrop-filter: blur(20px) saturate(180%) !important;
            border: 1px solid rgba(255, 255, 255, 0.4) !important;
            box-shadow: 0 8px 32px rgba(0,0,0,0.05) !important;
            border-radius: 18px !important;
            padding: 12px !important;
            transition: all 0.3s ease !important;
        }
        .profile-glass:hover {
            background: rgba(255, 255, 255, 0.7) !important;
        }
      `}</style>

      <aside style={{ width: '300px', backgroundColor: 'rgba(223, 234, 234, 0.8)', backdropFilter: 'blur(30px)', color: '#000', borderRight: '1px solid rgba(201, 218, 218, 0.5)', padding: '2rem 1.5rem', height: '100vh', position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '3rem' }}>
          <div style={{ backgroundColor: '#000', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', borderRadius: '10px', fontSize: '20px' }}>X</div>
          <span style={{ fontWeight: '800', color: '#000', fontSize: '20px', letterSpacing: '-0.02em' }}>X Foundary</span>
        </div>
        <nav style={{ flex: 1, position: 'relative', overflowY: 'auto', paddingRight: '5px' }}>
          <div className="liquid-glass-active" style={{ 
              transform: `translateY(${TABS.indexOf(activeTab) * 50}px)`,
              height: '46px'
          }}></div>
          {TABS.map((tab) => {
              let badgeCount = 0;
              if (tab === 'Pending Apps') badgeCount = stats.pending;
              if (tab === 'Member Requests') badgeCount = stats.pendingMembers;
              if (tab === 'Blog Approvals') badgeCount = stats.pendingBlogs;
              if (tab === 'Withdrawn Apps') badgeCount = stats.withdrawnApps;
              
              return (
                  <div key={tab} onClick={() => setActiveTab(tab)} style={{ 
                      position: 'relative', 
                      zIndex: 1, 
                      padding: '12px 18px', 
                      marginBottom: '4px', 
                      cursor: 'pointer', 
                      color: activeTab === tab ? '#000' : '#556666',
                      fontSize: '16px', 
                      fontWeight: '700',
                      transition: 'color 0.4s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      height: '46px'
                  }}>
                    <span>{tab}</span>
                    {badgeCount > 0 && (
                        <span style={{ 
                            backgroundColor: '#ff3b30', 
                            color: '#fff', 
                            borderRadius: '50%', 
                            minWidth: '20px', 
                            height: '20px', 
                            padding: '0 6px',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontSize: '11px', 
                            fontWeight: 'bold',
                            boxShadow: '0 2px 4px rgba(255, 59, 48, 0.3)'
                        }}>
                            {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                    )}
                  </div>
              );
          })}
          <button onClick={() => fetchData()} style={{ position: 'relative', zIndex: 1, marginTop: '2rem', width: '100%', padding: '10px', backgroundColor: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', color: '#000', backdropFilter: 'blur(10px)', fontWeight: '700', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}>Refresh Data</button>
        </nav>

        <div style={{ position: 'relative', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.5rem', marginTop: 'auto' }}>
            {showProfilePopup && (
                <div style={{ position: 'absolute', bottom: '100%', left: '0', width: '220px', backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '15px', boxShadow: '0 15px 45px rgba(0,0,0,0.1)', marginBottom: '12px', padding: '10px', zIndex: 1000, animation: 'fadeInUp 0.2s ease-out' }}>
                    <div onClick={() => { setActiveTab('Settings'); setShowProfilePopup(false); }} style={{ padding: '12px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s', color: '#333' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        Settings
                    </div>
                    <div style={{ height: '1px', backgroundColor: 'rgba(0,0,0,0.05)', margin: '6px 0' }}></div>
                    <div onClick={() => auth.signOut()} style={{ padding: '12px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', color: '#ff4d4f', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,0,0,0.03)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        Log out
                    </div>
                </div>
            )}
            
            <div onClick={() => setShowProfilePopup(!showProfilePopup)} className="profile-glass" style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <div style={{ width: '36px', height: '36px', backgroundColor: '#000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {profile.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.name}</div>
                    <div style={{ fontSize: '11px', color: '#667777', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                </div>
            </div>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '2.5rem', zIndex: 1, position: 'relative', overflowY: 'auto' }}>
        {activeTab === 'Overview' && (
            <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
                 <div onClick={() => setActiveTab('Pending Apps')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.15) 0%, rgba(0, 122, 255, 0.05) 100%)', border: '1px solid rgba(0, 122, 255, 0.2)' }}>
                    <div style={{ color: '#007aff', fontSize: '11px', marginBottom: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Applications written</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#007aff' }}>{stats.pending}</div>
                </div>
                <div onClick={() => setActiveTab('Applications')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.15) 0%, rgba(52, 199, 89, 0.05) 100%)', border: '1px solid rgba(52, 199, 89, 0.2)' }}>
                    <div style={{ color: '#34c759', fontSize: '11px', marginBottom: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Applications</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#34c759' }}>{stats.pending + stats.approved + applications.filter(a => a.status === 'hold' || a.status === 'rejected').length}</div>
                </div>
                <div onClick={() => setActiveTab('Founders')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(255, 149, 0, 0.15) 0%, rgba(255, 149, 0, 0.05) 100%)', border: '1px solid rgba(255, 149, 0, 0.2)' }}>
                    <div style={{ color: '#ff9500', fontSize: '11px', marginBottom: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Founders</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#ff9500' }}>{stats.totalUsers}</div>
                </div>
                <div onClick={() => setActiveTab('Members')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(88, 86, 214, 0.15) 0%, rgba(88, 86, 214, 0.05) 100%)', border: '1px solid rgba(88, 86, 214, 0.2)' }}>
                    <div style={{ color: '#5856d6', fontSize: '11px', marginBottom: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Members</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#5856d6' }}>{stats.totalMembers}</div>
                </div>
                <div onClick={() => setActiveTab('Admins')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(142, 142, 147, 0.15) 0%, rgba(142, 142, 147, 0.05) 100%)', border: '1px solid rgba(142, 142, 147, 0.2)' }}>
                    <div style={{ color: '#8e8e93', fontSize: '11px', marginBottom: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Admins</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#8e8e93' }}>{stats.totalAdmins}</div>
                </div>
                <div onClick={() => setActiveTab('Member Requests')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(255, 59, 48, 0.15) 0%, rgba(255, 59, 48, 0.05) 100%)', border: '1px solid rgba(255, 59, 48, 0.2)' }}>
                    <div style={{ color: '#ff3b30', fontSize: '11px', marginBottom: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pending Members</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#ff3b30' }}>{stats.pendingMembers}</div>
                </div>
            </div>

            {/* Charts Section */}
            <div style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
                {/* Category Distribution Chart */}
                <div className="glass-card" style={{ padding: '2rem', borderRadius: '24px' }}>
                    <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: '800', fontSize: '1.1rem' }}>Category Distribution</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {Object.entries(applications.reduce((acc, app) => {
                            const cat = app.category || 'Other';
                            acc[cat] = (acc[cat] || 0) + 1;
                            return acc;
                        }, {})).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([cat, count], idx) => (
                            <div key={cat} style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                                    <span>{cat}</span>
                                    <span>{count} ({Math.round(count/applications.length * 100)}%)</span>
                                </div>
                                <div style={{ height: '8px', width: '100%', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ 
                                        height: '100%', 
                                        width: `${(count/applications.length)*100}%`, 
                                        backgroundColor: ['#007aff', '#34c759', '#ff9f0a', '#5856d6', '#ff3b30'][idx % 5],
                                        borderRadius: '4px',
                                        transition: 'width 1s ease-out'
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Application Growth Chart */}
                <div className="glass-card" style={{ padding: '2rem', borderRadius: '24px' }}>
                    <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: '800', fontSize: '1.1rem' }}>Weekly Submissions</h4>
                    <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', gap: '15px', padding: '10px 0' }}>
                        {[...Array(7)].map((_, i) => {
                            const date = new Date();
                            date.setDate(date.getDate() - (6 - i));
                            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                            const count = applications.filter(app => {
                                const appDate = new Date(app.submittedAt);
                                return appDate.toDateString() === date.toDateString();
                            }).length;
                            const max = Math.max(...[...Array(7)].map((_, j) => {
                                const d = new Date(); d.setDate(d.getDate() - (6 - j));
                                return applications.filter(a => new Date(a.submittedAt).toDateString() === d.toDateString()).length;
                            })) || 1;
                            
                            return (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '100%', position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                                        <div style={{ 
                                            width: '100%', 
                                            height: `${(count/max)*100}%`, 
                                            backgroundColor: '#000', 
                                            borderRadius: '6px 6px 2px 2px',
                                            minHeight: count > 0 ? '4px' : '0',
                                            transition: 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                        }}>
                                            {count > 0 && <div style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', fontWeight: '800' }}>{count}</div>}
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#888' }}>{dayName}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Recent Activity Feed */}
                <div className="glass-card" style={{ padding: '2rem', borderRadius: '24px', gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h4 style={{ margin: 0, fontWeight: '800', fontSize: '1.1rem' }}>Recent Activity</h4>
                        <button style={{ background: 'none', border: 'none', color: '#007aff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>View All</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {applications.slice(0, 4).map((app, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '14px' }}>
                                <div style={{ width: '40px', height: '40px', backgroundColor: '#fff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px', border: '1px solid rgba(0,0,0,0.05)' }}>
                                    {app.companyName.charAt(0)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '14px', fontWeight: '700' }}>{app.userName} submitted application for <span style={{ color: '#007aff' }}>{app.companyName}</span></div>
                                    <div style={{ fontSize: '12px', color: '#888' }}>{app.submittedAt ? new Date(app.submittedAt).toLocaleString() : 'Recently'}</div>
                                </div>
                                <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', backgroundColor: app.status === 'approved' ? 'rgba(52,199,89,0.1)' : 'rgba(0,0,0,0.05)', color: app.status === 'approved' ? '#34c759' : '#000' }}>
                                    {app.status?.toUpperCase() || 'PENDING'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    )}

        {(activeTab === 'Pending Apps' || activeTab === 'Applications') && (
            <div style={{ display: 'contents' }}>
                {activeTab === 'Applications' && applicationLogs.length > 0 && (
                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', marginBottom: '1.5rem', animation: 'fadeInUp 0.4s ease-out' }}>
                        <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '800' }}>Recent Application Logs</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
                            {applicationLogs.slice(0, 10).map((log, i) => (
                                <div key={i} style={{ fontSize: '13px', display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '10px' }}>
                                    <span style={{ 
                                        padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', flexShrink: 0,
                                        backgroundColor: log.action === 'approved' ? 'rgba(52,199,89,0.1)' : log.action === 'hold' ? 'rgba(0,122,255,0.1)' : 'rgba(255,59,48,0.1)',
                                        color: log.action === 'approved' ? '#34c759' : log.action === 'hold' ? '#007aff' : '#ff3b30'
                                    }}>
                                        {log.action.toUpperCase()}
                                    </span>
                                    <div>
                                        <span style={{ fontWeight: '700' }}>{log.actionBy}</span> {log.action === 'approved' ? 'approved' : log.action === 'hold' ? 'held' : log.action === 'rejected' ? 'rejected' : 'reverted'} <span style={{ fontWeight: '700' }}>{log.companyName}</span> ({log.founderName})
                                        {log.reason && <span style={{ color: '#666', fontStyle: 'italic', marginLeft: '6px' }}>"{log.reason}"</span>}
                                        <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{new Date(log.timestamp).toLocaleString()}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden', animation: 'fadeInUp 0.4s ease-out' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.25rem' }}>{activeTab}</h3>
                        {activeTab === 'Applications' && (
                            <div style={{ display: 'flex', gap: '8px', backgroundColor: 'rgba(0,0,0,0.03)', padding: '4px', borderRadius: '10px' }}>
                                {['approved', 'hold', 'rejected'].map(f => (
                                    <button 
                                        key={f}
                                        onClick={() => setAppFilter(f)}
                                        style={{ 
                                            padding: '6px 14px', 
                                            borderRadius: '8px', 
                                            border: 'none', 
                                            fontSize: '12px', 
                                            fontWeight: '700', 
                                            cursor: 'pointer',
                                            backgroundColor: appFilter === f ? '#000' : 'transparent',
                                            color: appFilter === f ? '#fff' : '#666',
                                            transition: 'all 0.2s',
                                            textTransform: 'capitalize'
                                        }}
                                    >{f}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                            <tr>
                                <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>COMPANY</th>
                                <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>FOUNDER</th>
                                <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>BATCH</th>
                                <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>ACTION</th>
                            </tr>
                        </thead>
                    <tbody>
                        {applications.filter(app => activeTab === 'Pending Apps' ? (app.status === 'pending' || !app.status) : app.status === appFilter).map(app => (
                            <tr key={app.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontWeight: '700' }}>{app.companyName}</div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>{app.category}</div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontWeight: '600' }}>{app.userName}</div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>{app.userEmail}</div>
                                </td>
                                <td style={{ padding: '1.25rem', fontSize: '13px' }}>{app.batch}</td>
                                <td style={{ padding: '1.25rem' }}>
                                    {activeTab === 'Pending Apps' ? (
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button 
                                                onClick={() => handleAppStatus(app.id, 'approved')} 
                                                style={{ 
                                                    padding: '8px 18px', 
                                                    backgroundColor: 'rgba(0, 122, 255, 0.1)', 
                                                    color: '#007aff', 
                                                    border: '1px solid rgba(0, 122, 255, 0.2)', 
                                                    borderRadius: '8px', 
                                                    fontSize: '13px', 
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    fontFamily: 'Inter, sans-serif'
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(0, 122, 255, 0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(0, 122, 255, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                            >Approve</button>
                                            <button 
                                                onClick={() => handleAppStatus(app.id, 'hold')} 
                                                style={{ 
                                                    padding: '8px 18px', 
                                                    backgroundColor: 'rgba(255, 159, 10, 0.1)', 
                                                    color: '#ff9f0a', 
                                                    border: '1px solid rgba(255, 159, 10, 0.2)', 
                                                    borderRadius: '8px', 
                                                    fontSize: '13px', 
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    fontFamily: 'Inter, sans-serif'
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 159, 10, 0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 159, 10, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                            >Hold</button>
                                            <button 
                                                onClick={() => handleAppStatus(app.id, 'rejected')} 
                                                style={{ 
                                                    padding: '8px 18px', 
                                                    backgroundColor: 'rgba(255, 59, 48, 0.1)', 
                                                    color: '#ff3b30', 
                                                    border: '1px solid rgba(255, 59, 48, 0.2)', 
                                                    borderRadius: '8px', 
                                                    fontSize: '13px', 
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    fontFamily: 'Inter, sans-serif'
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                            >Reject</button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            {app.status === 'hold' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleAppStatus(app.id, 'approved')} 
                                                        style={{ padding: '6px 12px', backgroundColor: 'rgba(52, 199, 89, 0.1)', color: '#34c759', border: '1px solid rgba(52, 199, 89, 0.2)', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(52, 199, 89, 0.2)'}
                                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(52, 199, 89, 0.1)'}
                                                    >Approve</button>
                                                    <button 
                                                        onClick={() => handleAppStatus(app.id, 'rejected')} 
                                                        style={{ padding: '6px 12px', backgroundColor: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', border: '1px solid rgba(255, 59, 48, 0.2)', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.2)'}
                                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.1)'}
                                                    >Reject</button>
                                                </>
                                            )}
                                            <button 
                                                onClick={() => handleAppStatus(app.id, 'pending')} 
                                                style={{ padding: '6px 12px', backgroundColor: '#faad14', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                            >Revert to Pending</button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        )}

        {(activeTab === 'Founders' || activeTab === 'Admins' || activeTab === 'Members') && (
            <div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden', animation: 'fadeInUp 0.4s ease-out' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.25rem' }}>{activeTab === 'Founders' ? 'Founders Management' : activeTab}</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <tr>
                            {activeTab === 'Founders' && <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase', width: '40px' }}>#</th>}
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>{activeTab === 'Founders' ? 'NAME & EMAIL' : 'NAME'}</th>
                            {activeTab === 'Founders' && <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>STARTUP</th>}
                            {activeTab === 'Founders' && <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>SUBMITTED DATE</th>}
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>{activeTab === 'Founders' ? 'SOCIAL LINKS' : 'STATUS'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(activeTab === 'Founders' ? users.slice(0, founderLimit) : activeTab === 'Admins' ? stats.adminsList : members).map((u, i) => (
                            <tr key={u.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                {activeTab === 'Founders' && <td style={{ padding: '1.25rem', fontWeight: '700', color: '#888', fontSize: '13px' }}>{i + 1}</td>}
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontWeight: '700', fontSize: '14px' }}>{u.profile?.name || u.name || 'Unnamed'}</div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>{u.email}</div>
                                </td>
                                {activeTab === 'Founders' && (
                                    <>
                                        <td style={{ padding: '1.25rem' }}>
                                            <div style={{ fontWeight: '600', fontSize: '14px' }}>{u.application?.companyName || 'N/A'}</div>
                                            <div style={{ fontSize: '12px', color: '#888' }}>{u.application?.category || 'No Category'}</div>
                                        </td>
                                        <td style={{ padding: '1.25rem', fontSize: '13px', color: '#444' }}>
                                            {u.application?.submittedAt ? new Date(u.application.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not Submitted'}
                                        </td>
                                    </>
                                )}
                                <td style={{ padding: '1.25rem' }}>
                                    {activeTab === 'Founders' ? (
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            {(u.linkedin || u.application?.founderLinkedin) && (
                                                <a href={u.linkedin?.startsWith('http') ? u.linkedin : (u.application?.founderLinkedin?.startsWith('http') ? u.application.founderLinkedin : `https://linkedin.com/in/${u.linkedin || u.application?.founderLinkedin}`)} target="_blank" rel="noopener noreferrer" style={{ color: '#0077b5', display: 'flex' }} title="LinkedIn">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                                </a>
                                            )}
                                            {(u.twitter || u.application?.founderTwitter) && (
                                                <a href={u.twitter?.startsWith('http') ? u.twitter : `https://twitter.com/${(u.twitter || u.application?.founderTwitter).replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1DA1F2', display: 'flex' }} title="Twitter / X">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                                                </a>
                                            )}
                                            {(u.instagram || u.application?.founderInstagram) && (
                                                <a href={u.instagram?.startsWith('http') ? u.instagram : `https://instagram.com/${(u.instagram || u.application?.founderInstagram).replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#E1306C', display: 'flex' }} title="Instagram">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                                                </a>
                                            )}
                                        </div>

                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ padding: '6px 10px', backgroundColor: 'rgba(0,0,0,0.05)', color: '#000', borderRadius: '6px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em' }}>ACTIVE</span>
                                            {activeTab === 'Members' && (
                                                <button 
                                                    onClick={() => handleRemoveMember(u.id)}
                                                    style={{ padding: '6px 12px', backgroundColor: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.2)'}
                                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.1)'}
                                                >Remove</button>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {activeTab === 'Founders' && users.length > founderLimit && (
                    <div style={{ padding: '1.5rem', textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                        <button onClick={() => setFounderLimit(prev => prev + 30)} style={{ padding: '10px 24px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                            Load More Founders
                        </button>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'Blog Approvals' && (
            <div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden', animation: 'fadeInUp 0.4s ease-out' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.25rem' }}>Blog Approvals</h3>
                    <span style={{ fontSize: '13px', color: '#667777' }}>{blogs.filter(b => b.status === 'pending').length} pending</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <tr>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>TITLE</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>AUTHOR</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>STATUS</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {blogs.length === 0 && (
                            <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No blog submissions found.</td></tr>
                        )}
                        {blogs.map(blog => (
                            <tr key={blog.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontWeight: '700' }}>{blog.title || 'Untitled'}</div>
                                    <div style={{ fontSize: '12px', color: '#667777', marginTop: '4px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{blog.content}</div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontWeight: '600' }}>{blog.author}</div>
                                    <div style={{ fontSize: '12px', color: '#667777' }}>{new Date(blog.date || blog.createdAt).toLocaleDateString()}</div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <span style={{
                                        padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
                                        backgroundColor: blog.status === 'approved' ? 'rgba(52,199,89,0.1)' : blog.status === 'rejected' ? 'rgba(255,59,48,0.1)' : 'rgba(255,149,0,0.1)',
                                        color: blog.status === 'approved' ? '#34c759' : blog.status === 'rejected' ? '#ff3b30' : '#ff9500'
                                    }}>
                                        {blog.status === 'approved' ? 'Published' : blog.status === 'rejected' ? 'Rejected' : 'Pending'}
                                    </span>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    {blog.status === 'pending' ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={async () => { await updateDoc(doc(db, 'blog', blog.id), { status: 'approved' }); fetchData(); }}
                                                style={{ padding: '6px 14px', backgroundColor: 'rgba(52,199,89,0.1)', color: '#34c759', border: '1px solid rgba(52,199,89,0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                            >Approve</button>
                                            <button
                                                onClick={async () => { await updateDoc(doc(db, 'blog', blog.id), { status: 'rejected' }); fetchData(); }}
                                                style={{ padding: '6px 14px', backgroundColor: 'rgba(255,59,48,0.1)', color: '#ff3b30', border: '1px solid rgba(255,59,48,0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                            >Reject</button>
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: '13px', color: '#999' }}>Reviewed</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {activeTab === 'XF Blog' && (
            <div style={{ animation: 'fadeInUp 0.4s ease-out' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h2 style={{ margin: 0, fontWeight: '800', fontSize: '1.5rem' }}>XF Blog</h2>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#667777' }}>{blogs.length} total posts &bull; {blogs.filter(b => b.status === 'approved').length} published</p>
                    </div>
                    <button
                        onClick={() => navigate('/create-blog')}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        New Post
                    </button>
                </div>

                {/* Blog List */}
                <div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                    {blogs.length === 0 && (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>No blog posts yet. Create the first one!</div>
                    )}
                    {blogs.map((blog, idx) => {
                        const statusConfig = {
                            approved: { label: 'Published', color: '#34c759', bg: 'rgba(52,199,89,0.1)', border: 'rgba(52,199,89,0.2)' },
                            pending:  { label: 'Pending',   color: '#ff9500', bg: 'rgba(255,149,0,0.1)', border: 'rgba(255,149,0,0.2)' },
                            rejected: { label: 'Rejected',  color: '#ff3b30', bg: 'rgba(255,59,48,0.1)',  border: 'rgba(255,59,48,0.2)' },
                        };
                        const s = statusConfig[blog.status] || statusConfig.pending;
                        return (
                            <div key={blog.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', padding: '1.5rem 2rem', borderBottom: idx < blogs.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                        <h3 style={{ margin: 0, fontWeight: '700', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{blog.title || 'Untitled'}</h3>
                                        <span style={{ flexShrink: 0, padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{s.label}</span>
                                    </div>
                                    <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#667777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{blog.content}</p>
                                    <div style={{ fontSize: '12px', color: '#999' }}>
                                        By <strong>{blog.author}</strong> &bull; {blog.category || 'General'} &bull; {new Date(blog.date || blog.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                                    {blog.status !== 'approved' && (
                                        <button
                                            onClick={async () => { await updateDoc(doc(db, 'blog', blog.id), { status: 'approved' }); fetchData(); }}
                                            style={{ padding: '7px 14px', backgroundColor: 'rgba(52,199,89,0.1)', color: '#34c759', border: '1px solid rgba(52,199,89,0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                        >Publish</button>
                                    )}
                                    {blog.status === 'approved' && (
                                        <button
                                            onClick={async () => { await updateDoc(doc(db, 'blog', blog.id), { status: 'pending' }); fetchData(); }}
                                            style={{ padding: '7px 14px', backgroundColor: 'rgba(255,149,0,0.1)', color: '#ff9500', border: '1px solid rgba(255,149,0,0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                        >Unpublish</button>
                                    )}
                                    <button
                                        onClick={async () => {
                                            if (window.confirm(`Delete "${blog.title || 'this post'}"? This cannot be undone.`)) {
                                                await deleteDoc(doc(db, 'blog', blog.id));
                                                fetchData();
                                            }
                                        }}
                                        style={{ padding: '7px 14px', backgroundColor: 'rgba(255,59,48,0.1)', color: '#ff3b30', border: '1px solid rgba(255,59,48,0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                    >Delete</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {activeTab === 'Member Requests' && (
            <div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden', animation: 'fadeInUp 0.4s ease-out' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.25rem' }}>Membership Requests</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <tr>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>CANDIDATE</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>REASON</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {memberApps.filter(a => a.status !== 'withdrawn').map(app => (
                            <tr key={app.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontWeight: '700' }}>{app.name}</div>
                                    <div style={{ fontSize: '12px', color: '#667777' }}>{app.email}</div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>{app.reason}</td>
<td style={{ padding: '1.25rem' }}>
                                    {app.status === 'pending' ? (
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button 
                                                onClick={() => handleMemberApproval(app.id, 'approved')} 
                                                style={{ padding: '8px 16px', backgroundColor: 'rgba(52, 199, 89, 0.1)', color: '#34c759', border: '1px solid rgba(52, 199, 89, 0.2)', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(52, 199, 89, 0.2)'}
                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(52, 199, 89, 0.1)'}
                                            >Approve</button>
                                            <button 
                                                onClick={() => handleMemberApproval(app.id, 'rejected')} 
                                                style={{ padding: '8px 16px', backgroundColor: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', border: '1px solid rgba(255, 59, 48, 0.2)', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.2)'}
                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.1)'}
                                            >Reject</button>
                                        </div>
                                    ) : <span style={{ padding: '4px 10px', borderRadius: '4px', backgroundColor: app.status === 'approved' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)', color: app.status === 'approved' ? '#34c759' : '#ff3b30', fontSize: '11px', fontWeight: '800' }}>{app.status?.toUpperCase()}</span>}
                                </td>

                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {activeTab === 'Withdrawn Apps' && (
            <div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden', animation: 'fadeInUp 0.4s ease-out' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.25rem' }}>Withdrawn Applications</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <tr>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>CANDIDATE / STARTUP</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>TYPE</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            ...applications.filter(a => a.status === 'withdrawn').map(a => ({ ...a, displayType: 'Founder' })),
                            ...memberApps.filter(a => a.status === 'withdrawn').map(a => ({ ...a, displayType: 'Member', userName: a.name, userEmail: a.email }))
                        ].map((app, idx) => (
                            <tr key={app.id + idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontWeight: '700' }}>{app.userName || app.companyName}</div>
                                    <div style={{ fontSize: '12px', color: '#667777' }}>{app.userEmail}</div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{app.displayType}</span>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <span style={{ padding: '4px 10px', borderRadius: '4px', backgroundColor: 'rgba(255, 149, 0, 0.1)', color: '#ff9500', fontSize: '11px', fontWeight: '800' }}>WITHDRAWN</span>
                                </td>
                            </tr>
                        ))}
                        {applications.filter(a => a.status === 'withdrawn').length === 0 && memberApps.filter(a => a.status === 'withdrawn').length === 0 && (
                            <tr>
                                <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No withdrawn applications found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}
        {/* Toast Notification */}
        {showToast && (
          <div style={{ 
            position: 'fixed', 
            bottom: '40px', 
            right: '40px', 
            backgroundColor: '#fff', 
            padding: '16px 24px', 
            borderRadius: '12px', 
            boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 5000,
            animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            borderLeft: '6px solid #4caf50',
            minWidth: '280px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="16 12 12 8 8 12"></polyline><line x1="12" y1="16" x2="12" y2="8"></line></svg>
            </div>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a', flex: 1 }}>{toastMessage}</span>
            <div 
                onClick={() => setShowToast(false)} 
                style={{ 
                    cursor: 'pointer', 
                    color: '#ccc', 
                    fontSize: '18px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '4px',
                    marginLeft: '8px'
                }}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
