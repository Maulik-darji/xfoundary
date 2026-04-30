import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const FounderProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [activeSection, setActiveSection] = useState('basics');
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: '',
    phone: '',
    gender: '',
    city: '',
    title: '',
    equity: '',
    technical: '',
    school: '',
    commit: '',
    linkedin: '',
    website: '',
    github: '',
    twitter: '',
    hack: '',
    impressive: '',
    built: '',
    awards: '',
    education: [],
    workHistory: []
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser && !loading) {
        navigate('/login');
      }
      setUser(currentUser);
      
      if (currentUser) {
        try {
            const docRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data().profile || {};
                setFormData(prev => ({ 
                    ...prev, 
                    ...data,
                    email: data.email || currentUser.email,
                    name: data.name || currentUser.displayName || ''
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    email: currentUser.email,
                    name: currentUser.displayName || ''
                }));
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate, loading]);

  useEffect(() => {
    const handleScroll = () => {
        const sections = ['basics', 'role', 'background', 'social', 'accomplishments'];
        const scrollPosition = window.scrollY + 200;

        for (const sectionId of sections) {
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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addItem = (field) => {
    setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], field === 'education' ? { school: '', year: '' } : { company: '', role: '' }]
    }));
  };

  const updateItem = (field, index, key, value) => {
    const newList = [...formData[field]];
    newList[index][key] = value;
    setFormData(prev => ({ ...prev, [field]: newList }));
  };

  const removeItem = (field, index) => {
    setFormData(prev => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSave = async (shouldReturn = false) => {
    if (!user) return;
    setSaving(true);
    try {
        await setDoc(doc(db, 'users', user.uid), {
            profile: formData,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        
        setShowToast(true);
        setTimeout(() => {
            setShowToast(false);
            if (shouldReturn) {
                navigate('/apply-form');
            }
        }, 2000);
    } catch (error) {
        console.error("Error saving profile:", error);
        alert("Error saving profile. Please try again.");
    } finally {
        setSaving(false);
    }
  };

  const getMissingFields = () => {
    const missing = [];
    if (!formData.name) missing.push("Full Name");
    if (!formData.email) missing.push("Email Address");
    if (!formData.phone) missing.push("Phone Number");
    if (!formData.city) missing.push("Current City");
    if (!formData.title) missing.push("Title / Responsibility");
    if (!formData.equity) missing.push("Equity %");
    if (!formData.technical) missing.push("Technical Status (Yes/No)");
    if (!formData.linkedin) missing.push("LinkedIn URL");
    if (formData.education.length === 0) missing.push("At least one Education entry");
    if (formData.workHistory.length === 0) missing.push("At least one Work History entry");
    return missing;
  };

  if (loading) return null;

  const missingFields = getMissingFields();
  const isComplete = missingFields.length === 0;

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    color: '#111',
    fontWeight: 'bold',
    marginBottom: '4px',
    fontFamily: 'Inter, sans-serif'
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'Inter, sans-serif',
    backgroundColor: '#fff',
    outline: 'none',
    transition: 'border-color 0.2s'
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: '100px',
    resize: 'vertical',
    lineHeight: '1.5'
  };

  const starStyle = {
    color: '#ff4d4f',
    marginLeft: '2px'
  };

  const helpTextStyle = {
    fontSize: '13px',
    color: '#666',
    marginTop: '2px',
    lineHeight: '1.4'
  };

  const sectionHeaderStyle = {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
    fontFamily: 'Inter, sans-serif'
  };

  const subsectionStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '2.5rem'
  };

  const navLinkStyle = (id) => ({
    textDecoration: 'none',
    color: activeSection === id ? '#111' : '#999',
    fontWeight: activeSection === id ? 'bold' : 'normal',
    fontSize: '15px',
    display: 'block',
    transition: 'all 0.2s'
  });

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
            <span>{formData.name || user?.email?.split('@')[0]}</span>
            <Link to="/settings" style={{ display: 'flex', alignItems: 'center', color: '#999' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </Link>
          </div>
          <span style={{ color: '#ccc' }}>|</span>
          <Link to="/" onClick={() => auth.signOut()} style={{ textDecoration: 'none', color: '#000', fontWeight: '500', fontStyle: 'italic', fontFamily: 'Newsreader, serif', fontSize: '15px' }}>Log out</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '5rem', padding: '4rem 1.5rem' }}>
        
        {/* Sticky Left Sidebar */}
        <aside style={{ width: '200px', position: 'sticky', top: '100px', height: 'fit-content' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <li><a href="#basics" style={navLinkStyle('basics')}>Basics</a></li>
            <li><a href="#role" style={navLinkStyle('role')}>Role & Responsibilities</a></li>
            <li><a href="#background" style={navLinkStyle('background')}>Background</a></li>
            <li><a href="#social" style={navLinkStyle('social')}>Social Media</a></li>
            <li><a href="#accomplishments" style={navLinkStyle('accomplishments')}>Accomplishments</a></li>
          </ul>
        </aside>

        {/* Main Scrolling Form */}
        <div style={{ flex: 1, maxWidth: '800px' }}>
            <Link to="/apply-form" style={{ display: 'block', color: '#111', textDecoration: 'none', fontSize: '15px', marginBottom: '1.5rem', fontWeight: 500, fontStyle: 'italic', fontFamily: 'Newsreader, serif' }}>
              &lt; Back
            </Link>
            
            <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '3.25rem', fontWeight: 500, fontStyle: 'italic', color: '#111', margin: '0 0 2rem 0', letterSpacing: '-0.02em' }}>Founder Profile</h1>

            {/* Profile Guidance Box */}
            <div style={{ 
              backgroundColor: isComplete ? '#f6ffed' : '#fff2f0', 
              border: `1px solid ${isComplete ? '#b7eb8f' : '#ffccc7'}`, 
              padding: '1.5rem', 
              borderRadius: '8px', 
              marginBottom: '3rem' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                {isComplete ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#52c41a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff4d4f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                )}
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: isComplete ? '#52c41a' : '#ff4d4f' }}>
                  {isComplete ? 'Your profile is complete!' : 'Your profile is incomplete'}
                </h3>
              </div>
              
              {!isComplete && (
                <div>
                  <p style={{ fontSize: '14px', margin: '0 0 0.75rem 0', color: '#666' }}>To complete your profile, please provide the following details:</p>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {missingFields.map(field => (
                      <li key={field} style={{ fontSize: '13px', color: '#ff4d4f', fontWeight: '500' }}>{field}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              
              {/* Basics Section */}
              <section id="basics" style={subsectionStyle}>
                <h2 style={sectionHeaderStyle}>Basics</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 0.4fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={labelStyle}>Name<span style={starStyle}>*</span></label>
                    <input type="text" style={inputStyle} value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="First Last" />
                  </div>
                  <div className="form-group">
                    <label style={labelStyle}>Email<span style={starStyle}>*</span></label>
                    <input type="email" style={inputStyle} value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} placeholder="me@example.com" />
                  </div>
                  <div className="form-group">
                    <label style={labelStyle}>Age</label>
                    <div style={{ position: 'relative' }}>
                        <select style={{ ...inputStyle, appearance: 'none' }} value={formData.age} onChange={(e) => handleInputChange('age', e.target.value)}>
                            <option value="">Select Age</option>
                            {[...Array(83)].map((_, i) => (
                                <option key={i+18} value={i+18}>{i+18}</option>
                            ))}
                        </select>
                        <svg style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#999' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label style={labelStyle}>Phone Number<span style={starStyle}>*</span></label>
                    <PhoneInput
                        country={'in'}
                        value={formData.phone}
                        onChange={(val) => handleInputChange('phone', val)}
                        containerStyle={{ border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff', height: '42px' }}
                        inputStyle={{ width: '100%', height: '40px', border: 'none', fontSize: '14px', fontFamily: 'Inter, sans-serif', backgroundColor: 'transparent', paddingLeft: '58px' }}
                        buttonStyle={{ backgroundColor: '#f9f9f9', border: 'none', borderRight: '1px solid #ddd', borderRadius: '4px 0 0 4px', padding: '0 8px' }}
                        dropdownStyle={{ fontFamily: 'Inter, sans-serif', fontSize: '13px' }}
                    />
                    <p style={helpTextStyle}>We may use this number to call or text you about your application. International numbers will be called with WhatsApp.</p>
                  </div>
                  <div className="form-group">
                    <label style={labelStyle}>Gender</label>
                    <div style={{ position: 'relative' }}>
                        <select style={{ ...inputStyle, appearance: 'none' }} value={formData.gender} onChange={(e) => handleInputChange('gender', e.target.value)}>
                            <option value="">Select Gender</option>
                            <option>Male</option>
                            <option>Female</option>
                            <option>Non-binary</option>
                            <option>Other</option>
                            <option>Prefer not to say</option>
                        </select>
                        <svg style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#999' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label style={labelStyle}>City where you currently live<span style={starStyle}>*</span></label>
                  <div style={{ position: 'relative', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
                    <svg style={{ marginLeft: '12px', color: '#999' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    <input type="text" style={{ ...inputStyle, border: 'none', backgroundColor: 'transparent' }} value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} placeholder="City, State, Country" />
                  </div>
                </div>
              </section>

              {/* Role Section */}
              <section id="role" style={subsectionStyle}>
                <h2 style={sectionHeaderStyle}>Role & Responsibilities</h2>
                <div className="form-group">
                  <label style={labelStyle}>What is your title, or if you haven't set it yet, main responsibility?<span style={starStyle}>*</span></label>
                  <input type="text" style={inputStyle} value={formData.title} onChange={(e) => handleInputChange('title', e.target.value)} />
                </div>
                <div className="form-group">
                  <label style={labelStyle}>What percent equity do you have?<span style={starStyle}>*</span></label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '4px', width: 'fit-content', backgroundColor: '#fff', overflow: 'hidden' }}>
                      <input type="number" style={{ ...inputStyle, border: 'none', width: '80px', padding: '10px' }} value={formData.equity} onChange={(e) => handleInputChange('equity', e.target.value)} placeholder="0" />
                      <span style={{ padding: '10px', borderLeft: '1px solid #ddd', color: '#999', fontSize: '14px', backgroundColor: '#f9f9f9' }}>%</span>
                  </div>
                </div>
                <div className="form-group">
                  <label style={labelStyle}>Are you a technical founder?<span style={starStyle}>*</span></label>
                  <div style={{ display: 'flex', gap: '3rem', marginTop: '0.4rem' }}>
                    <label style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}><input type="radio" checked={formData.technical === 'Yes'} onChange={() => handleInputChange('technical', 'Yes')} style={{ width: '18px', height: '18px', accentColor: '#6300dd' }} /> Yes</label>
                    <label style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}><input type="radio" checked={formData.technical === 'No'} onChange={() => handleInputChange('technical', 'No')} style={{ width: '18px', height: '18px', accentColor: '#6300dd' }} /> No</label>
                  </div>
                </div>
              </section>

              {/* Background Section */}
              <section id="background" style={subsectionStyle}>
                <h2 style={sectionHeaderStyle}>Background</h2>
                <div className="form-group">
                    <label style={labelStyle}>Your LinkedIn URL<span style={starStyle}>*</span></label>
                    <input type="url" style={inputStyle} value={formData.linkedin} onChange={(e) => handleInputChange('linkedin', e.target.value)} />
                </div>
                
                <div className="form-group">
                    <label style={labelStyle}>Education<span style={starStyle}>*</span></label>
                    {formData.education.map((edu, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-end', backgroundColor: '#fff', padding: '1rem', borderRadius: '4px', border: '1px solid #eee' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '12px', color: '#999' }}>School</label>
                                <input type="text" style={inputStyle} value={edu.school} onChange={(e) => updateItem('education', idx, 'school', e.target.value)} />
                            </div>
                            <div style={{ width: '100px' }}>
                                <label style={{ fontSize: '12px', color: '#999' }}>Year</label>
                                <input type="text" style={inputStyle} value={edu.year} onChange={(e) => updateItem('education', idx, 'year', e.target.value)} />
                            </div>
                            <button onClick={() => removeItem('education', idx)} style={{ backgroundColor: 'transparent', border: 'none', color: '#ff4d4f', cursor: 'pointer', padding: '10px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    ))}
                    <button onClick={() => addItem('education')} style={{ width: 'fit-content', background: 'none', border: '1px solid #111', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>+ Add Education</button>
                </div>

                <div className="form-group">
                    <label style={labelStyle}>Work History<span style={starStyle}>*</span></label>
                    {formData.workHistory.map((work, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-end', backgroundColor: '#fff', padding: '1rem', borderRadius: '4px', border: '1px solid #eee' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '12px', color: '#999' }}>Company</label>
                                <input type="text" style={inputStyle} value={work.company} onChange={(e) => updateItem('workHistory', idx, 'company', e.target.value)} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '12px', color: '#999' }}>Role</label>
                                <input type="text" style={inputStyle} value={work.role} onChange={(e) => updateItem('workHistory', idx, 'role', e.target.value)} />
                            </div>
                            <button onClick={() => removeItem('workHistory', idx)} style={{ backgroundColor: 'transparent', border: 'none', color: '#ff4d4f', cursor: 'pointer', padding: '10px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    ))}
                    <button onClick={() => addItem('workHistory')} style={{ width: 'fit-content', background: 'none', border: '1px solid #111', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>+ Add Work History</button>
                </div>
              </section>

              {/* Social Media Section */}
              <section id="social" style={subsectionStyle}>
                <h2 style={sectionHeaderStyle}>Social Media</h2>
                <div className="form-group">
                    <label style={labelStyle}>Personal website</label>
                    <input type="url" style={inputStyle} value={formData.website} onChange={(e) => handleInputChange('website', e.target.value)} placeholder="https://example.com" />
                </div>
                <div className="form-group">
                    <label style={labelStyle}>Github URL</label>
                    <input type="url" style={inputStyle} value={formData.github} onChange={(e) => handleInputChange('github', e.target.value)} placeholder="https://github.com/username" />
                </div>
                <div className="form-group">
                    <label style={labelStyle}>Twitter URL</label>
                    <input type="url" style={inputStyle} value={formData.twitter} onChange={(e) => handleInputChange('twitter', e.target.value)} placeholder="https://x.com/username" />
                </div>
              </section>

              {/* Accomplishments Section */}
              <section id="accomplishments" style={subsectionStyle}>
                <h2 style={sectionHeaderStyle}>Accomplishments</h2>
                <div className="form-group">
                    <label style={labelStyle}>Please tell us about a time you most successfully hacked some (non-computer) system to your advantage.</label>
                    <textarea style={textareaStyle} value={formData.hack} onChange={(e) => handleInputChange('hack', e.target.value)} />
                </div>
                <div className="form-group">
                    <label style={labelStyle}>Please tell us in one or two sentences about the most impressive thing other than this startup that you have built or achieved.</label>
                    <textarea style={textareaStyle} value={formData.impressive} onChange={(e) => handleInputChange('impressive', e.target.value)} />
                </div>
                <div className="form-group">
                    <label style={labelStyle}>Tell us about things you've built before. For example apps you’ve built, websites, open source contributions. Include URLs if possible.</label>
                    <textarea style={textareaStyle} value={formData.built} onChange={(e) => handleInputChange('built', e.target.value)} />
                </div>
                <div className="form-group">
                    <label style={labelStyle}>List any competitions/awards you have won, or papers you’ve published.</label>
                    <textarea style={{ ...textareaStyle, minHeight: '60px' }} value={formData.awards} onChange={(e) => handleInputChange('awards', e.target.value)} />
                </div>
              </section>

              <footer style={{ marginTop: '5rem', padding: '2rem 0', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  {['About', 'People', 'Blog', 'Resources', 'Legal', 'Notice at Collection', 'Contact'].map((link) => (
                      <a key={link} href="#" style={{ color: '#111', textDecoration: 'underline', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>{link}</a>
                  ))}
              </footer>
            </div>
        </div>

        {/* Footer Actions */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#f6f6ef', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'center', gap: '1.25rem', zIndex: 1000, borderTop: '1px solid #ddd' }}>
          <button onClick={() => handleSave(false)} disabled={saving} style={{ backgroundColor: 'white', color: '#111', border: '1px solid #111', padding: '11px 32px', borderRadius: '30px', fontWeight: '600', fontSize: '16px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Newsreader, serif', fontStyle: 'italic', opacity: saving ? 0.7 : 1 }}>{saving ? 'Save changes' : 'Save changes'}</button>
          <button onClick={() => handleSave(true)} disabled={saving} style={{ backgroundColor: 'black', color: 'white', border: 'none', padding: '11px 32px', borderRadius: '30px', fontWeight: '600', fontSize: '16px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Newsreader, serif', fontStyle: 'italic', opacity: saving ? 0.7 : 1 }}>{saving ? 'Save changes' : 'Save & return to application'}</button>
        </div>
        
        {showToast && (
          <div style={{ position: 'fixed', bottom: '110px', right: '40px', backgroundColor: '#fff', border: '1px solid #eee', padding: '12px 20px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 2000, animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Changes saved</span>
            <span onClick={() => setShowToast(false)} style={{ marginLeft: '10px', color: '#ccc', cursor: 'pointer', fontSize: '20px', lineHeight: 0 }}>×</span>
          </div>
        )}

        <style>{`
          @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          aside a:hover { color: #6300dd !important; }
        `}</style>
        <div style={{ height: '180px' }}></div>
      </div>
    </div>
  );
};

export default FounderProfile;
