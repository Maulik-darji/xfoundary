import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, deleteField, collection, addDoc } from 'firebase/firestore';
import { getBatch } from '../utils/batchUtils';

const ApplyForm = () => {
  const { id } = useParams();
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastConfig, setToastConfig] = useState({ message: '', type: 'success' });
  const [coFounderInvites, setCoFounderInvites] = useState([]);
  const [activeSection, setActiveSection] = useState('basics');
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [isApplicationComplete, setIsApplicationComplete] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Location Suggestion State
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const locationRef = useRef(null);
  const industryRef = useRef(null);
  
  const navigate = useNavigate();

  const emptyFormData = {
    batch: getBatch(),
    companyName: '',
    whatMaking: '',
    companyUrl: '',
    founderName: '',
    founderLinkedIn: '',
    basedIn: '',
    category: '',
    industries: [],
    stage: [],
    whyStarted: '',
    lookingFor: []
  };

  // Refs for scrolling to missing fields
  const fieldRefs = {
    companyName: useRef(null),
    whatMaking: useRef(null),
    companyUrl: useRef(null),
    founderName: useRef(null),
    founderLinkedIn: useRef(null),
    basedIn: useRef(null),
    category: useRef(null),
    stage: useRef(null),
    whyStarted: useRef(null),
    profile: useRef(null)
  };

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

  const locationSuggestions = [
    "Ahmedabad, India", "Bengaluru, India", "Mumbai, India", "Delhi NCR, India", "Hyderabad, India", "Pune, India", "Chennai, India", "Kolkata, India", "Jaipur, India", "Surat, India",
    "San Francisco, USA", "New York, USA", "London, UK", "Singapore", "Berlin, Germany", "Tokyo, Japan", "Remote"
  ];

  // Form State
  const [formData, setFormData] = useState(emptyFormData);

  const checkProfileCompleteness = (profile) => {
    if (!profile) return false;
    const required = [
        profile.name,
        profile.email,
        profile.phone,
        profile.city,
        profile.title,
        profile.equity,
        profile.technical,
        profile.linkedin
    ];
    const hasRequired = required.every(field => field && field.toString().trim().length > 0);
    const hasEdu = profile.education && profile.education.length > 0;
    const hasWork = profile.workHistory && profile.workHistory.length > 0;
    return hasRequired && hasEdu && hasWork;
  };

  const checkApplicationCompleteness = (data) => {
    const required = [
        data.basedIn,
        data.foundersKnown,
        data.technicalWork,
        data.companyName,
        data.companyDescription,
        data.whatMaking,
        data.liveNowLocation,
        data.howFar,
        data.howLongWork,
        data.techStack,
        data.whyIdea,
        data.competitors,
        data.monetization,
        data.category,
        data.founderVideoUrl,
        data.usersRadio,
        data.revenueRadio,
        data.legalEntityRadio,
        data.investmentRadio,
        data.fundraisingRadio,
        data.whyApply,
        data.howHear
    ];
    return required.every(field => field && field.toString().trim().length > 0);
  };

  useEffect(() => {
    setIsApplicationComplete(checkApplicationCompleteness(formData) && isProfileComplete);
    
    // Auto-save to localStorage on change for persistence across refresh
    if (user && initialLoadComplete && !id) {
        localStorage.setItem(`xf_app_draft_${user.uid}`, JSON.stringify(formData));
    }
  }, [formData, isProfileComplete, user, initialLoadComplete, id]);

  useEffect(() => {
    document.title = "Apply to X";
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser && !loading) {
        navigate('/login');
      }
      setUser(currentUser);

      if (currentUser) {
        // Fetch existing application data
        try {
            let initialData = {};

            if (id && id !== 'new') {
                // Fetch from applications collection
                const appRef = doc(db, 'applications', id);
                const appSnap = await getDoc(appRef);
                if (appSnap.exists()) {
                    const data = appSnap.data();
                    // Map application fields back to form data
                    initialData = {
                        ...emptyFormData,
                        ...data,
                        companyName: data.companyName || '',
                        companyDescription: data.companyDescription || '',
                        companyUrl: data.companyUrl || '',
                        founderName: data.founderName || '',
                        founderLinkedIn: data.founderLinkedIn || '',
                        whyStarted: data.whyIdea || data.whyStarted || ''
                    };
                }
            } else if (id === 'new') {
                // Fresh application - everything empty
                initialData = { ...emptyFormData };
                // Also clear any local storage for 'new' context to be safe
                // (Optional: but might be good to ensure it's REALLY fresh)
            } else {
                // Legacy check only if not explicitly 'new'
                const docRef = doc(db, 'users', currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const appData = data.application || {};
                    
                    // If submitted more than 24 hours ago, redirect back to home
                    if (appData.status === 'pending' && appData.submittedAt) {
                        const submittedTime = new Date(appData.submittedAt).getTime();
                        const now = new Date().getTime();
                        const hoursSinceSubmission = (now - submittedTime) / (1000 * 60 * 60);
                        
                        if (hoursSinceSubmission > 24) {
                            navigate('/home');
                            return;
                        }
                    }

                    const localDraft = localStorage.getItem(`xf_app_draft_${currentUser.uid}`);
                    initialData = appData;
                    
                    if (localDraft) {
                        try {
                            const parsedLocal = JSON.parse(localDraft);
                            if (appData.status !== 'pending') {
                                initialData = { ...appData, ...parsedLocal };
                            }
                        } catch (e) {
                            console.error("Error parsing local draft:", e);
                        }
                    }
                    setIsProfileComplete(checkProfileCompleteness(data.profile));
                }
            }

            setFormData(prev => ({ ...prev, ...initialData, batch: initialData.batch || getBatch() }));
        } catch (error) {
            console.error("Error fetching application:", error);
        } finally {
            setInitialLoadComplete(true);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate, loading, id]);

  useEffect(() => {
    const handleScroll = () => {
        const sectionIds = sections.map(s => s.id);
        const scrollPosition = window.scrollY + 200;

        for (const sectionId of sectionIds) {
            const element = document.getElementById(sectionId);
            if (element) {
                const { offsetTop, offsetHeight } = element;
                if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
                    setActiveSection(sectionId);
                    break;
                }
            }
        }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
        if (locationRef.current && !locationRef.current.contains(event.target)) {
            setShowLocationDropdown(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle outside click for industry dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
        if (industryRef.current && !industryRef.current.contains(event.target)) {
            setShowIndustryDropdown(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'basedIn') {
        const filtered = locationSuggestions.filter(loc => 
            loc.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredLocations(filtered);
        setShowLocationDropdown(true);
    }
  };

  const selectLocation = (loc) => {
    setFormData(prev => ({ ...prev, basedIn: loc }));
    setShowLocationDropdown(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
        const applicationData = {
            ...formData,
            founderId: user.uid,
            status: 'draft',
            updatedAt: new Date().toISOString()
        };

        if (id && id !== 'new') {
            await updateDoc(doc(db, 'applications', id), applicationData);
        } else {
            // Check if we should create a new doc or update user doc (keeping it simple: always use applications collection for new ones now)
            const newAppRef = await addDoc(collection(db, 'applications'), applicationData);
            navigate(`/apply-form/${newAppRef.id}`);
        }

        setToastConfig({ message: 'Changes saved', type: 'success' });
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
        console.error("Error saving application:", error);
    } finally {
        setSaving(false);
    }
  };

  const handleReset = async () => {
      if (!user) return;
      setIsResetting(true);
      try {
          if (id && id !== 'new') {
              // Just reset local state for this specific app if it's already in applications coll? 
              // Actually reset should probably just clear fields
              setFormData(emptyFormData);
          } else {
              await updateDoc(doc(db, 'users', user.uid), {
                  application: deleteField()
              });
              localStorage.removeItem(`xf_app_draft_${user.uid}`);
              setFormData(emptyFormData);
          }
          setShowResetModal(false);
          setToastConfig({ message: 'Application has been reset', type: 'reset' });
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
      } catch (error) {
          console.error("Error resetting application:", error);
          alert("Error resetting application. Please try again.");
      } finally {
          setIsResetting(false);
      }
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validation check for scrolling
    if (!isProfileComplete) {
        fieldRefs.profile.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    const compulsory = [
        'basedIn', 'foundersKnown', 'technicalWork', 'companyName', 'companyDescription',
        'whatMaking', 'liveNowLocation', 'howFar', 'howLongWork', 'techStack',
        'usersRadio', 'revenueRadio', 'whyIdea', 'competitors', 'monetization',
        'category', 'founderVideoUrl', 'legalEntityRadio', 'investmentRadio',
        'fundraisingRadio', 'whyApply', 'howHear', 'stage', 'whyStarted'
    ];

    for (const field of compulsory) {
        if (!formData[field] || (typeof formData[field] === 'string' && formData[field].trim().length === 0)) {
            fieldRefs[field]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
    }
    
    setShowSubmitModal(true);
  };

  const confirmSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
        const submissionData = {
            ...formData,
            founderId: user.uid,
            status: 'pending',
            submittedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (id && id !== 'new') {
            await updateDoc(doc(db, 'applications', id), submissionData);
        } else {
            await addDoc(collection(db, 'applications'), submissionData);
        }

        // Also update legacy user doc for profile sync
        await updateDoc(doc(db, 'users', user.uid), {
            'profile.linkedin': formData.founderLinkedIn || '',
            'application.status': 'pending', // Minimal sync
            'application.submittedAt': new Date().toISOString()
        });

        // Clear local draft upon submission
        localStorage.removeItem(`xf_app_draft_${user.uid}`);
        
        setShowSubmitModal(false);
        navigate('/home');
    } catch (error) {
        console.error("Error submitting application:", error);
        alert("Error submitting application. Please try again.");
    } finally {
        setSubmitting(false);
    }
  };

  const sections = [
    { id: 'basics', label: 'Basics' },
    { id: 'founders', label: 'Founders' },
    { id: 'progress', label: 'Progress' }
  ];

  if (loading) return null;

  const labelStyle = {
    display: 'block',
    fontWeight: 'bold',
    marginBottom: '0.4rem',
    fontSize: '14px',
    fontFamily: 'Inter, sans-serif'
  };

  const helpTextStyle = {
    fontSize: '13px',
    color: '#666',
    marginBottom: '10px',
    lineHeight: '1.4'
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #111',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
    backgroundColor: '#fff'
  };

  const textareaStyle = {
    ...inputStyle,
    height: '100px',
    resize: 'vertical'
  };

  const formGroupStyle = {
    marginBottom: '1.5rem'
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
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" style={{ backgroundColor: '#6300dd', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '18px', textDecoration: 'none' }}>X</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
            <span>{user?.displayName || user?.email?.split('@')[0]}</span>
            <Link to="/settings" style={{ display: 'flex', alignItems: 'center', color: '#999' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </Link>
          </div>
          <span style={{ color: '#ccc' }}>|</span>
          <Link to="/" onClick={() => auth.signOut()} style={{ textDecoration: 'none', color: '#000', fontWeight: '500', fontStyle: 'italic', fontFamily: 'Newsreader, serif', fontSize: '15px' }}>Log out</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '4rem', padding: '4rem 1rem' }}>
        
        {/* Sticky Left Sidebar */}
        <aside style={{ width: '200px', position: 'sticky', top: '100px', height: 'fit-content' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sections.map(s => (
                <li key={s.id}>
                    <a 
                      href={`#${s.id}`} 
                      style={{ 
                        textDecoration: 'none', 
                        color: activeSection === s.id ? '#111' : '#999', 
                        fontSize: '15px', 
                        fontWeight: activeSection === s.id ? 'bold' : 'normal', 
                        display: 'block', 
                        fontFamily: 'Inter, sans-serif',
                        transition: 'all 0.2s'
                      }}
                    >{s.label}</a>
                </li>
            ))}
          </ul>
        </aside>

        {/* Main Scrolling Form */}
        <div style={{ flex: 1, maxWidth: '800px' }}>
            <Link to="/home" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#111', textDecoration: 'none', fontSize: '15px', marginBottom: '1.5rem', fontWeight: 500, fontStyle: 'italic', fontFamily: 'Newsreader, serif' }}>
              &lt; Back
            </Link>
            
            <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '3.25rem', fontWeight: 500, fontStyle: 'italic', color: '#111', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>XF Application</h1>
            <p style={{ color: '#999', margin: '0 0 3.5rem 0', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>Founded in Summer 2026</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
                {/* Basics Section */}
                <section id="basics">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', fontFamily: 'Inter, sans-serif' }}>Basics</h2>
                    
                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.companyName}>
                        <label style={labelStyle}>Startup Name*</label>
                        <input type="text" style={inputStyle} value={formData.companyName} onChange={(e) => handleInputChange('companyName', e.target.value)} />
                    </div>

                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.companyDescription}>
                        <label style={labelStyle}>What are you building?*</label>
                        <p style={helpTextStyle}>A one-line description of your startup.</p>
                        <input type="text" style={inputStyle} value={formData.companyDescription} onChange={(e) => handleInputChange('companyDescription', e.target.value)} />
                    </div>

                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.companyUrl}>
                        <label style={labelStyle}>Website/Product Link*</label>
                        <input type="text" style={inputStyle} value={formData.companyUrl} onChange={(e) => handleInputChange('companyUrl', e.target.value)} placeholder="https://..." />
                    </div>

                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.basedIn}>
                        <label style={labelStyle}>Where is your startup based?*</label>
                        <input 
                            type="text" 
                            style={inputStyle} 
                            value={formData.basedIn} 
                            onChange={(e) => handleInputChange('basedIn', e.target.value)}
                            placeholder="City, Country"
                        />
                    </div>

                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.category}>
                        <label style={labelStyle}>Industry*</label>
                        <div style={{ position: 'relative' }}>
                            <select 
                                style={{ ...inputStyle, appearance: 'none' }} 
                                value={formData.category} 
                                onChange={(e) => {
                                    handleInputChange('category', e.target.value);
                                    handleInputChange('industries', []); // Reset sub-industries
                                }}
                            >
                                <option value="">Select Industry</option>
                                {Object.keys(industryHierarchy).map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                        </div>
                    </div>

                    {formData.category && (
                        <div className="form-group" style={formGroupStyle}>
                            <label style={labelStyle}>Sub-industry</label>
                            <div style={{ position: 'relative' }}>
                                <select 
                                    style={{ ...inputStyle, appearance: 'none' }} 
                                    value={formData.industries && formData.industries.length > 0 ? formData.industries[0] : ''} 
                                    onChange={(e) => handleInputChange('industries', [e.target.value])}
                                >
                                    <option value="">Select Sub-industry</option>
                                    {industryHierarchy[formData.category].map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* Founders Section */}
                <section id="founders">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', fontFamily: 'Inter, sans-serif' }}>Founders</h2>
                    
                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.founderName}>
                        <label style={labelStyle}>Founder Name*</label>
                        <input type="text" style={inputStyle} value={formData.founderName} onChange={(e) => handleInputChange('founderName', e.target.value)} />
                    </div>

                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.founderLinkedIn}>
                        <label style={labelStyle}>Founder LinkedIn*</label>
                        <input type="text" style={inputStyle} value={formData.founderLinkedIn} onChange={(e) => handleInputChange('founderLinkedIn', e.target.value)} />
                    </div>

                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.foundersKnown}>
                      <label style={labelStyle}>How long have the founders known one another and how did you meet? Have any of the founders not met in person?</label>
                      <textarea style={textareaStyle} value={formData.foundersKnown} onChange={(e) => handleInputChange('foundersKnown', e.target.value)}></textarea>
                    </div>
                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.technicalWork}>
                      <label style={labelStyle}>Who writes code, or does other technical work on your product? Was any of it done by a non-founder? Please explain.</label>
                      <textarea style={textareaStyle} value={formData.technicalWork} onChange={(e) => handleInputChange('technicalWork', e.target.value)}></textarea>
                    </div>
                    <div className="form-group" style={formGroupStyle}>
                      <label style={labelStyle}>Are you looking for a cofounder?</label>
                      <textarea style={textareaStyle} value={formData.lookingForCofounder} onChange={(e) => handleInputChange('lookingForCofounder', e.target.value)}></textarea>
                    </div>
                </section>

                {/* Company Section */}
                <section id="company">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', fontFamily: 'Inter, sans-serif' }}>Company</h2>
                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.companyName}>
                        <label style={labelStyle}>Company name*</label>
                        <input type="text" style={inputStyle} value={formData.companyName} onChange={(e) => handleInputChange('companyName', e.target.value)} />
                    </div>
                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.companyDescription}>
                        <label style={labelStyle}>Describe what your company does in 50 characters or less.*</label>
                        <input type="text" style={inputStyle} value={formData.companyDescription} onChange={(e) => handleInputChange('companyDescription', e.target.value)} />
                    </div>
                    <div className="form-group" style={formGroupStyle}>
                        <label style={labelStyle}>Company URL, if any</label>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #111', borderRadius: '4px', backgroundColor: '#fff' }}>
                            <span style={{ padding: '10px 12px', borderRight: '1px solid #111', color: '#999', fontSize: '14px', backgroundColor: '#f9f9f9' }}>https://</span>
                            <input type="text" style={{ ...inputStyle, border: 'none' }} value={formData.companyUrl} onChange={(e) => handleInputChange('companyUrl', e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group" style={formGroupStyle}>
                        <label style={labelStyle}>If you have a demo, please provide a link below.</label>
                        <p style={helpTextStyle}>Anything that shows us how the product works. Upload to Drive/YouTube and paste the link.</p>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #111', borderRadius: '4px', backgroundColor: '#fff' }}>
                            <span style={{ padding: '10px 12px', borderRight: '1px solid #111', color: '#999', fontSize: '14px', backgroundColor: '#f9f9f9' }}>URL</span>
                            <input type="url" style={{ ...inputStyle, border: 'none' }} placeholder="https://..." value={formData.demoUrl} onChange={(e) => handleInputChange('demoUrl', e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group" style={formGroupStyle}>
                        <label style={labelStyle}>Please provide a link to the product, if any.</label>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #111', borderRadius: '4px', backgroundColor: '#fff' }}>
                            <span style={{ padding: '10px 12px', borderRight: '1px solid #111', color: '#999', fontSize: '14px', backgroundColor: '#f9f9f9' }}>https://</span>
                            <input type="text" style={{ ...inputStyle, border: 'none' }} value={formData.productUrl} onChange={(e) => handleInputChange('productUrl', e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group" style={formGroupStyle}>
                        <label style={labelStyle}>If login credentials are required for the link above, enter them here.</label>
                        <input type="text" style={inputStyle} placeholder="username / password" value={formData.loginCredentials} onChange={(e) => handleInputChange('loginCredentials', e.target.value)} />
                    </div>
                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.whatMaking}>
                        <label style={labelStyle}>What is your company going to make? Please describe your product and what it does or will do.</label>
                        <textarea style={textareaStyle} value={formData.whatMaking} onChange={(e) => handleInputChange('whatMaking', e.target.value)}></textarea>
                    </div>
                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.liveNowLocation}>
                        <label style={labelStyle}>Where do you live now, and where would the company be based after XF?</label>
                        <p style={helpTextStyle}>Use the format City A, Country A / City B, Country B</p>
                        <input type="text" style={inputStyle} value={formData.liveNowLocation} onChange={(e) => handleInputChange('liveNowLocation', e.target.value)} />
                    </div>
                    <div className="form-group" style={formGroupStyle}>
                        <label style={labelStyle}>Explain your decision regarding location.</label>
                        <textarea style={textareaStyle} value={formData.locationDecision} onChange={(e) => handleInputChange('locationDecision', e.target.value)}></textarea>
                    </div>
                </section>

                {/* Progress Section */}
                <section id="progress">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', fontFamily: 'Inter, sans-serif' }}>Progress</h2>
                    
                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.stage}>
                        <label style={labelStyle}>Current Stage*</label>
                        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                            {['Idea', 'MVP', 'Revenue', 'Scaling'].map(s => (
                                <label key={s} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '10px', 
                                    fontSize: '14px', 
                                    cursor: 'pointer',
                                    fontFamily: 'Inter, sans-serif',
                                    fontWeight: '500'
                                }}>
                                    <input 
                                        type="checkbox" 
                                        checked={Array.isArray(formData.stage) ? formData.stage.includes(s) : formData.stage === s}
                                        onChange={(e) => {
                                            const currentStages = Array.isArray(formData.stage) ? formData.stage : (formData.stage ? [formData.stage] : []);
                                            const newStages = e.target.checked 
                                                ? [...currentStages, s]
                                                : currentStages.filter(stage => stage !== s);
                                            handleInputChange('stage', newStages);
                                        }}
                                        style={{ 
                                            width: '18px', 
                                            height: '18px', 
                                            cursor: 'pointer',
                                            accentColor: '#000'
                                        }}
                                    />
                                    {s}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.howFar}>
                        <label style={labelStyle}>How far along are you?</label>
                        <textarea style={textareaStyle} value={formData.howFar} onChange={(e) => handleInputChange('howFar', e.target.value)}></textarea>
                    </div>
                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.howLongWork}>
                        <label style={labelStyle}>How long have each of you been working on this? How much of that has been full-time? Please explain.</label>
                        <textarea style={textareaStyle} value={formData.howLongWork} onChange={(e) => handleInputChange('howLongWork', e.target.value)}></textarea>
                    </div>
                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.techStack}>
                        <label style={labelStyle}>What tech stack are you using, or planning to use, to build this product? Include AI models and AI coding tools you use.</label>
                        <textarea style={textareaStyle} value={formData.techStack} onChange={(e) => handleInputChange('techStack', e.target.value)}></textarea>
                    </div>
                    <div className="form-group" style={formGroupStyle}>
                        <label style={labelStyle}>Optional: attach a coding agent session you're particularly proud of.</label>
                        <p style={helpTextStyle}>This is an experimental question for the Summer 2026 batch to give people a chance to show off their skills with AI coding tools.</p>
                        <p style={helpTextStyle}>Many coding agents (e.g. Claude Code, Cursor, etc) have a /export command, or otherwise include a button allowing you to export a transcript. Can be text or markdown.</p>
                        <p style={helpTextStyle}>Learn more about this question <span style={{ color: '#6300dd', textDecoration: 'underline', cursor: 'pointer' }}>here</span>.</p>
                        <div style={{ border: '2px dashed #111', borderRadius: '4px', padding: '2.5rem', textAlign: 'center', backgroundColor: '#fff', cursor: 'pointer' }}>
                            <p style={{ fontSize: '14px', color: '#111', fontWeight: 500 }}>Click or drag to upload a .md or .txt file</p>
                            <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Maximum file size: 25MB</p>
                        </div>
                    </div>
                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.usersRadio}>
                        <label style={labelStyle}>Are people using your product?</label>
                        <div style={{ display: 'flex', gap: '3rem', marginTop: '0.4rem' }}>
                            <label style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}><input type="radio" name="users" checked={formData.usersRadio === 'Yes'} onChange={() => handleInputChange('usersRadio', 'Yes')} style={{ width: '18px', height: '18px', accentColor: '#6300dd' }} /> Yes</label>
                            <label style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}><input type="radio" name="users" checked={formData.usersRadio === 'No'} onChange={() => handleInputChange('usersRadio', 'No')} style={{ width: '18px', height: '18px', accentColor: '#6300dd' }} /> No</label>
                        </div>
                    </div>
                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.revenueRadio}>
                        <label style={labelStyle}>Do you have revenue?</label>
                        <div style={{ display: 'flex', gap: '3rem', marginTop: '0.4rem' }}>
                            <label style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}><input type="radio" name="revenue" checked={formData.revenueRadio === 'Yes'} onChange={() => handleInputChange('revenueRadio', 'Yes')} style={{ width: '18px', height: '18px', accentColor: '#6300dd' }} /> Yes</label>
                            <label style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}><input type="radio" name="revenue" checked={formData.revenueRadio === 'No'} onChange={() => handleInputChange('revenueRadio', 'No')} style={{ width: '18px', height: '18px', accentColor: '#6300dd' }} /> No</label>
                        </div>
                    </div>
                    <div className="form-group" style={formGroupStyle}>
                        <label style={labelStyle}>If you are applying with the same idea as a previous cohort, did anything change? If you applied with a different idea, why did you pivot and what did you learn from the last idea?</label>
                        <textarea style={textareaStyle} value={formData.pivotExplanation} onChange={(e) => handleInputChange('pivotExplanation', e.target.value)}></textarea>
                    </div>
                    <div className="form-group" style={formGroupStyle}>
                        <label style={labelStyle}>If you have already participated or committed to participate in an incubator, "accelerator" or "pre-accelerator" program, please tell us about it.</label>
                        <textarea style={textareaStyle} value={formData.incubatorExplanation} onChange={(e) => handleInputChange('incubatorExplanation', e.target.value)}></textarea>
                    </div>
                </section>

                {/* Idea Section */}
                <section id="idea">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', fontFamily: 'Inter, sans-serif' }}>Idea</h2>
                    
                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.whyStarted}>
                        <label style={labelStyle}>Why did you start this startup?*</label>
                        <textarea style={textareaStyle} value={formData.whyStarted} onChange={(e) => handleInputChange('whyStarted', e.target.value)}></textarea>
                    </div>

                    <div className="form-group" style={formGroupStyle}>
                        <label style={labelStyle}>What are you currently looking for?</label>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                            {['Users', 'Investors', 'Hiring', 'Co-founders', 'Partnerships'].map(tag => (
                                <span 
                                    key={tag}
                                    onClick={() => {
                                        const newLooking = (formData.lookingFor || []).includes(tag)
                                            ? formData.lookingFor.filter(t => t !== tag)
                                            : [...(formData.lookingFor || []), tag];
                                        handleInputChange('lookingFor', newLooking);
                                    }}
                                    style={{ 
                                        padding: '6px 16px', 
                                        borderRadius: '20px', 
                                        border: '1px solid #111', 
                                        fontSize: '13px', 
                                        cursor: 'pointer',
                                        backgroundColor: (formData.lookingFor || []).includes(tag) ? '#111' : 'transparent',
                                        color: (formData.lookingFor || []).includes(tag) ? 'white' : '#111',
                                        fontWeight: 'bold',
                                        transition: 'all 0.2s'
                                    }}
                                >{tag}</span>
                            ))}
                        </div>
                    </div>

                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.whyIdea}>
                        <label style={labelStyle}>Why did you pick this idea to work on? Do you have domain expertise in this area? How do you know people need what you're making?</label>
                        <textarea style={textareaStyle} value={formData.whyIdea} onChange={(e) => handleInputChange('whyIdea', e.target.value)}></textarea>
                    </div>
                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.competitors}>
                        <label style={labelStyle}>Who are your competitors? What do you understand about your business that they don't?</label>
                        <textarea style={textareaStyle} value={formData.competitors} onChange={(e) => handleInputChange('competitors', e.target.value)}></textarea>
                    </div>
                    <div className="form-group" style={formGroupStyle} ref={fieldRefs.monetization}>
                        <label style={labelStyle}>How do or will you make money? How much could you make?</label>
                        <p style={helpTextStyle}>(We realize you can't know precisely, but give your best estimate)</p>
                        <textarea style={textareaStyle} value={formData.monetization} onChange={(e) => handleInputChange('monetization', e.target.value)}></textarea>
                    </div>
                    <div className="form-group" style={formGroupStyle}>
                        <label style={labelStyle}>If you had any other ideas you considered applying with, please list them.</label>
                        <p style={helpTextStyle}>One may be something we've been waiting for. Often when we fund people it's to do something they list here and not in the main application.</p>
                        <textarea style={textareaStyle} value={formData.otherIdeas} onChange={(e) => handleInputChange('otherIdeas', e.target.value)}></textarea>
                    </div>
                </section>

                {/* Founder Video Section */}
                <section id="video">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', fontFamily: 'Inter, sans-serif' }}>Founder Video</h2>
                    <label style={labelStyle}>Please provide a link to a one minute video introducing the founder(s).*</label>
                    <p style={helpTextStyle}>Upload your video to Google Drive or YouTube and paste the link below. Make sure the link is accessible.</p>
                    <div ref={fieldRefs.founderVideoUrl} style={{ display: 'flex', alignItems: 'center', border: '1px solid #111', borderRadius: '4px', backgroundColor: '#fff', marginBottom: '1.5rem' }}>
                        <span style={{ padding: '10px 12px', borderRight: '1px solid #111', color: '#999', fontSize: '14px', backgroundColor: '#f9f9f9' }}>URL</span>
                        <input type="url" style={{ ...inputStyle, border: 'none' }} placeholder="https://youtube.com/... or https://drive.google.com/..." value={formData.founderVideoUrl} onChange={(e) => handleInputChange('founderVideoUrl', e.target.value)} />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                            {['Users', 'Investors', 'Hiring', 'Co-founders', 'Partnerships'].map(option => (
                                <label key={option} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '10px', 
                                    cursor: 'pointer',
                                    padding: '12px 16px',
                                    border: '1px solid #eee',
                                    borderRadius: '8px',
                                    backgroundColor: formData.lookingFor.includes(option) ? '#f5f5f5' : 'white',
                                    transition: 'all 0.2s'
                                }}>
                                    <input 
                                        type="checkbox" 
                                        checked={formData.lookingFor.includes(option)}
                                        onChange={(e) => {
                                            const newLooking = e.target.checked 
                                                ? [...formData.lookingFor, option]
                                                : formData.lookingFor.filter(s => s !== option);
                                            handleInputChange('lookingFor', newLooking);
                                        }}
                                        style={{ accentColor: '#000' }}
                                    />
                                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{option}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Quick Links Footer */}
                <footer style={{ marginTop: '5rem', padding: '2rem 0', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    {['About', 'People', 'Blog', 'Resources', 'Legal', 'Notice at Collection', 'Contact'].map((link) => (
                        <a key={link} href="#" style={{ color: '#111', textDecoration: 'underline', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>{link}</a>
                    ))}
                </footer>
            </div>
        </div>

        {/* Footer Actions */}
        <div style={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            backgroundColor: '#f6f6ef', 
            padding: '1.5rem 2rem', 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '1.25rem',
            zIndex: 1000,
            borderTop: '1px solid #ddd'
        }}>
          <button onClick={() => setShowResetModal(true)} disabled={saving || submitting} style={{ backgroundColor: 'transparent', color: '#ff4d4f', border: '1px solid #ff4d4f', padding: '11px 32px', borderRadius: '30px', fontWeight: '600', fontSize: '16px', cursor: (saving || submitting) ? 'not-allowed' : 'pointer', fontFamily: 'Newsreader, serif', fontStyle: 'italic', opacity: (saving || submitting) ? 0.7 : 1 }}>Reset</button>
          
          <button onClick={handleSave} disabled={saving || submitting} style={{ backgroundColor: 'white', color: '#111', border: '1px solid #111', padding: '11px 32px', borderRadius: '30px', fontWeight: '600', fontSize: '16px', cursor: (saving || submitting) ? 'not-allowed' : 'pointer', fontFamily: 'Newsreader, serif', fontStyle: 'italic', opacity: (saving || submitting) ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Save changes'}</button>
          
          <button 
            onClick={handleSubmit} 
            disabled={submitting || saving} 
            style={{ 
                backgroundColor: isApplicationComplete ? '#000' : 'rgba(0,0,0,0.2)', 
                color: isApplicationComplete ? 'white' : '#777', 
                border: 'none', 
                padding: '11px 40px', 
                borderRadius: '30px', 
                fontWeight: '600', 
                fontSize: '17px', 
                cursor: (submitting || saving) ? 'not-allowed' : 'pointer', 
                fontFamily: 'Newsreader, serif', 
                fontStyle: 'italic',
                transition: 'all 0.3s ease'
            }}>
            {submitting ? 'Submitting...' : 'Submit application'}
          </button>
        </div>
        
        {/* Reset Confirmation Modal */}
        {showResetModal && (
            <div style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                backgroundColor: 'rgba(0,0,0,0.5)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                zIndex: 2000,
                backdropFilter: 'blur(4px)'
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
                    animation: 'modalShow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    position: 'relative',
                    zIndex: 2001
                }}>
                    <div style={{ backgroundColor: '#fff1f0', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ff4d4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111' }}>Reset Application?</h2>
                    <p style={{ color: '#666', fontSize: '15px', lineHeight: '1.6', marginBottom: '2rem' }}>
                        This will remove all entered details and start a fresh application. This action cannot be undone.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button 
                            onClick={() => setShowResetModal(false)}
                            disabled={isResetting}
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
                            onClick={handleReset}
                            disabled={isResetting}
                            style={{ 
                                backgroundColor: '#ff4d4f', 
                                color: 'white', 
                                border: 'none', 
                                padding: '12px 24px', 
                                borderRadius: '30px', 
                                fontWeight: 'bold', 
                                fontSize: '15px', 
                                cursor: isResetting ? 'not-allowed' : 'pointer',
                                flex: 1,
                                opacity: isResetting ? 0.7 : 1,
                                transition: 'all 0.2s',
                                fontFamily: 'Inter, sans-serif'
                            }}>
                            {isResetting ? 'Resetting...' : 'Yes, Reset'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Submission Confirmation Modal */}
        {showSubmitModal && (
            <div style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                backgroundColor: 'rgba(0,0,0,0.5)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                zIndex: 2000,
                backdropFilter: 'blur(4px)'
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
                    animation: 'modalShow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    position: 'relative',
                    zIndex: 2001
                }}>
                    <div style={{ backgroundColor: '#f0f0ff', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#6300dd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111' }}>Submit Application?</h2>
                    <p style={{ color: '#666', fontSize: '15px', lineHeight: '1.6', marginBottom: '2rem' }}>
                        Are you sure you want to submit? You will still be able to edit your application for the next 24 hours.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button 
                            onClick={() => setShowSubmitModal(false)}
                            disabled={submitting}
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
                            onClick={confirmSubmit}
                            disabled={submitting}
                            style={{ 
                                backgroundColor: '#6300dd', 
                                color: 'white', 
                                border: 'none', 
                                padding: '12px 24px', 
                                borderRadius: '30px', 
                                fontWeight: 'bold', 
                                fontSize: '15px', 
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                flex: 1,
                                opacity: submitting ? 0.7 : 1,
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 12px rgba(99, 0, 221, 0.2)',
                                fontFamily: 'Inter, sans-serif'
                            }}>
                            {submitting ? 'Submitting...' : 'Yes, Submit'}
                        </button>
                    </div>
                </div>
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
            zIndex: 4000,
            animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            borderLeft: toastConfig.type === 'reset' ? '6px solid #ff4d4f' : '6px solid #4caf50',
            minWidth: '280px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {toastConfig.type === 'reset' ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff4d4f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="16 12 12 8 8 12"></polyline><line x1="12" y1="16" x2="12" y2="8"></line></svg>
                )}
            </div>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a', flex: 1 }}>{toastConfig.message}</span>
            <div 
                onClick={() => setShowToast(false)} 
                style={{ 
                    cursor: 'pointer', 
                    color: '#ccc', 
                    fontSize: '18px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '4px',
                    marginLeft: '8px',
                    transition: 'color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#999'}
                onMouseLeave={e => e.currentTarget.style.color = '#ccc'}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </div>
          </div>
        )}
        
        <div style={{ height: '150px' }}></div>
      </div>
      <style>{`
          @keyframes slideUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes modalShow {
            0% { transform: scale(0.9); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
      `}</style>
    </div>
  );
};

export default ApplyForm;
