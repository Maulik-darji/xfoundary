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
        <div style={{ minHeight: '100vh', backgroundColor: '#f6f6ef', display: 'flex' }}>
            <style>{`
                .glass-sidebar {
                    width: 300px;
                    background-color: rgba(223, 234, 234, 0.8);
                    backdrop-filter: blur(30px);
                    color: #000;
                    border-right: 1px solid rgba(201, 218, 218, 0.5);
                    padding: 2rem 1.5rem;
                    height: 100vh;
                    position: fixed;
                    left: 0;
                    top: 0;
                    display: flex;
                    flex-direction: column;
                    z-index: 50;
                    padding-top: 100px;
                }
                .main-content {
                    flex: 1;
                    margin-left: 300px;
                    padding: 4rem 3rem;
                    padding-top: 120px;
                    min-height: 100vh;
                }
                .sidebar-btn {
                    width: 100%;
                    text-align: left;
                    padding: 14px 18px;
                    border-radius: 14px;
                    border: none;
                    background: transparent;
                    font-size: 15px;
                    font-weight: 600;
                    color: #444;
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 8px;
                }
                .sidebar-btn.active {
                    background: #000;
                    color: #fff;
                    box-shadow: 0 10px 20px rgba(0,0,0,0.1);
                }
                .sidebar-btn:hover:not(.active) {
                    background: rgba(0,0,0,0.05);
                    transform: translateX(4px);
                }
                .dashboard-card {
                    background: #fff;
                    border: 1px solid rgba(0,0,0,0.05);
                    border-radius: 24px;
                    padding: 3.5rem;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.02);
                    width: 100%;
                }
                .form-group { margin-bottom: 2.25rem; }
                .form-label {
                    display: block;
                    font-size: 13px;
                    font-weight: 800;
                    margin-bottom: 0.85rem;
                    color: #000;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .form-input {
                    width: 100%;
                    padding: 16px 20px;
                    border: 1px solid #e5e5e0;
                    border-radius: 14px;
                    font-size: 16px;
                    outline: none;
                    transition: all 0.2s;
                    background: #f9f9f7;
                    color: #000;
                }
                .form-input:focus { 
                    border-color: #000; 
                    background: #fff;
                    box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.03); 
                }
                .save-btn {
                    background: #000;
                    color: #fff;
                    border: none;
                    padding: 16px 32px;
                    border-radius: 14px;
                    font-weight: 700;
                    font-size: 15px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .save-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.15);
                }
                .save-btn:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                    transform: none;
                }
                .profile-header {
                    display: flex;
                    align-items: center;
                    gap: 2rem;
                    margin-bottom: 3.5rem;
                    padding-bottom: 2rem;
                    border-bottom: 1px solid #f0f0ed;
                }
                .avatar-upload {
                    width: 100px;
                    height: 100px;
                    border-radius: 30px;
                    background: #f0f0ed;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                    transition: all 0.3s;
                    border: 2px solid #fff;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.05);
                }
                .avatar-upload:hover .avatar-overlay { opacity: 1; }
                .avatar-upload img { width: 100%; height: 100%; object-fit: cover; }
                .avatar-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0,0,0,0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    opacity: 0;
                    transition: all 0.3s;
                }
            `}</style>

            <aside className="glass-sidebar">
                <div style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '900', margin: 0 }}>Founder Portal</h2>
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manage your startup</p>
                </div>

                <nav style={{ flex: 1 }}>
                    <button 
                        className={`sidebar-btn ${activeTab === 'company' ? 'active' : ''}`}
                        onClick={() => setActiveTab('company')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        Company Profile
                    </button>
                    <button 
                        className={`sidebar-btn ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        Account Settings
                    </button>
                    <button 
                        className={`sidebar-btn ${activeTab === 'jobs' ? 'active' : ''}`}
                        onClick={() => setActiveTab('jobs')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                        Startup Jobs
                    </button>
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <button className="sidebar-btn" onClick={() => navigate('/directory')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        View Directory
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <div className="dashboard-card">
                    {message.text && (
                        <div style={{ 
                            padding: '1rem 1.5rem', 
                            borderRadius: '12px', 
                            backgroundColor: message.type === 'success' ? '#eafaf1' : '#fef1f1',
                            color: message.type === 'success' ? '#27ae60' : '#eb5757',
                            marginBottom: '2.5rem',
                            fontSize: '14px',
                            fontWeight: '600',
                            border: `1px solid ${message.type === 'success' ? '#27ae6022' : '#eb575722'}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            {message.type === 'success' ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            )}
                            {message.text}
                        </div>
                    )}

                    {activeTab === 'company' ? (
                        <>
                            <div style={{ marginBottom: '3.5rem' }}>
                                <h1 style={{ fontSize: '32px', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>Company Profile</h1>
                                <p style={{ color: '#666', marginTop: '8px', fontSize: '16px' }}>Information displayed in the public startup directory</p>
                            </div>

                            <form onSubmit={handleCompanySave}>
                                <div className="form-group">
                                    <label className="form-label">Company Name</label>
                                    <input 
                                        className="form-input"
                                        value={appData.companyName || ''}
                                        onChange={(e) => setAppData({...appData, companyName: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Category / Industry</label>
                                    <select 
                                        className="form-input"
                                        value={appData.category || ''}
                                        onChange={(e) => setAppData({...appData, category: e.target.value})}
                                        required
                                    >
                                        <option value="">Select an industry...</option>
                                        {industryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Location (City, Country)</label>
                                    <input 
                                        className="form-input"
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
                                    <label className="form-label">Website URL</label>
                                    <input 
                                        className="form-input"
                                        value={appData.companyUrl || ''}
                                        onChange={(e) => setAppData({...appData, companyUrl: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Company Twitter/X URL</label>
                                    <input 
                                        className="form-input"
                                        value={appData.socials?.twitter || ''}
                                        onChange={(e) => setAppData({...appData, socials: {...(appData.socials || {}), twitter: e.target.value}})}
                                        placeholder="https://x.com/yourcompany"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">One-line Description</label>
                                    <textarea 
                                        className="form-input"
                                        style={{ minHeight: '100px', resize: 'vertical' }}
                                        value={appData.companyDescription || ''}
                                        onChange={(e) => setAppData({...appData, companyDescription: e.target.value})}
                                        required
                                    />
                                </div>

                                <div style={{ marginTop: '3rem' }}>
                                    <button type="submit" disabled={saving} className="save-btn">
                                        {saving ? 'Updating...' : 'Save Company Info'}
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : activeTab === 'profile' ? (
                        <>
                            <div className="profile-header">
                                <div className="avatar-upload" onClick={() => fileInputRef.current.click()}>
                                    {userData.photoURL ? (
                                        <img src={userData.photoURL} alt="Avatar" />
                                    ) : (
                                        <div style={{ fontSize: '32px', fontWeight: '800', color: '#999' }}>
                                            {userData.profile?.name?.charAt(0).toUpperCase() || 'F'}
                                        </div>
                                    )}
                                    <div className="avatar-overlay">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        style={{ display: 'none' }} 
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                </div>
                                <div>
                                    <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#1a1a1a' }}>Account Settings</h1>
                                    <p style={{ color: '#666', marginTop: '4px' }}>Manage your personal information and security</p>
                                </div>
                            </div>

                            <form onSubmit={handleProfileSave}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Display Name</label>
                                        <input 
                                            className="form-input"
                                            value={userData.profile?.name || ''}
                                            onChange={(e) => setUserData({...userData, profile: {...(userData.profile || {}), name: e.target.value}})}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Username</label>
                                        <input 
                                            className="form-input"
                                            value={userData.username || ''}
                                            onChange={(e) => setUserData({...userData, username: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Email Address</label>
                                    <input 
                                        className="form-input"
                                        type="email"
                                        value={userData.email || ''}
                                        onChange={(e) => setUserData({...userData, email: e.target.value})}
                                        required
                                    />
                                    <p style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>Note: This updates your login email and directory contact info.</p>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Personal LinkedIn URL</label>
                                    <input 
                                        className="form-input"
                                        value={userData.socials?.linkedin || ''}
                                        onChange={(e) => setUserData({...userData, socials: {...(userData.socials || {}), linkedin: e.target.value}})}
                                        placeholder="https://linkedin.com/in/username"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Personal Twitter/X URL</label>
                                    <input 
                                        className="form-input"
                                        value={userData.socials?.twitter || ''}
                                        onChange={(e) => setUserData({...userData, socials: {...(userData.socials || {}), twitter: e.target.value}})}
                                        placeholder="https://x.com/username"
                                    />
                                </div>

                                <div style={{ marginTop: '3rem' }}>
                                    <button type="submit" disabled={saving} className="save-btn">
                                        {saving ? 'Updating...' : 'Save Profile Settings'}
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3.5rem' }}>
                                <div>
                                    <h1 style={{ fontSize: '32px', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>Startup Jobs</h1>
                                    <p style={{ color: '#666', marginTop: '8px', fontSize: '16px' }}>Manage job openings at {appData.companyName}</p>
                                </div>
                                <button className="save-btn" onClick={() => { setEditingJobId(null); setCurrentJob({ role: '', type: 'Full-time', location: '', description: '', link: '' }); setShowJobModal(true); }}>
                                    + Post a Job
                                </button>
                            </div>

                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                {jobs.length > 0 ? jobs.map(job => (
                                    <div key={job.id} style={{ padding: '1.5rem', border: '1px solid #f0f0ed', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>{job.role}</h3>
                                            <div style={{ display: 'flex', gap: '15px', marginTop: '6px', fontSize: '14px', color: '#666' }}>
                                                <span>{job.type}</span>
                                                <span>&bull;</span>
                                                <span>{job.location}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button onClick={() => { setEditingJobId(job.id); setCurrentJob(job); setShowJobModal(true); }} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Edit</button>
                                            <button onClick={() => deleteJob(job.id)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #fee2e2', background: '#fef1f1', color: '#eb5757', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Delete</button>
                                        </div>
                                    </div>
                                )) : (
                                    <div style={{ padding: '4rem', textAlign: 'center', border: '2px dashed #f0f0ed', borderRadius: '24px', color: '#999' }}>
                                        No jobs posted yet. Start hiring by clicking "Post a Job".
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Job Modal */}
            {showJobModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '3rem', width: '600px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', position: 'relative' }}>
                        <h2 style={{ margin: '0 0 2rem 0', fontWeight: '900' }}>{editingJobId ? 'Edit Job Posting' : 'Post a New Job'}</h2>
                        <form onSubmit={handleJobSave}>
                            <div className="form-group">
                                <label className="form-label">Position Role</label>
                                <input className="form-input" value={currentJob.role} onChange={e => setCurrentJob({...currentJob, role: e.target.value})} required placeholder="e.g. Senior Software Engineer" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Job Type</label>
                                    <select className="form-input" value={currentJob.type} onChange={e => setCurrentJob({...currentJob, type: e.target.value})}>
                                        <option>Full-time</option>
                                        <option>Part-time</option>
                                        <option>Contract</option>
                                        <option>Internship</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Location</label>
                                    <input className="form-input" value={currentJob.location} onChange={e => setCurrentJob({...currentJob, location: e.target.value})} required placeholder="e.g. Remote or San Francisco" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Job Description</label>
                                <textarea className="form-input" style={{ minHeight: '120px' }} value={currentJob.description} onChange={e => setCurrentJob({...currentJob, description: e.target.value})} required placeholder="Describe the role, responsibilities, and requirements..." />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Application Link / Email</label>
                                <input className="form-input" value={currentJob.link} onChange={e => setCurrentJob({...currentJob, link: e.target.value})} placeholder="URL to apply or contact email" />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <button type="submit" disabled={saving} className="save-btn" style={{ flex: 1 }}>{saving ? 'Saving...' : 'Publish Job'}</button>
                                <button type="button" className="save-btn" style={{ background: '#f5f5f2', color: '#111' }} onClick={() => setShowJobModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FounderDashboard;
