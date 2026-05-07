import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, addDoc, collection, updateDoc } from 'firebase/firestore';
import { getBatch } from '../utils/batchUtils';

const StartupRegistration = () => {
    const { id } = useParams(); // For editing existing application
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const navigate = useNavigate();

    const industryHierarchy = {
        'B2B': ['Analytics', 'Engineering, Product and Design', 'Finance and Accounting', 'Human Resources', 'Infrastructure', 'Legal', 'Marketing', 'Office Management', 'Operations', 'Productivity', 'Recruiting and Talent', 'Retail', 'Sales', 'Security', 'Supply Chain and Logistics'],
        'Consumer': ['Apparel and Cosmetics', 'Consumer Electronics', 'Content', 'Food and Beverage', 'Gaming', 'Home and Personal', 'Job and Career Services', 'Social', 'Transportation Services', 'Travel, Leisure and Tourism', 'Virtual and Augmented Reality', 'Social Media', 'Quick Commerce', 'Spiritual Tech', 'Social Commerce'],
        'Fintech': ['Asset Management', 'Banking and Exchange', 'Consumer Finance', 'Credit and Lending', 'Insurance', 'Payments', 'Savings', 'Banking'],
        'Healthcare': ['Consumer Health and Wellness', 'Diagnostics', 'Drug Discovery and Delivery', 'Healthcare IT', 'Healthcare Services', 'Industrial Bio', 'Medical Devices', 'Therapeutics'],
        'Industrials': ['Agriculture', 'Automotive', 'Aviation and Space', 'Climate', 'Defense', 'Drones', 'Energy', 'Manufacturing and Robotics', 'Aerospace', 'EV', 'Energy Storage'],
        'Real Estate and Construction': ['Construction', 'Housing and Real Estate'],
        'AI': ['Generative AI', 'Deep Tech', 'Foundational Models', 'Retail Tech', 'Conversational AI'],
        'SaaS': ['Developer Tools', 'CRM', 'Billing', 'Software Testing', 'Productivity']
    };

    const stages = ['Idea', 'MVP', 'Revenue', 'Scaling'];
    const lookingForOptions = ['Users', 'Investors', 'Hiring', 'Co-founders', 'Partnerships'];

    const [formData, setFormData] = useState({
        startupName: '',
        description: '',
        website: '',
        founderName: '',
        founderLinkedIn: '',
        basedIn: '',
        industries: [],
        stage: '',
        whyStarted: '',
        lookingFor: []
    });

    const [expandedIndustries, setExpandedIndustries] = useState([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    // 1. Fetch founder profile info
                    const userRef = doc(db, 'users', currentUser.uid);
                    const userSnap = await getDoc(userRef);
                    let profileInfo = {};
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        profileInfo = {
                            founderName: currentUser.displayName || userData.profile?.name || '',
                            founderLinkedIn: userData.profile?.linkedin || ''
                        };
                    }

                    // 2. If editing, fetch application data
                    if (id) {
                        const appRef = doc(db, 'applications', id);
                        const appSnap = await getDoc(appRef);
                        if (appSnap.exists()) {
                            const app = appSnap.data();
                            setFormData({
                                startupName: app.companyName || '',
                                description: app.companyDescription || '',
                                website: app.companyUrl || '',
                                founderName: app.founderName || profileInfo.founderName,
                                founderLinkedIn: app.founderLinkedIn || profileInfo.founderLinkedIn,
                                basedIn: app.basedIn || '',
                                industries: app.industries || [],
                                stage: app.stage || '',
                                whyStarted: app.whyIdea || '',
                                lookingFor: app.lookingFor || []
                            });
                        }
                    } else {
                        // Pre-fill profile info for new application
                        setFormData(prev => ({ ...prev, ...profileInfo }));
                    }
                } catch (error) {
                    console.error("Error fetching data:", error);
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [id]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleIndustry = (industry) => {
        setFormData(prev => {
            const industries = [...prev.industries];
            if (industries.includes(industry)) {
                return { ...prev, industries: industries.filter(i => i !== industry) };
            } else {
                return { ...prev, industries: [...industries, industry] };
            }
        });
    };

    const toggleLookingFor = (option) => {
        setFormData(prev => {
            const lookingFor = [...prev.lookingFor];
            if (lookingFor.includes(option)) {
                return { ...prev, lookingFor: lookingFor.filter(o => o !== option) };
            } else {
                return { ...prev, lookingFor: [...lookingFor, option] };
            }
        });
    };

    const toggleExpansion = (mainInd) => {
        setExpandedIndustries(prev => 
            prev.includes(mainInd) ? prev.filter(i => i !== mainInd) : [...prev, mainInd]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;
        setSubmitting(true);

        try {
            const applicationData = {
                founderId: user.uid,
                founderName: formData.founderName,
                founderLinkedIn: formData.founderLinkedIn,
                companyName: formData.startupName,
                companyDescription: formData.description,
                companyUrl: formData.website,
                basedIn: formData.basedIn,
                industries: formData.industries,
                stage: formData.stage,
                whyIdea: formData.whyStarted,
                lookingFor: formData.lookingFor,
                batch: getBatch(),
                status: 'pending',
                submittedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (id) {
                // Update existing
                await updateDoc(doc(db, 'applications', id), applicationData);
            } else {
                // Create new
                await addDoc(collection(db, 'applications'), applicationData);
            }

            // Also update basic user profile for consistency
            await updateDoc(doc(db, 'users', user.uid), {
                'profile.linkedin': formData.founderLinkedIn,
                updatedAt: new Date().toISOString()
            });

            setToastMessage('Application submitted successfully!');
            setShowToast(true);
            setTimeout(() => {
                setShowToast(false);
                navigate('/home');
            }, 2000);
        } catch (error) {
            console.error("Error submitting:", error);
            setToastMessage('Error submitting application.');
            setShowToast(true);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8f9fa' }}>Loading...</div>;

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: 'linear-gradient(135deg, #fdfcfb 0%, #e2d1c3 100%)',
            fontFamily: "'Outfit', sans-serif",
            padding: '4rem 1rem',
            color: '#1a1a1a'
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Newsreader:ital,opsz,wght@1,6..72,400;1,6..72,500&display=swap');
                
                .back-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    color: #666;
                    text-decoration: none;
                    font-size: 14px;
                    font-weight: 600;
                    margin-bottom: 2rem;
                    transition: color 0.2s;
                }

                .back-btn:hover {
                    color: #000;
                }

                .form-container {
                    max-width: 800px;
                    margin: 0 auto;
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 32px;
                    padding: 3rem;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.05);
                }

                .input-group {
                    margin-bottom: 2rem;
                }

                .label {
                    display: block;
                    font-size: 14px;
                    font-weight: 600;
                    margin-bottom: 0.75rem;
                    color: #444;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .input-field {
                    width: 100%;
                    padding: 1rem 1.25rem;
                    background: rgba(255, 255, 255, 0.9);
                    border: 1.5px solid rgba(0,0,0,0.05);
                    border-radius: 16px;
                    font-size: 16px;
                    transition: all 0.3s;
                    outline: none;
                    box-sizing: border-box;
                }

                .input-field:focus {
                    border-color: #6300dd;
                    box-shadow: 0 0 0 4px rgba(99, 0, 221, 0.1);
                    transform: translateY(-2px);
                }

                .industry-section {
                    background: rgba(255, 255, 255, 0.5);
                    border-radius: 20px;
                    padding: 1.5rem;
                    border: 1px solid rgba(0,0,0,0.03);
                }

                .industry-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 0;
                    cursor: pointer;
                    user-select: none;
                }

                .checkbox {
                    width: 20px;
                    height: 20px;
                    border: 2px solid #ccc;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }

                .checkbox.active {
                    background: #6300dd;
                    border-color: #6300dd;
                }

                .stage-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 1rem;
                }

                .stage-card {
                    padding: 1rem;
                    text-align: center;
                    background: #fff;
                    border: 1.5px solid rgba(0,0,0,0.05);
                    border-radius: 16px;
                    cursor: pointer;
                    transition: all 0.3s;
                    font-weight: 500;
                }

                .stage-card.active {
                    background: #6300dd;
                    color: #fff;
                    border-color: #6300dd;
                    transform: scale(1.05);
                    box-shadow: 0 10px 20px rgba(99, 0, 221, 0.2);
                }

                .looking-grid {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.75rem;
                }

                .looking-tag {
                    padding: 0.6rem 1.25rem;
                    background: #fff;
                    border: 1.5px solid rgba(0,0,0,0.05);
                    border-radius: 30px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 14px;
                    font-weight: 500;
                }

                .looking-tag.active {
                    background: #111;
                    color: #fff;
                    border-color: #111;
                }

                .submit-btn {
                    width: 100%;
                    padding: 1.25rem;
                    background: #000;
                    color: #fff;
                    border: none;
                    border-radius: 16px;
                    font-size: 18px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                    margin-top: 2rem;
                }

                .submit-btn:hover {
                    background: #333;
                    transform: translateY(-2px);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
                }

                .submit-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .toast {
                    position: fixed;
                    bottom: 2rem;
                    right: 2rem;
                    background: #000;
                    color: #fff;
                    padding: 1rem 2rem;
                    border-radius: 12px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    z-index: 1000;
                    animation: slideIn 0.3s ease-out;
                }

                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>

            <div className="form-container">
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '3rem', fontStyle: 'italic', fontWeight: 500, margin: '0 0 1rem 0' }}>Register your Startup</h1>
                    <p style={{ color: '#666', fontSize: '1.1rem' }}>Tell us about what you're building.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="label">Startup Name*</label>
                        <input 
                            className="input-field" 
                            name="startupName" 
                            value={formData.startupName} 
                            onChange={handleInputChange} 
                            placeholder="e.g. Sarvam AI" 
                            required 
                        />
                    </div>

                    <div className="input-group">
                        <label className="label">What are you building?* (One-line description)</label>
                        <input 
                            className="input-field" 
                            name="description" 
                            value={formData.description} 
                            onChange={handleInputChange} 
                            placeholder="Building full-stack AI systems for India..." 
                            required 
                        />
                    </div>

                    <div className="input-group">
                        <label className="label">Website/Product Link*</label>
                        <input 
                            className="input-field" 
                            name="website" 
                            type="url"
                            value={formData.website} 
                            onChange={handleInputChange} 
                            placeholder="https://sarvam.ai" 
                            required 
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div className="input-group">
                            <label className="label">Founder Name*</label>
                            <input 
                                className="input-field" 
                                name="founderName" 
                                value={formData.founderName} 
                                onChange={handleInputChange} 
                                placeholder="Your Name" 
                                required 
                            />
                        </div>
                        <div className="input-group">
                            <label className="label">Founder LinkedIn*</label>
                            <input 
                                className="input-field" 
                                name="founderLinkedIn" 
                                value={formData.founderLinkedIn} 
                                onChange={handleInputChange} 
                                placeholder="linkedin.com/in/..." 
                                required 
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="label">Where is your startup based?*</label>
                        <input 
                            className="input-field" 
                            name="basedIn" 
                            value={formData.basedIn} 
                            onChange={handleInputChange} 
                            placeholder="e.g. Bengaluru, India" 
                            required 
                        />
                    </div>

                    <div className="input-group">
                        <label className="label">Industry & Subindustries*</label>
                        <div className="industry-section">
                            {Object.keys(industryHierarchy).map(mainInd => (
                                <div key={mainInd} style={{ marginBottom: '10px' }}>
                                    <div 
                                        className="industry-item" 
                                        onClick={() => toggleExpansion(mainInd)}
                                    >
                                        <div 
                                            className={`checkbox ${formData.industries.includes(mainInd) ? 'active' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); toggleIndustry(mainInd); }}
                                        >
                                            {formData.industries.includes(mainInd) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                        </div>
                                        <span style={{ fontSize: '15px', fontWeight: 600, color: expandedIndustries.includes(mainInd) ? '#6300dd' : '#1a1a1a', flex: 1 }}>{mainInd}</span>
                                        <svg 
                                            style={{ transition: '0.3s', transform: expandedIndustries.includes(mainInd) ? 'rotate(180deg)' : 'none' }} 
                                            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                        >
                                            <polyline points="6 9 12 15 18 9"></polyline>
                                        </svg>
                                    </div>
                                    {expandedIndustries.includes(mainInd) && (
                                        <div style={{ marginLeft: '32px', borderLeft: '1px solid rgba(0,0,0,0.05)', paddingLeft: '16px' }}>
                                            {industryHierarchy[mainInd].map(subInd => (
                                                <div key={subInd} className="industry-item" onClick={() => toggleIndustry(subInd)}>
                                                    <div className={`checkbox ${formData.industries.includes(subInd) ? 'active' : ''}`}>
                                                        {formData.industries.includes(subInd) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                                    </div>
                                                    <span style={{ fontSize: '14px', color: '#666' }}>{subInd}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="label">Current Stage*</label>
                        <div className="stage-grid">
                            {stages.map(stage => (
                                <div 
                                    key={stage} 
                                    className={`stage-card ${formData.stage === stage ? 'active' : ''}`}
                                    onClick={() => setFormData(prev => ({ ...prev, stage }))}
                                >
                                    {stage}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="label">Why did you start this startup?* (Short answer)</label>
                        <textarea 
                            className="input-field" 
                            name="whyStarted" 
                            value={formData.whyStarted} 
                            onChange={handleInputChange} 
                            placeholder="Share your inspiration..." 
                            style={{ height: '120px', resize: 'vertical' }}
                            required 
                        />
                    </div>

                    <div className="input-group">
                        <label className="label">What are you currently looking for?</label>
                        <div className="looking-grid">
                            {lookingForOptions.map(option => (
                                <div 
                                    key={option} 
                                    className={`looking-tag ${formData.lookingFor.includes(option) ? 'active' : ''}`}
                                    onClick={() => toggleLookingFor(option)}
                                >
                                    {option}
                                </div>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="submit-btn" disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Submit Registration'}
                    </button>
                </form>
            </div>

            {showToast && (
                <div className="toast">
                    {toastMessage}
                </div>
            )}
        </div>
    );
};

export default StartupRegistration;
