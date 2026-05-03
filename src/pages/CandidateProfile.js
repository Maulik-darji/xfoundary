import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';

const CandidateProfile = () => {
    const [user] = useAuthState(auth);
    const [activeStep, setActiveStep] = useState('Personal Info');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Form States
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', linkedin: '', phone: '', countryCode: 'India (+91)',
        jobStatus: 'open', xfCompany: 'no', hideFrom: '',
        city: '', authUS: 'no', visa: 'yes', remote: 'open', relocate: 'yes', relocateTo: [],
        roleFunction: 'Engineering', github: '', student: 'yes', school: '', gradMonth: 'June', gradYear: '2027', roleType: 'fulltime',
        workHistory: [{ id: 1, employer: '', title: '', location: '', fromMonth: 'Month', fromYear: 'Year', toMonth: 'Month', toYear: 'Year', current: false, summary: '' }],
        education: [{ id: 1, school: '', major: '', degree: '', fromMonth: 'Month', fromYear: 'Year', toMonth: 'Month', toYear: 'Year', summary: '' }],
        skills: [
            { name: 'Python', level: 'intermediate' },
            { name: 'Java', level: 'intermediate' },
            { name: 'JavaScript', level: 'intermediate' },
            { name: 'MS SQL', level: 'beginner' }
        ],
        sizePrefs: { seed: 'preferred', small: 'preferred', medium: 'preferred', large: 'preferred' },
        equityPref: 'interested',
        salaryPref: 'minimum',
        minSalary: '21,000',
        shortPhrase: '',
        nextRole: '',
        proudProject: ''
    });

    const steps = ['Personal Info', 'Location', 'Role', 'Experience', 'Skills', 'Career', 'Share'];

    useEffect(() => {
        if (user) {
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            const docRef = doc(db, 'candidates', user.uid);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                setFormData(prev => ({ ...prev, ...snap.data(), email: user.email }));
            } else {
                setFormData(prev => ({ ...prev, firstName: user.displayName?.split(' ')[0] || '', lastName: user.displayName?.split(' ')[1] || '', email: user.email }));
            }
        } catch (err) {
            console.error("Error fetching profile:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (nextStep = null) => {
        try {
            await setDoc(doc(db, 'candidates', user.uid), formData, { merge: true });
            if (nextStep) setActiveStep(nextStep);
            else alert('Profile saved!');
        } catch (err) {
            alert('Error saving profile');
        }
    };

    const renderPersonalInfo = () => (
        <div style={{ maxWidth: '800px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '2rem' }}>Personal Info</h1>
            <p style={{ fontSize: '15px', color: '#666', marginBottom: '2rem', lineHeight: '1.6' }}>
                Connect with over one thousand XF startup founders with a single profile. Founders can reach you via email or through the platform. (And we'll send you notifications.)
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                    <label style={labelStyle}>First Name <span style={{ color: '#ff6600' }}>*</span></label>
                    <input type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} style={inputStyle} />
                </div>
                <div>
                    <label style={labelStyle}>Last Name <span style={{ color: '#ff6600' }}>*</span></label>
                    <input type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} style={inputStyle} />
                </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Email Address (Personal) <span style={{ color: '#ff6600' }}>*</span></label>
                <input type="email" value={formData.email} readOnly style={{ ...inputStyle, backgroundColor: '#f9f9f9' }} />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>LinkedIn Profile URL (Recommended)</label>
                <input type="text" placeholder="https://www.linkedin.com/in/..." value={formData.linkedin} onChange={e => setFormData({ ...formData, linkedin: e.target.value })} style={inputStyle} />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Phone Number (Recommended)</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <select style={{ ...inputStyle, width: '150px' }} value={formData.countryCode} onChange={e => setFormData({ ...formData, countryCode: e.target.value })}>
                        <option>India (+91)</option>
                        <option>USA (+1)</option>
                    </select>
                    <input type="text" placeholder="074054 13342" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} style={inputStyle} />
                </div>
                <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>Help us secure your account and remind you about pending messages from founders.</p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>What is your job search status? <span style={{ color: '#ff6600' }}>*</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {['I\'m actively looking for a job', 'I\'m open to new opportunities', 'I\'m not looking for a job / not ready to meet founders yet. HIDE MY PROFILE.'].map((opt, i) => (
                        <label key={i} style={radioLabelStyle}>
                            <input type="radio" checked={formData.jobStatus === i.toString()} onChange={() => setFormData({ ...formData, jobStatus: i.toString() })} /> {opt}
                        </label>
                    ))}
                </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>Have you worked at an XF company? <span style={{ color: '#ff6600' }}>*</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={radioLabelStyle}>
                        <input type="radio" checked={formData.xfCompany === 'no'} onChange={() => setFormData({ ...formData, xfCompany: 'no' })} /> No affiliation
                    </label>
                    <label style={radioLabelStyle}>
                        <input type="radio" checked={formData.xfCompany === 'yes'} onChange={() => setFormData({ ...formData, xfCompany: 'yes' })} /> Current or former employee at XF company
                    </label>
                </div>
            </div>

            <div style={{ marginBottom: '3rem' }}>
                <label style={labelStyle}>Are there XF companies you want to be hidden from? (e.g. your current employer) <span style={{ color: '#ff6600' }}>*</span></label>
                <input type="text" placeholder="Company name" value={formData.hideFrom} onChange={e => setFormData({ ...formData, hideFrom: e.target.value })} style={inputStyle} />
            </div>

            {renderSaveButton('Location')}
        </div>
    );

    const renderLocation = () => (
        <div style={{ maxWidth: '800px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '2rem' }}>Location</h1>
            
            <div style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>What city do you live in? <span style={{ color: '#ff6600' }}>*</span></label>
                <input type="text" placeholder="Ahmedabad, Gujarat, India" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} style={inputStyle} />
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>Are you legally authorized to work in the United States? <span style={{ color: '#ff6600' }}>*</span></label>
                <p style={helperStyle}>You are a US citizen, already have an employment visa (O1, H1B, etc.), or are specifically covered under a TN/H1-B1/E-3.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={radioLabelStyle}><input type="radio" checked={formData.authUS === 'yes'} onChange={() => setFormData({ ...formData, authUS: 'yes' })} /> Yes</label>
                    <label style={radioLabelStyle}><input type="radio" checked={formData.authUS === 'no'} onChange={() => setFormData({ ...formData, authUS: 'no' })} /> No</label>
                </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>Do you require visa sponsorship to work legally in the United States (now or in the future)? <span style={{ color: '#ff6600' }}>*</span></label>
                <p style={helperStyle}>This includes needing sponsorship for OPT, CPT or other visa types to work in the US.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={radioLabelStyle}><input type="radio" checked={formData.visa === 'yes'} onChange={() => setFormData({ ...formData, visa: 'yes' })} /> Yes</label>
                    <label style={radioLabelStyle}><input type="radio" checked={formData.visa === 'no'} onChange={() => setFormData({ ...formData, visa: 'no' })} /> No</label>
                </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>Are you open to working remotely? <span style={{ color: '#ff6600' }}>*</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={radioLabelStyle}><input type="radio" checked={formData.remote === 'none'} onChange={() => setFormData({ ...formData, remote: 'none' })} /> I don't want to work remotely</label>
                    <label style={radioLabelStyle}><input type="radio" checked={formData.remote === 'open'} onChange={() => setFormData({ ...formData, remote: 'open' })} /> I'm open to working remotely</label>
                    <label style={radioLabelStyle}><input type="radio" checked={formData.remote === 'only'} onChange={() => setFormData({ ...formData, remote: 'only' })} /> I only want to work remotely</label>
                </div>
            </div>

            {renderSaveButton('Role')}
        </div>
    );

    const renderRole = () => (
        <div style={{ maxWidth: '800px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '2rem' }}>Role</h1>
            <div style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>What job function best fits what you're looking for? <span style={{ color: '#ff6600' }}>*</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                        { id: 'Engineering', desc: 'Software, hardware and data' },
                        { id: 'Design', desc: 'Web, mobile, UI/UX, illustration and 3D' },
                        { id: 'Product', desc: 'Product management and operations' },
                        { id: 'Science', desc: 'Biology, chemistry, healthcare and research' },
                        { id: 'Sales', desc: 'Sales, partnerships and business development' },
                        { id: 'Marketing', desc: 'Growth, content, SEO and branding' }
                    ].map(opt => (
                        <label key={opt.id} style={{ ...radioLabelStyle, gap: '12px' }}>
                            <input type="radio" checked={formData.roleFunction === opt.id} onChange={() => setFormData({ ...formData, roleFunction: opt.id })} />
                            <span><strong style={{ fontWeight: '700' }}>{opt.id}</strong> <span style={{ color: '#888', fontSize: '13px' }}>{opt.desc}</span></span>
                        </label>
                    ))}
                </div>
            </div>
            <div style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>Github?</label>
                <input type="text" placeholder="https://github.com/..." value={formData.github} onChange={e => setFormData({ ...formData, github: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>Are you a full-time student at a school or bootcamp? <span style={{ color: '#ff6600' }}>*</span></label>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <label style={radioLabelStyle}><input type="radio" checked={formData.student === 'yes'} onChange={() => setFormData({ ...formData, student: 'yes' })} /> Yes</label>
                    <label style={radioLabelStyle}><input type="radio" checked={formData.student === 'no'} onChange={() => setFormData({ ...formData, student: 'no' })} /> No</label>
                </div>
            </div>
            <div style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>What is the name of the school or bootcamp you are attending? <span style={{ color: '#ff6600' }}>*</span></label>
                <input type="text" value={formData.school} onChange={e => setFormData({ ...formData, school: e.target.value })} style={inputStyle} />
            </div>
            {renderSaveButton('Experience')}
        </div>
    );

    const renderExperience = () => (
        <div style={{ maxWidth: '800px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '2rem' }}>Experience</h1>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '2rem' }}>Fill out your education and experience manually or <span style={{ color: '#0073b1', cursor: 'pointer', textDecoration: 'underline' }}>click here</span> to upload a resume or LinkedIn profile.</p>

            <div style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Work History</h2>
                    <span style={{ fontSize: '13px', color: '#0073b1', cursor: 'pointer' }}>+ add another</span>
                </div>
                <div style={{ borderBottom: '1px solid #eee', paddingBottom: '2rem', marginBottom: '2rem' }}>
                    <input type="text" placeholder="Employer Name" style={{ ...inputStyle, marginBottom: '10px' }} />
                    <input type="text" placeholder="Title" style={{ ...inputStyle, marginBottom: '10px' }} />
                    <input type="text" placeholder="Location (optional)" style={{ ...inputStyle, marginBottom: '15px' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700' }}>From</span>
                        <select style={{ ...inputStyle, width: '100px' }}><option>Month</option></select>
                        <select style={{ ...inputStyle, width: '100px' }}><option>Year</option></select>
                        <span style={{ fontSize: '14px', fontWeight: '700' }}>To</span>
                        <select style={{ ...inputStyle, width: '100px' }}><option>Month</option></select>
                        <select style={{ ...inputStyle, width: '100px' }}><option>Year</option></select>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginLeft: '10px' }}><input type="checkbox" /> I currently work here</label>
                    </div>
                    <textarea placeholder="Summary (optional)" style={{ ...inputStyle, height: '150px', resize: 'none' }}></textarea>
                </div>
            </div>

            <div style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Education</h2>
                    <span style={{ fontSize: '13px', color: '#0073b1', cursor: 'pointer' }}>+ add another</span>
                </div>
                <div style={{ borderBottom: '1px solid #eee', paddingBottom: '2rem', marginBottom: '2rem' }}>
                    <input type="text" placeholder="School Name" style={{ ...inputStyle, marginBottom: '10px' }} />
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <input type="text" placeholder="Major" style={inputStyle} />
                        <input type="text" placeholder="Degree" style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700' }}>From</span>
                        <select style={{ ...inputStyle, width: '100px' }}><option>Month</option></select>
                        <select style={{ ...inputStyle, width: '100px' }}><option>Year</option></select>
                        <span style={{ fontSize: '14px', fontWeight: '700' }}>To</span>
                        <select style={{ ...inputStyle, width: '100px' }}><option>Month</option></select>
                        <select style={{ ...inputStyle, width: '100px' }}><option>Year</option></select>
                    </div>
                    <textarea placeholder="Summary (optional)" style={{ ...inputStyle, height: '100px', resize: 'none' }}></textarea>
                </div>
            </div>
            {renderSaveButton('Skills')}
        </div>
    );

    const renderSkills = () => (
        <div style={{ maxWidth: '800px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '2rem' }}>Skills</h1>
            <label style={labelStyle}>Which technologies/skills are you most experienced and interested in working with? (Choose up to 10) <span style={{ color: '#ff6600' }}>*</span></label>
            <div style={{ position: 'relative', marginBottom: '2rem' }}>
                <input type="text" placeholder="Search ..." style={inputStyle} />
                <div style={{ position: 'absolute', right: '15px', top: '12px', color: '#999' }}>▼</div>
            </div>

            <div style={{ width: '100%', marginBottom: '3rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px', padding: '10px', borderBottom: '2px solid #eee', fontSize: '14px', fontWeight: '800' }}>
                    <div></div>
                    <div style={{ textAlign: 'center' }}>Beginner</div>
                    <div style={{ textAlign: 'center' }}>Intermediate</div>
                    <div style={{ textAlign: 'center' }}>Advanced</div>
                </div>
                {formData.skills.map((skill, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px', padding: '15px 10px', borderBottom: '1px solid #eee', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '14px', fontWeight: '500' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" style={{ cursor: 'pointer' }}><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            {skill.name}
                        </div>
                        {['beginner', 'intermediate', 'advanced'].map(lvl => (
                            <div key={lvl} style={{ textAlign: 'center' }}>
                                <input type="radio" name={`skill-${i}`} checked={skill.level === lvl} onChange={() => {
                                    const newSkills = [...formData.skills];
                                    newSkills[i].level = lvl;
                                    setFormData({ ...formData, skills: newSkills });
                                }} style={{ width: '18px', height: '18px' }} />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            {renderSaveButton('Career')}
        </div>
    );

    const renderCareer = () => (
        <div style={{ maxWidth: '800px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '2rem' }}>Career</h1>
            <label style={labelStyle}>What size company would you like to work at? <span style={{ color: '#ff6600' }}>*</span></label>
            <div style={{ width: '100%', marginBottom: '2.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px', padding: '10px', borderBottom: '2px solid #eee', fontSize: '14px', fontWeight: '800' }}>
                    <div></div>
                    <div style={{ textAlign: 'center' }}>Not Interested</div>
                    <div style={{ textAlign: 'center' }}>OK</div>
                    <div style={{ textAlign: 'center' }}>Preferred</div>
                </div>
                {[
                    { id: 'seed', label: 'Seed: 1 - 10 people' },
                    { id: 'small', label: 'Small: 11 - 50 people' },
                    { id: 'medium', label: 'Medium: 51 - 300 people' },
                    { id: 'large', label: 'Large: 301+ people' }
                ].map(size => (
                    <div key={size.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px', padding: '15px 10px', borderBottom: '1px solid #eee', alignItems: 'center' }}>
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>{size.label}</div>
                        {['not', 'ok', 'preferred'].map(val => (
                            <div key={val} style={{ textAlign: 'center' }}>
                                <input type="radio" name={`size-${size.id}`} checked={formData.sizePrefs[size.id] === val} onChange={() => {
                                    setFormData({ ...formData, sizePrefs: { ...formData.sizePrefs, [size.id]: val } });
                                }} style={{ width: '18px', height: '18px' }} />
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>How much do you value equity as part of an overall compensation package? <span style={{ color: '#ff6600' }}>*</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={radioLabelStyle}><input type="radio" checked={formData.equityPref === 'cash'} onChange={() => setFormData({ ...formData, equityPref: 'cash' })} /> I'm not that interested in startup equity; I'd prefer a cash-heavy package</label>
                    <label style={radioLabelStyle}><input type="radio" checked={formData.equityPref === 'interested'} onChange={() => setFormData({ ...formData, equityPref: 'interested' })} /> I'd be interested in getting some equity at a promising company</label>
                    <label style={radioLabelStyle}><input type="radio" checked={formData.equityPref === 'important'} onChange={() => setFormData({ ...formData, equityPref: 'important' })} /> Equity is very important to me</label>
                </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>Do you have a minimum salary requirement? <span style={{ color: '#ff6600' }}>*</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                    <label style={radioLabelStyle}><input type="radio" checked={formData.salaryPref === 'strict'} onChange={() => setFormData({ ...formData, salaryPref: 'strict' })} /> Yes, I'm only interested in salaries at or above my minimum</label>
                    <label style={radioLabelStyle}><input type="radio" checked={formData.salaryPref === 'minimum'} onChange={() => setFormData({ ...formData, salaryPref: 'minimum' })} /> I have a minimum in mind, but would consider offers below it for the right company</label>
                    <label style={radioLabelStyle}><input type="radio" checked={formData.salaryPref === 'flexible'} onChange={() => setFormData({ ...formData, salaryPref: 'flexible' })} /> I'm flexible, or not sure what my requirements are yet</label>
                </div>
                <label style={labelStyle}>What minimum salary are you looking for? <span style={{ color: '#ff6600' }}>*</span></label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden', width: 'fit-content' }}>
                    <div style={{ backgroundColor: '#f9f9f9', padding: '10px 15px', color: '#666', borderRight: '1px solid #ddd' }}>$</div>
                    <input type="text" value={formData.minSalary} onChange={e => setFormData({ ...formData, minSalary: e.target.value })} style={{ ...inputStyle, border: 'none', width: '250px' }} />
                </div>
            </div>
            {renderSaveButton('Share')}
        </div>
    );

    const renderShare = () => (
        <div style={{ maxWidth: '800px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '2rem' }}>Share</h1>
            <div style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>Describe yourself in a short phrase. e.g. "Machine learning engineer from Twitter", "Frontend developer specializing in mobile interfaces" <span style={{ color: '#ff6600' }}>*</span></label>
                <input type="text" value={formData.shortPhrase} onChange={e => setFormData({ ...formData, shortPhrase: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>What are you looking for in your next role? What would you like to avoid? <span style={{ color: '#ff6600' }}>*</span></label>
                <textarea value={formData.nextRole} onChange={e => setFormData({ ...formData, nextRole: e.target.value })} style={{ ...inputStyle, height: '200px', resize: 'none' }}></textarea>
            </div>
            <div style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>Optionally, describe a project that you worked on that you are proud of. <span style={{ color: '#ff6600' }}>*</span></label>
                <textarea value={formData.proudProject} onChange={e => setFormData({ ...formData, proudProject: e.target.value })} style={{ ...inputStyle, height: '250px', resize: 'none' }}></textarea>
            </div>
            {renderSaveButton(null)}
        </div>
    );

    const renderSaveButton = (next) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button onClick={() => handleSave(next)} style={btnStyle}>
                {next ? 'Save & next' : 'Finish'} 
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginLeft: '8px' }}><path d="M9 18l6-6-6-6"/></svg>
            </button>
        </div>
    );

    if (loading) return <div style={{ padding: '10rem', textAlign: 'center' }}>Loading your profile...</div>;

    return (
        <div style={{ backgroundColor: '#f5f5ee', minHeight: '100vh', fontFamily: '"Inter", sans-serif' }}>
            {/* Top Sub-Nav */}
            <div style={{ borderBottom: '1px solid #eee', padding: '1rem 2rem', backgroundColor: '#fff' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                        <div onClick={() => navigate('/jobs')} style={{ cursor: 'pointer', fontSize: '15px', fontWeight: '500', color: '#666' }}>Companies & jobs</div>
                        <Link to="/candidate/inbox" style={{ fontSize: '15px', fontWeight: '500', color: '#666', textDecoration: 'none' }}>Inbox</Link>
                        <div style={{ fontSize: '15px', fontWeight: '500', color: '#666' }}>Education</div>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#111', borderBottom: '2px solid #ff6600', paddingBottom: '4px' }}>My profile</div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#eee' }}></div>
                            {user?.displayName || 'User'}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '4rem', padding: '4rem 2rem' }}>
                <aside style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#111', marginBottom: '1rem', paddingLeft: '8px' }}>My Profile</div>
                    {steps.map(step => (
                        <div key={step} onClick={() => setActiveStep(step)} style={{ ...sidebarItemStyle, backgroundColor: activeStep === step ? '#e6f0ff' : 'transparent', color: activeStep === step ? '#0073b1' : '#666', fontWeight: activeStep === step ? '600' : '500' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={activeStep === step ? '#0073b1' : '#666'} strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                            {step}
                        </div>
                    ))}
                </aside>

                <main style={{ backgroundColor: '#fff', borderLeft: '1px solid #eee', paddingLeft: '4rem' }}>
                    {activeStep === 'Personal Info' && renderPersonalInfo()}
                    {activeStep === 'Location' && renderLocation()}
                    {activeStep === 'Role' && renderRole()}
                    {activeStep === 'Experience' && renderExperience()}
                    {activeStep === 'Skills' && renderSkills()}
                    {activeStep === 'Career' && renderCareer()}
                    {activeStep === 'Share' && renderShare()}
                </main>
            </div>
        </div>
    );
};

const labelStyle = { fontSize: '14px', fontWeight: '700', display: 'block', marginBottom: '8px' };
const helperStyle = { fontSize: '11px', color: '#888', marginBottom: '12px', lineHeight: '1.4' };
const radioLabelStyle = { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' };
const inputStyle = { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' };
const btnStyle = { backgroundColor: '#ff6600', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: '4px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center' };
const sidebarItemStyle = { padding: '10px 12px', borderRadius: '4px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' };

export default CandidateProfile;
