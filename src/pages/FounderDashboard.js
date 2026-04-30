import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../firebase';
import { onAuthStateChanged, updateProfile, updateEmail } from 'firebase/auth';
import { 
    doc, getDoc, updateDoc, onSnapshot, 
    collection, query, where, getDocs, addDoc, deleteDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const FounderDashboard = () => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [appData, setAppData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [activeTab, setActiveTab] = useState('company');
    const [jobs, setJobs] = useState([]);
    const [showJobModal, setShowJobModal] = useState(false);
    const [currentJob, setCurrentJob] = useState({ role: '', type: 'Full-time', location: '', description: '', link: '' });
    const [editingJobId, setEditingJobId] = useState(null);
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const industryOptions = [
        "B2B", "Analytics", "Engineering, Product and Design", "Finance and Accounting", "Human Resources", "Infrastructure", "Legal", "Marketing", "Office Management", "Operations", "Productivity", "Recruiting and Talent", "Retail", "Sales", "Security", "Supply Chain and Logistics",
        "Consumer", "Apparel and Cosmetics", "Consumer Electronics", "Content", "Food and Beverage", "Gaming", "Home and Personal", "Job and Career Services", "Social", "Transportation Services", "Travel, Leisure and Tourism", "Virtual and Augmented Reality",
        "Fintech", "Asset Management", "Banking and Exchange", "Consumer Finance", "Credit and Lending", "Insurance", "Payments",
        "Healthcare", "Consumer Health and Wellness", "Diagnostics", "Drug Discovery and Delivery", "Healthcare IT", "Healthcare Services", "Industrial Bio", "Medical Devices", "Therapeutics",
        "Industrials", "Agriculture", "Automotive", "Aviation and Space", "Climate", "Defense", "Drones", "Energy", "Manufacturing and Robotics",
        "Real Estate and Construction", "Construction", "Housing and Real Estate",
        "Government", "Education"
    ].sort();

    const locationSuggestions = [
        "Ahmedabad, India", "Bengaluru, India", "Mumbai, India", "Delhi NCR, India", "Hyderabad, India", "Pune, India", "Chennai, India", "Kolkata, India", "Jaipur, India", "Surat, India",
        "San Francisco, USA", "New York, USA", "London, UK", "Singapore", "Berlin, Germany", "Tokyo, Japan", "Remote"
    ];

    useEffect(() => {
        let unsubDoc = null;
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    // Admin check
                    const adminCheck = await getDoc(doc(db, 'admins', currentUser.uid));
                    if (adminCheck.exists()) {
                        alert("Access Denied: Admin accounts cannot access the Founder Dashboard.");
                        await auth.signOut();
                        navigate('/login');
                        return;
                    }

                    const userRef = doc(db, 'users', currentUser.uid);
                    unsubDoc = onSnapshot(userRef, (docSnap) => {
                        if (docSnap.exists()) {
                            const data = docSnap.data();
                            if (data.application && data.application.status === 'approved') {
                                setAppData(data.application);
                                setUserData(data);
                                setLoading(false);
                            } else {
                                navigate('/home');
                            }
                        } else {
                            navigate('/login');
                        }
                    });

                    // Fetch Jobs
                    const jobsQuery = query(collection(db, 'jobs'), where('founderId', '==', currentUser.uid));
                    const jobsSnap = await getDocs(jobsQuery);
                    setJobs(jobsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                } catch (err) {
                    console.error(err);
                    setLoading(false);
                }
            } else {
                navigate('/login');
            }
        });
        return () => {
            unsubscribeAuth();
            if (unsubDoc) unsubDoc();
        };
    }, [navigate]);

    const handleJobSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const jobData = {
                ...currentJob,
                founderId: user.uid,
                companyName: appData.companyName,
                companyLogo: userData.photoURL || '',
                createdAt: new Date().toISOString()
            };

            if (editingJobId) {
                await updateDoc(doc(db, 'jobs', editingJobId), jobData);
                setJobs(jobs.map(j => j.id === editingJobId ? { id: editingJobId, ...jobData } : j));
            } else {
                const docRef = await addDoc(collection(db, 'jobs'), jobData);
                setJobs([...jobs, { id: docRef.id, ...jobData }]);
            }

            setShowJobModal(false);
            setCurrentJob({ role: '', type: 'Full-time', location: '', description: '', link: '' });
            setEditingJobId(null);
            setMessage({ text: 'Job posted successfully!', type: 'success' });
        } catch (err) {
            console.error(err);
            setMessage({ text: 'Failed to save job.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const deleteJob = async (id) => {
        if (!window.confirm('Delete this job posting?')) return;
        try {
            await deleteDoc(doc(db, 'jobs', id));
            setJobs(jobs.filter(j => j.id !== id));
        } catch (err) { console.error(err); }
    };

    const handleCompanySave = async (e) => {
        e.preventDefault();
        if (!user || !appData) return;
        setSaving(true);
        setMessage({ text: '', type: '' });
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                'application.companyName': appData.companyName || '',
                'application.companyDescription': appData.companyDescription || '',
                'application.basedIn': appData.basedIn || '',
                'application.category': appData.category || '',
                'application.companyUrl': appData.companyUrl || '',
                'application.socials': appData.socials || {}
            });
            setMessage({ text: 'Company information updated successfully!', type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 5000);
        } catch (error) {
            console.error("Error saving data:", error);
            setMessage({ text: 'Failed to update company info. Please try again.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleProfileSave = async (e) => {
        e.preventDefault();
        if (!user || !userData) return;
        setSaving(true);
        setMessage({ text: '', type: '' });
        try {
            // Update Auth Profile
            await updateProfile(user, {
                displayName: userData.profile?.name || user.displayName
            });

            // Update Email if changed
            if (userData.email && userData.email !== user.email) {
                try {
                    await updateEmail(user, userData.email);
                } catch (emailErr) {
                    if (emailErr.code === 'auth/requires-recent-login') {
                        throw new Error("This action requires a recent login. Please log out and log back in to change your email.");
                    }
                    throw emailErr;
                }
            }

            // Update Firestore
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                'profile.name': userData.profile?.name || '',
                'username': userData.username || '',
                'email': userData.email || user.email,
                'socials': userData.socials || {}
            });

            setMessage({ text: 'Profile updated successfully!', type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 5000);
        } catch (error) {
            console.error("Error saving profile:", error);
            setMessage({ text: 'Failed to update profile. ' + error.message, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !user) return;

        setSaving(true);
        try {
            const storageRef = ref(storage, `profile_images/${user.uid}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            // Update Auth
            await updateProfile(user, { photoURL: downloadURL });

            // Update Firestore
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { photoURL: downloadURL });

            setUserData({ ...userData, photoURL: downloadURL });
            setMessage({ text: 'Profile image updated!', type: 'success' });
        } catch (error) {
            console.error("Error uploading image:", error);
            setMessage({ text: 'Failed to upload image.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading || !appData) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5ee' }}>
            <div className="logo-container">
                <span style={{ fontSize: '24px' }}>X</span>
            </div>
            <div style={{ fontSize: '18px', color: '#6300dd', fontWeight: 600 }}>Loading Dashboard...</div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f5f5ee', display: 'flex' }}>
            <style>{`
                .simple-sidebar {
                    width: 240px;
                    background-color: #f5f5ee;
                    border-right: 1px solid #e5e5e0;
                    padding: 2.5rem 1.25rem;
                    height: 100vh;
                    position: fixed;
                    left: 0;
                    top: 0;
                    display: flex;
                    flex-direction: column;
                    z-index: 50;
                    padding-top: 100px;
                }
                .portal-main {
                    flex: 1;
                    margin-left: 240px;
                    padding: 5rem 4rem;
                    padding-top: 120px;
                    min-height: 100vh;
                }
                .nav-btn {
                    width: 100%;
                    text-align: left;
                    padding: 10px 14px;
                    border-radius: 4px;
                    border: 1px solid transparent;
                    background: transparent;
                    font-size: 14px;
                    font-weight: 600;
                    color: #555;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 2px;
                }
                .nav-btn.active {
                    background: #fff;
                    color: #111;
                    border-color: #ddd;
                }
                .nav-btn:hover:not(.active) {
                    background: rgba(0,0,0,0.03);
                }
                .content-section {
                    max-width: 750px;
                }
                .form-group { margin-bottom: 1.75rem; }
                .label-text {
                    display: block;
                    font-size: 11px;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                    color: #777;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .portal-input {
                    width: 100%;
                    padding: 10px 14px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 15px;
                    outline: none;
                    transition: border-color 0.2s;
                    background: #fff;
                    color: #111;
                    font-family: 'Inter', sans-serif;
                }
                .portal-input:focus { 
                    border-color: #111; 
                }
                .action-btn {
                    background: #111;
                    color: #fff;
                    border: 1px solid #111;
                    padding: 10px 20px;
                    border-radius: 4px;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .action-btn:hover {
                    background: #333;
                }
                .action-btn:disabled {
                    background: #ccc;
                    border-color: #ccc;
                    cursor: not-allowed;
                }
                .profile-box {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    margin-bottom: 3.5rem;
                }
                .avatar-circle {
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    background: #fff;
                    border: 1px solid #ddd;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                    transition: all 0.2s;
                }
                .avatar-circle:hover { border-color: #111; }
                .avatar-circle img { width: 100%; height: 100%; object-fit: cover; }
            `}</style>

            <aside className="simple-sidebar">
                <div style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#111' }}>Founder Portal</h2>
                    <p style={{ fontSize: '11px', color: '#888', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manage your startup</p>
                </div>

                <nav style={{ flex: 1 }}>
                    <button 
                        className={`nav-btn ${activeTab === 'company' ? 'active' : ''}`}
                        onClick={() => setActiveTab('company')}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        Company Profile
                    </button>
                    <button 
                        className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        Account Settings
                    </button>
                    <button 
                        className={`nav-btn ${activeTab === 'jobs' ? 'active' : ''}`}
                        onClick={() => setActiveTab('jobs')}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                        Startup Jobs
                    </button>
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid #e5e5e0' }}>
                    <button className="nav-btn" onClick={() => navigate('/directory')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        View Directory
                    </button>
                </div>
            </aside>

            <main className="portal-main">
                <div className="content-section">
                    {message.text && (
                        <div style={{ 
                            padding: '12px 16px', 
                            borderRadius: '6px', 
                            backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                            color: message.type === 'success' ? '#16a34a' : '#dc2626',
                            marginBottom: '2rem',
                            fontSize: '14px',
                            fontWeight: '500',
                            border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            {message.text}
                        </div>
                    )}

                    {activeTab === 'company' ? (
                        <>
                            <div style={{ marginBottom: '3rem' }}>
                                <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#111' }}>Company Profile</h1>
                                <p style={{ color: '#666', marginTop: '6px', fontSize: '15px' }}>Information displayed in the public startup directory</p>
                            </div>

                            <form onSubmit={handleCompanySave}>
                                <div className="form-group">
                                    <label className="label-text">Company Name</label>
                                    <input 
                                        className="portal-input"
                                        value={appData.companyName || ''}
                                        onChange={(e) => setAppData({...appData, companyName: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="label-text">Category / Industry</label>
                                    <select 
                                        className="portal-input"
                                        value={appData.category || ''}
                                        onChange={(e) => setAppData({...appData, category: e.target.value})}
                                        required
                                    >
                                        <option value="">Select an industry...</option>
                                        {industryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="label-text">Location (City, Country)</label>
                                    <input 
                                        className="portal-input"
                                        list="location-list"
                                        value={appData.basedIn || ''}
                                        onChange={(e) => setAppData({...appData, basedIn: e.target.value})}
                                        placeholder="e.g. Ahmedabad, India"
                                        required
                                    />
                                    <datalist id="location-list">
                                        {locationSuggestions.map(loc => <option key={loc} value={loc} />)}
                                    </datalist>
                                </div>

                                <div className="form-group">
                                    <label className="label-text">Website URL</label>
                                    <input 
                                        className="portal-input"
                                        value={appData.companyUrl || ''}
                                        onChange={(e) => setAppData({...appData, companyUrl: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="label-text">Company Twitter/X URL</label>
                                    <input 
                                        className="portal-input"
                                        value={appData.socials?.twitter || ''}
                                        onChange={(e) => setAppData({...appData, socials: {...(appData.socials || {}), twitter: e.target.value}})}
                                        placeholder="https://x.com/yourcompany"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="label-text">One-line Description</label>
                                    <textarea 
                                        className="portal-input"
                                        style={{ minHeight: '100px', resize: 'vertical' }}
                                        value={appData.companyDescription || ''}
                                        onChange={(e) => setAppData({...appData, companyDescription: e.target.value})}
                                        required
                                    />
                                </div>

                                <div style={{ marginTop: '2.5rem' }}>
                                    <button type="submit" disabled={saving} className="action-btn">
                                        {saving ? 'Updating...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : activeTab === 'profile' ? (
                        <>
                            <div className="profile-box">
                                <div className="avatar-circle" onClick={() => fileInputRef.current.click()}>
                                    {userData.photoURL ? (
                                        <img src={userData.photoURL} alt="Avatar" />
                                    ) : (
                                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#999' }}>
                                            {userData.profile?.name?.charAt(0).toUpperCase() || 'F'}
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        style={{ display: 'none' }} 
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                </div>
                                <div>
                                    <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#111' }}>Account Settings</h1>
                                    <p style={{ color: '#666', marginTop: '4px', fontSize: '14px' }}>Personal information and contact details</p>
                                </div>
                            </div>

                            <form onSubmit={handleProfileSave}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div className="form-group">
                                        <label className="label-text">Display Name</label>
                                        <input 
                                            className="portal-input"
                                            value={userData.profile?.name || ''}
                                            onChange={(e) => setUserData({...userData, profile: {...(userData.profile || {}), name: e.target.value}})}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="label-text">Username</label>
                                        <input 
                                            className="portal-input"
                                            value={userData.username || ''}
                                            onChange={(e) => setUserData({...userData, username: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="label-text">Email Address</label>
                                    <input 
                                        className="portal-input"
                                        type="email"
                                        value={userData.email || ''}
                                        onChange={(e) => setUserData({...userData, email: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="label-text">Personal LinkedIn URL</label>
                                    <input 
                                        className="portal-input"
                                        value={userData.socials?.linkedin || ''}
                                        onChange={(e) => setUserData({...userData, socials: {...(userData.socials || {}), linkedin: e.target.value}})}
                                        placeholder="https://linkedin.com/in/username"
                                    />
                                </div>

                                <div style={{ marginTop: '2.5rem' }}>
                                    <button type="submit" disabled={saving} className="action-btn">
                                        {saving ? 'Updating...' : 'Save Profile'}
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                                <div>
                                    <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#111' }}>Startup Jobs</h1>
                                    <p style={{ color: '#666', marginTop: '6px', fontSize: '15px' }}>Job openings at {appData.companyName}</p>
                                </div>
                                <button className="action-btn" onClick={() => { setEditingJobId(null); setCurrentJob({ role: '', type: 'Full-time', location: '', description: '', link: '' }); setShowJobModal(true); }}>
                                    + Post Job
                                </button>
                            </div>

                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {jobs.length > 0 ? jobs.map(job => (
                                    <div key={job.id} style={{ padding: '1rem 1.5rem', border: '1px solid #e5e5e0', borderRadius: '8px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>{job.role}</h3>
                                            <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '13px', color: '#666' }}>
                                                <span>{job.type}</span>
                                                <span>&bull;</span>
                                                <span>{job.location}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => { setEditingJobId(job.id); setCurrentJob(job); setShowJobModal(true); }} style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Edit</button>
                                            <button onClick={() => deleteJob(job.id)} style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Delete</button>
                                        </div>
                                    </div>
                                )) : (
                                    <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed #ddd', borderRadius: '8px', color: '#999', fontSize: '14px' }}>
                                        No active job postings.
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Job Modal */}
            {showJobModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2.5rem', width: '550px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', position: 'relative' }}>
                        <h2 style={{ margin: '0 0 1.5rem 0', fontWeight: '800', fontSize: '20px' }}>{editingJobId ? 'Edit Job' : 'Post a Job'}</h2>
                        <form onSubmit={handleJobSave}>
                            <div className="form-group">
                                <label className="label-text">Position Role</label>
                                <input className="portal-input" value={currentJob.role} onChange={e => setCurrentJob({...currentJob, role: e.target.value})} required />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div className="form-group">
                                    <label className="label-text">Job Type</label>
                                    <select className="portal-input" value={currentJob.type} onChange={e => setCurrentJob({...currentJob, type: e.target.value})}>
                                        <option>Full-time</option>
                                        <option>Part-time</option>
                                        <option>Contract</option>
                                        <option>Internship</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="label-text">Location</label>
                                    <input className="portal-input" value={currentJob.location} onChange={e => setCurrentJob({...currentJob, location: e.target.value})} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="label-text">Description</label>
                                <textarea className="portal-input" style={{ minHeight: '100px' }} value={currentJob.description} onChange={e => setCurrentJob({...currentJob, description: e.target.value})} required />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button type="submit" disabled={saving} className="action-btn" style={{ flex: 1 }}>{saving ? 'Saving...' : 'Publish'}</button>
                                <button type="button" className="action-btn" style={{ background: '#f5f5f2', color: '#111', borderColor: '#ddd' }} onClick={() => setShowJobModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FounderDashboard;
