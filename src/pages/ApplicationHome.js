import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

const ApplicationHome = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [applications, setApplications] = useState([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "My Applications";
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser && !loading) {
        navigate('/login');
      }
      setUser(currentUser);
      
      if (currentUser) {
        try {
            // Check if user is an admin or member to redirect them
            const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
            if (adminDoc.exists()) {
                navigate('/admin');
                return;
            }

            const memberDoc = await getDoc(doc(db, 'members', currentUser.uid));
            if (memberDoc.exists()) {
                navigate('/member');
                return;
            }

            // Fetch all applications for this founder
            const q = query(collection(db, 'applications'), where('founderId', '==', currentUser.uid));
            const querySnapshot = await getDocs(q);
            const fetchedApps = [];
            querySnapshot.forEach((doc) => {
                fetchedApps.push({ id: doc.id, ...doc.data() });
            });

            // Fallback for legacy application in user doc
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists() && userSnap.data().application && fetchedApps.length === 0) {
                fetchedApps.push({ id: 'legacy', ...userSnap.data().application });
            }

            setApplications(fetchedApps);
        } catch (error) {
            console.error("Error fetching applications:", error);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate, loading]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleWithdraw = async () => {
    if (!user || !selectedAppId) return;
    setIsWithdrawing(true);

    try {
        if (selectedAppId === 'legacy') {
            await updateDoc(doc(db, 'users', user.uid), {
                'application.status': 'withdrawn'
            });
        } else {
            await updateDoc(doc(db, 'applications', selectedAppId), {
                status: 'withdrawn'
            });
        }
        
        setApplications(prev => prev.map(app => app.id === selectedAppId ? { ...app, status: 'withdrawn' } : app));
        setShowWithdrawModal(false);
    } catch (error) {
        console.error("Error withdrawing application:", error);
    } finally {
        setIsWithdrawing(false);
    }
  };

  if (loading) return null;

  const tabStyle = (id) => ({
    paddingBottom: '0.5rem',
    borderBottom: activeTab === id ? '2px solid black' : 'none',
    fontWeight: activeTab === id ? 'bold' : 'normal',
    fontSize: '14px',
    cursor: 'pointer',
    color: activeTab === id ? '#000' : '#888',
    fontFamily: 'Inter, sans-serif'
  });

  const getStatusBadge = (status) => {
    switch (status) {
        case 'pending':
            return { text: 'Submitted', color: '#111', bg: '#e6f7ff', border: '#91d5ff' };
        case 'approved':
            return { text: 'Approved', color: '#52c41a', bg: '#f6ffed', border: '#b7eb8f' };
        case 'hold':
            return { text: 'On Hold', color: '#faad14', bg: '#fff7e6', border: '#ffe58f' };
        case 'rejected':
            return { text: 'Rejected', color: '#ff4d4f', bg: '#fff1f0', border: '#ffa39e' };
        case 'withdrawn':
            return { text: 'Withdrawn', color: '#ff4d4f', bg: '#fff1f0', border: '#ffa39e' };
        default:
            return { text: 'Draft', color: '#856404', bg: '#fffbe6', border: '#ffe58f' };
    }
  };

  return (
    <div style={{ backgroundColor: '#f6f6ef', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#111' }}>
      {/* Top Navbar */}
      <nav style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        padding: '1.25rem 2.5rem', 
        backgroundColor: '#f6f6ef',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        userSelect: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" style={{ backgroundColor: '#6300dd', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '18px', textDecoration: 'none' }}>X</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
            <span>{user?.displayName || user?.email?.split('@')[0]}</span>
            <Link to="/founderscompany/dashboard?tab=profile" style={{ display: 'flex', alignItems: 'center', color: '#999', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#6300dd'} onMouseLeave={e => e.currentTarget.style.color = '#999'}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
            </Link>
          </div>
          <span style={{ color: '#ccc' }}>|</span>
          <Link to="/" onClick={handleLogout} style={{ textDecoration: 'none', color: '#000', fontWeight: '500', fontStyle: 'italic', fontFamily: 'Newsreader, serif', fontSize: '15px' }}>Log out</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '4rem auto', display: 'flex', gap: '4rem', padding: '0 2rem' }}>
        {/* Main Content */}
        <div style={{ flex: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
            <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '3.25rem', fontWeight: 500, fontStyle: 'italic', margin: 0, letterSpacing: '-0.02em' }}>My Applications</h1>
            <button 
                onClick={() => navigate('/apply-form/new')}
                style={{ 
                    backgroundColor: '#6300dd', 
                    color: 'white', 
                    border: 'none', 
                    padding: '12px 24px', 
                    borderRadius: '30px', 
                    fontSize: '15px', 
                    fontWeight: 'bold', 
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif'
                }}
            >
                Start new application
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem', borderBottom: '1px solid #ddd' }}>
            <span onClick={() => setActiveTab('active')} style={tabStyle('active')}>Active</span>
            <span onClick={() => setActiveTab('previous')} style={tabStyle('previous')}>Previous</span>
            <span onClick={() => setActiveTab('approved')} style={tabStyle('approved')}>Approved</span>
            <span onClick={() => setActiveTab('rejected')} style={tabStyle('rejected')}>Rejected</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {(() => {
            const filteredApps = applications.filter(app => {
              if (activeTab === 'active') return ['draft', 'pending', 'hold'].includes(app.status || 'draft');
              if (activeTab === 'previous') return app.status === 'withdrawn';
              if (activeTab === 'approved') return app.status === 'approved';
              if (activeTab === 'rejected') return app.status === 'rejected';
              return false;
            });

            if (filteredApps.length > 0) {
              return filteredApps.map(app => {
                const badge = getStatusBadge(app.status);
                return (
                    <div key={app.id} style={{ backgroundColor: 'white', borderRadius: '4px', border: '1px solid #111', padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#111', fontWeight: 'bold' }}>{app.companyName || 'Untitled'}</h3>
                        <span style={{ backgroundColor: '#eee', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{app.batch || 'Upcoming'}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '14px' }}>
                        Founders: <span style={{ color: '#6300dd' }}>{app.founderName || user?.displayName || 'Founder'}</span>
                        </p>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
                        <span style={{ backgroundColor: badge.bg, color: badge.color, padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', border: `1px solid ${badge.border}` }}>
                            {badge.text}
                        </span>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                        {app.status === 'approved' ? (
                            <button 
                            onClick={() => navigate('/founderscompany/dashboard')}
                            style={{ 
                                backgroundColor: '#6300dd', 
                                color: 'white', 
                                border: 'none', 
                                padding: '8px 24px', 
                                borderRadius: '20px', 
                                fontSize: '13px', 
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontFamily: 'Inter, sans-serif'
                            }}
                            >Go to Dashboard</button>
                        ) : (
                            <button 
                            onClick={() => navigate('/preview-application')}
                            style={{ 
                                backgroundColor: 'white', 
                                border: '1px solid #111', 
                                padding: '8px 24px', 
                                borderRadius: '20px', 
                                fontSize: '13px', 
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontFamily: 'Inter, sans-serif'
                            }}
                            >Preview</button>
                        )}
                        {['draft', 'withdrawn', 'hold'].includes(app.status || 'draft') && (
                            <button 
                                onClick={() => navigate(app.id === 'legacy' ? '/apply-form' : `/apply-form/${app.id}`)}
                                style={{ 
                                backgroundColor: 'black', 
                                color: 'white', 
                                border: 'none', 
                                padding: '8px 24px', 
                                borderRadius: '20px', 
                                fontSize: '13px', 
                                fontWeight: 'bold', 
                                cursor: 'pointer',
                                fontFamily: 'Inter, sans-serif'
                            }}>Edit</button>
                        )}
                        {app.status === 'pending' && (() => {
                            const submittedTime = new Date(app.submittedAt).getTime();
                            const now = new Date().getTime();
                            const hoursSinceSubmission = (now - submittedTime) / (1000 * 60 * 60);
                            const isWithin24 = hoursSinceSubmission <= 24;
                            
                            const remainingMs = (submittedTime + 24 * 60 * 60 * 1000) - now;
                            const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
                            const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                            const countdown = remainingMs > 0 ? `${remainingHours}h ${remainingMinutes}m left to edit` : '';

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                    {isWithin24 && (
                                        <button 
                                            onClick={() => navigate(app.id === 'legacy' ? '/apply-form' : `/apply-form/${app.id}`)}
                                            style={{ 
                                            backgroundColor: 'black', 
                                            color: 'white', 
                                            border: 'none', 
                                            padding: '8px 24px', 
                                            borderRadius: '20px', 
                                            fontSize: '13px', 
                                            fontWeight: 'bold', 
                                            cursor: 'pointer',
                                            fontFamily: 'Inter, sans-serif'
                                        }}>Edit</button>
                                    )}
                                    {isWithin24 && remainingMs > 0 && (
                                        <span style={{ fontSize: '11px', color: '#ff9500', fontWeight: 'bold' }}>{countdown}</span>
                                    )}
                                </div>
                            );
                        })()}
                        {app.status === 'pending' && (
                            <button 
                                onClick={() => { setSelectedAppId(app.id); setShowWithdrawModal(true); }}
                                style={{ 
                                backgroundColor: 'transparent', 
                                border: '1px solid #ff4d4f', 
                                color: '#ff4d4f',
                                padding: '8px 24px', 
                                borderRadius: '20px', 
                                fontSize: '13px', 
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontFamily: 'Inter, sans-serif'
                            }}>Withdraw</button>
                        )}
                        </div>
                    </div>
                    </div>
                );
              });
            } else if (activeTab === 'active') {
              return (
                <div style={{ backgroundColor: '#f0eaff', borderRadius: '4px', border: '1px solid #6300dd33', padding: '3.5rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem', fontFamily: 'Inter, sans-serif', color: '#111' }}>Start an application</h3>
                    <p style={{ margin: 0, color: '#666', fontSize: '15px' }}>Submit it when you're ready.</p>
                  </div>
                  <button 
                    onClick={() => navigate('/apply-form/new')}
                    style={{ 
                      backgroundColor: 'black', 
                      color: 'white', 
                      border: 'none', 
                      padding: '12px 32px', 
                      borderRadius: '30px', 
                      fontSize: '15px', 
                      fontWeight: 'bold', 
                      cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif'
                    }}
                  >
                    Start application
                  </button>
                </div>
              );
            } else {
              return (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#888', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '4px', border: '1px dashed #ddd' }}>
                  No {activeTab} applications found.
                </div>
              );
            }
          })()}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ flex: 1, paddingTop: '1rem' }}>
          <ul style={{ listStyle: 'none', padding: 0, fontSize: '14px', lineHeight: '2.2' }}>
            <li><Link to="/faq" style={{ color: '#000', textDecoration: 'underline' }}>FAQ</Link></li>
            <li><Link to="/what-happens" style={{ color: '#000', textDecoration: 'underline' }}>What happens at XF</Link></li>
            <li><a href="https://www.youtube.com/watch?v=Th8JoIan4dg" target="_blank" rel="noopener noreferrer" style={{ color: '#000', textDecoration: 'underline' }}>How to get startup ideas</a></li>
            <li><a href="mailto:xfoundary@gmail.com" style={{ color: '#000', textDecoration: 'underline' }}>Report a bug</a></li>
          </ul>
        </div>
      </div>

      {/* Custom Withdrawal Modal */}
      {showWithdrawModal && (
        <div style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'transparent', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 2000
        }}>
            <div style={{ 
                backgroundColor: '#fff', 
                padding: '2.5rem', 
                borderRadius: '16px', 
                maxWidth: '450px', 
                width: '90%', 
                boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
                textAlign: 'center',
                border: '1px solid #eee',
                animation: 'modalShow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
                <div style={{ backgroundColor: '#fff1f0', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ff4d4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111' }}>Withdraw Application?</h2>
                <p style={{ color: '#666', fontSize: '15px', lineHeight: '1.6', marginBottom: '2rem' }}>
                    Are you sure you want to withdraw? Your data will be <b>saved as a draft</b> so you can edit and resubmit later.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button 
                        onClick={() => setShowWithdrawModal(false)}
                        disabled={isWithdrawing}
                        style={{ 
                            backgroundColor: '#fff', 
                            color: '#000', 
                            border: '1px solid #e5e5e0', 
                            padding: '12px 24px', 
                            borderRadius: '30px', 
                            fontWeight: 'bold', 
                            fontSize: '15px', 
                            cursor: 'pointer',
                            flex: 1,
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                            fontFamily: 'Inter, sans-serif'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                    >Cancel</button>
                    <button 
                        onClick={handleWithdraw}
                        disabled={isWithdrawing}
                        style={{ 
                            backgroundColor: '#ff4d4f', 
                            color: 'white', 
                            border: 'none', 
                            padding: '12px 24px', 
                            borderRadius: '30px', 
                            fontWeight: 'bold', 
                            fontSize: '15px', 
                            cursor: isWithdrawing ? 'not-allowed' : 'pointer',
                            flex: 1,
                            opacity: isWithdrawing ? 0.7 : 1,
                            transition: 'all 0.2s',
                            fontFamily: 'Inter, sans-serif'
                        }}>
                        {isWithdrawing ? 'Withdrawing...' : 'Yes, Withdraw'}
                    </button>
                </div>
            </div>
        </div>
      )}
      <style>{`
          @keyframes modalShow {
            0% { transform: scale(0.9); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
      `}</style>
    </div>
  );
};

export default ApplicationHome;
