import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, writeBatch } from 'firebase/firestore';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [applications, setApplications] = useState([]);
  const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [memberApps, setMemberApps] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalApps: 0, pending: 0, approved: 0, pendingBlogs: 0, pendingMembers: 0, totalAdmins: 0, totalMembers: 0, adminsList: [] });
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
      const uList = []; const aList = []; let p = 0; let apprv = 0;
      uSnap.forEach(d => {
          const data = d.data(); uList.push({ id: d.id, ...data });
          if (data.application) {
              const app = { id: d.id, ...data.application, userEmail: data.email, userName: data.profile?.name || 'Founder' };
              aList.push(app);
              if (app.status === 'pending' || !app.status) p++;
              if (app.status === 'approved') apprv++;
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

      setUsers(uList); setMembers(mList); setApplications(aList); setBlogs(bList); setMemberApps(maList);
      setStats({ 
        totalUsers: uList.length, 
        totalApps: aList.length, 
        pending: p, 
        approved: apprv,
        pendingBlogs: pb, 
        pendingMembers: pm,
        totalAdmins: adminsSnap.size,
        totalMembers: mList.length,
        adminsList
      });
    } catch (e) { console.error(e); }
  };

  const handleAppStatus = async (uid, newStatus) => {
    try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, { 'application.status': newStatus });
        setToastMessage(`Application ${newStatus}!`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        fetchData();
    } catch (e) { alert(e.message); }
  };

  const handleMemberApproval = async (uid, newStatus) => {
    try {
        if (newStatus === 'approved') {
            const userDoc = await getDoc(doc(db, 'users', uid));
            const userData = userDoc.data();
            if (userData) {
                const batch = writeBatch(db);
                batch.set(doc(db, 'members', uid), { ...userData, role: 'member', approvedAt: new Date().toISOString() });
                batch.delete(doc(db, 'users', uid));
                batch.update(doc(db, 'memberApplications', uid), { status: 'approved' });
                await batch.commit();
            }
        } else await updateDoc(doc(db, 'memberApplications', uid), { status: 'rejected' });
        alert("Action completed"); fetchData();
    } catch (e) { alert(e.message); }
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

  const TABS = ['Overview', 'Pending Apps', 'Applications', 'Founders', 'Admins', 'Members', 'Blog Approvals', 'Member Requests', 'Settings'];

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
          {TABS.map((tab) => (
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
                  height: '46px'
              }}>
                {tab}
              </div>
          ))}
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
                <div style={{ width: '36px', height: '36px', backgroundColor: '#6300dd', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 12px rgba(99, 0, 221, 0.2)' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
                <div onClick={() => setActiveTab('Pending Apps')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', cursor: 'pointer' }}>
                    <div style={{ color: '#1a1a1a', fontSize: '13px', marginBottom: '10px', fontWeight: '600' }}>Applications written</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#1a1a1a' }}>{stats.pending}</div>
                </div>
                <div onClick={() => setActiveTab('Applications')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', cursor: 'pointer' }}>
                    <div style={{ color: '#1a1a1a', fontSize: '13px', marginBottom: '10px', fontWeight: '600' }}>Applications</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#1a1a1a' }}>{stats.pending + stats.approved + applications.filter(a => a.status === 'hold' || a.status === 'rejected').length}</div>
                </div>
                <div onClick={() => setActiveTab('Founders')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', cursor: 'pointer' }}>
                    <div style={{ color: '#1a1a1a', fontSize: '13px', marginBottom: '10px', fontWeight: '600' }}>Total Founders</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#1a1a1a' }}>{stats.totalUsers}</div>
                </div>
                <div onClick={() => setActiveTab('Members')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', cursor: 'pointer' }}>
                    <div style={{ color: '#1a1a1a', fontSize: '13px', marginBottom: '10px', fontWeight: '600' }}>Total Members</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#1a1a1a' }}>{stats.totalMembers}</div>
                </div>
                <div onClick={() => setActiveTab('Admins')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', cursor: 'pointer' }}>
                    <div style={{ color: '#1a1a1a', fontSize: '13px', marginBottom: '10px', fontWeight: '600' }}>Total Admins</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#1a1a1a' }}>{stats.totalAdmins}</div>
                </div>
                <div onClick={() => setActiveTab('Member Requests')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', cursor: 'pointer' }}>
                    <div style={{ color: '#1a1a1a', fontSize: '13px', marginBottom: '10px', fontWeight: '600' }}>Pending Members</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#1a1a1a' }}>{stats.pendingMembers}</div>
                </div>
            </div>
        )}

        {(activeTab === 'Pending Apps' || activeTab === 'Applications') && (
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
                                        <button onClick={() => handleAppStatus(app.id, 'pending')} style={{ padding: '6px 12px', backgroundColor: '#faad14', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Revert to Pending</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {(activeTab === 'Users' || activeTab === 'Admins' || activeTab === 'Members') && (
            <div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden', animation: 'fadeInUp 0.4s ease-out' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.25rem' }}>{activeTab} Management</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <tr>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>NAME</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>EMAIL</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(activeTab === 'Users' ? users : activeTab === 'Admins' ? stats.adminsList : members).map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                <td style={{ padding: '1.25rem', fontWeight: '700' }}>{u.profile?.name || u.name || 'Anonymous'}</td>
                                <td style={{ padding: '1.25rem' }}>{u.email}</td>
                                <td style={{ padding: '1.25rem' }}><span style={{ padding: '4px 8px', backgroundColor: 'rgba(99, 0, 221, 0.1)', color: '#6300dd', borderRadius: '4px', fontSize: '11px', fontWeight: '800' }}>ACTIVE</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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
                        {memberApps.map(app => (
                            <tr key={app.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontWeight: '700' }}>{app.name}</div>
                                    <div style={{ fontSize: '12px', color: '#667777' }}>{app.email}</div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>{app.reason}</td>
                                <td style={{ padding: '1.25rem' }}>
                                    {app.status === 'pending' ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => handleMemberApproval(app.id, 'approved')} style={{ padding: '6px 12px', backgroundColor: '#52c41a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Approve</button>
                                            <button onClick={() => handleMemberApproval(app.id, 'rejected')} style={{ padding: '6px 12px', backgroundColor: '#f5222d', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Reject</button>
                                        </div>
                                    ) : <span style={{ fontSize: '12px', fontWeight: 'bold', color: app.status === 'approved' ? '#52c41a' : '#f5222d' }}>{app.status?.toUpperCase()}</span>}
                                </td>
                            </tr>
                        ))}
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
