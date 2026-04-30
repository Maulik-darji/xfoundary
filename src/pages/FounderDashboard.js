import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const FounderDashboard = () => {
    const [user, setUser] = useState(null);
    const [appData, setAppData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

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
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            try {
                if (currentUser) {
                    const adminCheck = await getDoc(doc(db, 'admins', currentUser.uid));
                    if (adminCheck.exists()) {
                        alert("Access Denied: Admin accounts cannot access the Founder Dashboard. Please use your Founder account.");
                        await auth.signOut();
                        navigate('/login');
                        return;
                    }
                    const memberCheck = await getDoc(doc(db, 'members', currentUser.uid));
                    if (memberCheck.exists()) {
                        alert("Access Denied: Member accounts cannot access the Founder Dashboard. Please use your Founder account.");
                        await auth.signOut();
                        navigate('/login');
                        return;
                    }
                    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        if (data.application && data.application.status === 'approved') {
                            setAppData(data.application);
                            setUser(currentUser);
                        } else {
                            navigate('/home');
                        }
                    } else {
                        navigate('/login');
                    }
                } else {
                    navigate('/login');
                }
            } catch (err) {
                console.error(err);
                navigate('/login');
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!user || !appData) return;
        setSaving(true);
        setMessage('');
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                'application.companyName': appData.companyName || '',
                'application.companyDescription': appData.companyDescription || '',
                'application.basedIn': appData.basedIn || '',
                'application.category': appData.category || '',
                'application.companyUrl': appData.companyUrl || ''
            });
            setMessage('Changes saved successfully! Your directory listing has been updated.');
            setTimeout(() => setMessage(''), 5000);
        } catch (error) {
            console.error("Error saving data:", error);
            setMessage('Failed to save changes. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading || !appData) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5ee' }}>
            <div style={{ fontSize: '18px', color: '#6300dd', fontWeight: 600 }}>Loading Dashboard...</div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f5f5ee', padding: '4rem 2rem' }}>
            <style>{`
                .dashboard-card {
                    max-width: 800px;
                    margin: 0 auto;
                    background: #fff;
                    border: 1px solid #e5e5e0;
                    border-radius: 20px;
                    padding: 3rem;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.02);
                }
                .form-group { margin-bottom: 2rem; }
                .form-label {
                    display: block;
                    font-size: 14px;
                    font-weight: 700;
                    margin-bottom: 0.75rem;
                    color: #1a1a1a;
                }
                .form-input {
                    width: 100%;
                    padding: 14px 18px;
                    border: 1px solid #e5e5e0;
                    border-radius: 12px;
                    font-size: 15px;
                    outline: none;
                    transition: all 0.3s;
                    background: #fff;
                }
                .form-input:focus { border-color: #6300dd; box-shadow: 0 0 0 4px rgba(99, 0, 221, 0.05); }
                .save-btn {
                    background: #6300dd;
                    color: #fff;
                    border: none;
                    padding: 14px 32px;
                    border-radius: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .save-btn:hover { background: #5200b8; transform: translateY(-2px); }
                .save-btn:disabled { background: #ccc; cursor: not-allowed; transform: none; }
                .msg-box {
                    padding: 12px 20px;
                    border-radius: 10px;
                    font-size: 14px;
                    font-weight: 600;
                    margin-bottom: 2rem;
                }
                .success { background: #f6ffed; border: 1px solid #b7eb8f; color: #52c41a; }
                .error { background: #fff2f0; border: 1px solid #ffccc7; color: #ff4d4f; }
            `}</style>

            <div className="dashboard-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#1a1a1a' }}>Founder Dashboard</h1>
                        <p style={{ color: '#666', marginTop: '4px' }}>Edit your company's profile in the X Foundary Directory</p>
                    </div>
                    <div style={{ backgroundColor: '#f6ffed', color: '#52c41a', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase' }}>Approved</div>
                </div>

                {message && <div className={`msg-box ${message.includes('success') ? 'success' : 'error'}`}>{message}</div>}

                <form onSubmit={handleSave}>
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
                        <label className="form-label">One-line Description</label>
                        <textarea 
                            className="form-input"
                            style={{ minHeight: '120px', resize: 'vertical' }}
                            value={appData.companyDescription || ''}
                            onChange={(e) => setAppData({...appData, companyDescription: e.target.value})}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '4rem', borderTop: '1px solid #f0f0ed', paddingTop: '2.5rem' }}>
                        <button type="submit" disabled={saving} className="save-btn">
                            {saving ? 'Saving...' : 'Update Directory Profile'}
                        </button>
                        <button type="button" onClick={() => navigate('/directory')} style={{ background: 'none', border: '1px solid #e5e5e0', padding: '14px 24px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>
                            View in Directory
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FounderDashboard;
